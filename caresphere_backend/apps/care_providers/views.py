from django.db.models import Q
from django_filters.rest_framework import (
    DjangoFilterBackend,
)
from rest_framework import (
    filters,
    generics,
    permissions,
)
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AvailabilitySlot,
    CareProvider,
    ExternalProviderLocation,
    StaffMember,
)
from .serializers import (
    AvailabilitySlotSerializer,
    CareProviderSerializer,
    ExternalProviderLocationSerializer,
    ProviderAvailabilitySerializer,
    ProviderSelfProfileSerializer,
    ProviderStaffSerializer,
    StaffMemberSerializer,
)

# ======================================================
# PROVIDER ACCESS HELPERS
# ======================================================


def get_provider_for_user(user):
    if not user.is_authenticated:
        raise PermissionDenied("Authentication is required.")

    if not user.is_staff and not user.is_superuser and user.user_type != "provider":
        raise PermissionDenied(
            "This endpoint is only available " "to care provider accounts."
        )

    try:
        return CareProvider.objects.get(user=user)

    except CareProvider.DoesNotExist:
        raise NotFound("No CareProvider profile is linked " "to this account.")


# ======================================================
# PUBLIC CARE PROVIDERS
# ======================================================


class CareProviderListView(generics.ListAPIView):
    serializer_class = CareProviderSerializer

    permission_classes = [
        permissions.AllowAny,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "company_name",
        "trading_name",
        "city",
        "county",
        "postcode",
        "email",
    ]

    filterset_fields = [
        "city",
        "county",
        "business_type",
        "is_verified",
        "cqc_verified",
        "cqc_rating",
        "emergency_care_available",
        "accepts_local_authority_funding",
        "accepts_nhs_funding",
        "accepts_private_pay",
    ]

    ordering_fields = [
        "company_name",
        "hourly_rate_min",
        "hourly_rate_max",
        "years_operating",
        "staff_count",
        "created_at",
    ]

    ordering = [
        "company_name",
    ]

    def get_queryset(self):
        return (
            CareProvider.objects.filter(is_accepting_clients=True)
            .prefetch_related("expertise")
            .order_by("company_name")
        )


class CareProviderDetailView(generics.RetrieveAPIView):
    serializer_class = CareProviderSerializer

    permission_classes = [
        permissions.AllowAny,
    ]

    def get_queryset(self):
        return CareProvider.objects.all().prefetch_related("expertise")


class ProviderDiscoveryView(APIView):
    """Search CareSphere providers and relevant CQC directory locations."""

    permission_classes = [permissions.AllowAny]
    default_page_size = 24
    max_page_size = 50

    @staticmethod
    def _positive_integer(value, *, name, default):
        if value in (None, ""):
            return default
        try:
            parsed = int(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({name: "Must be a positive integer."}) from exc
        if parsed < 1:
            raise ValidationError({name: "Must be a positive integer."})
        return parsed

    @staticmethod
    def _internal_result(provider):
        data = CareProviderSerializer(provider).data
        data.update(
            {
                "source": "caresphere",
                "cqc_registered": bool(
                    provider.cqc_verified and provider.cqc_location_id
                ),
                "can_book": True,
                "can_save": True,
                "external_url": provider.cqc_report_url or None,
            }
        )
        return data

    def get(self, request):
        page = self._positive_integer(
            request.query_params.get("page"),
            name="page",
            default=1,
        )
        page_size = min(
            self._positive_integer(
                request.query_params.get("page_size"),
                name="page_size",
                default=self.default_page_size,
            ),
            self.max_page_size,
        )

        query = " ".join(request.query_params.get("q", "").split())[:150]
        source = request.query_params.get("source", "all").casefold()
        care_type = request.query_params.get("care_type", "").casefold()
        postcode = " ".join(
            request.query_params.get("postcode", "").upper().split()
        )[:12]
        region = " ".join(request.query_params.get("region", "").split())[:150]
        verification = request.query_params.get("verification", "all").casefold()
        cqc_rating = request.query_params.get("cqc_rating", "all").replace(
            "_", " "
        )
        funding = request.query_params.get("funding", "all").casefold()

        allowed_sources = {"all", "caresphere", "cqc_directory"}
        if source not in allowed_sources:
            raise ValidationError(
                {"source": f"Choose one of: {', '.join(sorted(allowed_sources))}."}
            )

        allowed_care_types = {
            value for value, _label in CareProvider.CareType.choices
        }
        if care_type and care_type not in allowed_care_types:
            raise ValidationError(
                {
                    "care_type": (
                        "Choose one of: "
                        f"{', '.join(sorted(allowed_care_types))}."
                    )
                }
            )

        allowed_verification = {"all", "verified", "cqc", "unverified"}
        if verification not in allowed_verification:
            raise ValidationError(
                {
                    "verification": (
                        "Choose one of: "
                        f"{', '.join(sorted(allowed_verification))}."
                    )
                }
            )

        allowed_funding = {"all", "nhs", "local_authority", "private"}
        if funding not in allowed_funding:
            raise ValidationError(
                {"funding": f"Choose one of: {', '.join(sorted(allowed_funding))}."}
            )

        internal = (
            CareProvider.objects.filter(is_accepting_clients=True)
            .select_related("user")
            .prefetch_related("expertise")
        )
        external = ExternalProviderLocation.objects.filter(is_active=True)

        if source == "caresphere":
            external = external.none()
        elif source == "cqc_directory":
            internal = internal.none()

        for term in query.split():
            internal = internal.filter(
                Q(company_name__icontains=term)
                | Q(trading_name__icontains=term)
                | Q(city__icontains=term)
                | Q(county__icontains=term)
                | Q(postcode__icontains=term)
                | Q(cqc_location_id__icontains=term)
                | Q(care_types__icontains=term)
                | Q(specializations__icontains=term)
            )
            external = external.filter(search_document__icontains=term.casefold())

        if postcode:
            internal = internal.filter(postcode__istartswith=postcode)
            external = external.filter(postcode__istartswith=postcode)

        if region:
            internal = internal.filter(
                Q(city__icontains=region) | Q(county__icontains=region)
            )
            external = external.filter(
                Q(region__icontains=region) | Q(local_authority__icontains=region)
            )

        if care_type:
            internal = internal.filter(care_types__icontains=care_type)
            external = external.filter(search_document__icontains=care_type)

        if verification == "verified":
            internal = internal.filter(is_verified=True)
            external = external.none()
        elif verification == "cqc":
            internal = internal.filter(
                cqc_verified=True,
                cqc_location_id__isnull=False,
            ).exclude(cqc_location_id="")
        elif verification == "unverified":
            internal = internal.filter(is_verified=False)
            external = external.none()

        if cqc_rating.casefold() != "all":
            internal = internal.filter(cqc_rating__iexact=cqc_rating)
            # The weekly CQC directory does not contain ratings.
            external = external.none()

        if funding != "all":
            funding_field = {
                "nhs": "accepts_nhs_funding",
                "local_authority": "accepts_local_authority_funding",
                "private": "accepts_private_pay",
            }[funding]
            internal = internal.filter(**{funding_field: True})
            # Funding is unknown for directory-only results.
            external = external.none()

        internal = internal.order_by("company_name", "id")
        external = external.order_by("name", "id")
        internal_count = internal.count()
        external_count = external.count()
        total = internal_count + external_count

        offset = (page - 1) * page_size
        fetch_limit = offset + page_size
        combined = [
            self._internal_result(provider)
            for provider in internal[:fetch_limit]
        ]
        combined.extend(
            ExternalProviderLocationSerializer(location).data
            for location in external[:fetch_limit]
        )
        combined.sort(
            key=lambda item: (
                str(item.get("company_name", "")).casefold(),
                0 if item.get("source") == "caresphere" else 1,
                str(item.get("id", "")),
            )
        )
        results = combined[offset : offset + page_size]
        total_pages = (total + page_size - 1) // page_size if total else 0

        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "next": page + 1 if page < total_pages else None,
                "previous": page - 1 if page > 1 and total_pages else None,
                "source_counts": {
                    "caresphere": internal_count,
                    "cqc_directory": external_count,
                },
                "results": results,
            }
        )


# ======================================================
# LOGGED-IN PROVIDER PROFILE
# ======================================================


class MyProviderProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProviderSelfProfileSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    http_method_names = [
        "get",
        "patch",
        "put",
        "head",
        "options",
    ]

    def get_object(self):
        provider = get_provider_for_user(self.request.user)

        self.check_object_permissions(
            self.request,
            provider,
        )

        return CareProvider.objects.prefetch_related("expertise").get(pk=provider.pk)


# ======================================================
# PROVIDER STAFF MANAGEMENT
# ======================================================


class MyStaffListCreateView(generics.ListCreateAPIView):
    serializer_class = ProviderStaffSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "first_name",
        "last_name",
        "role",
        "email",
        "phone",
        "qualifications",
        "languages_spoken",
    ]

    ordering_fields = [
        "first_name",
        "last_name",
        "role",
        "experience_years",
        "start_date",
        "created_at",
    ]

    ordering = [
        "last_name",
        "first_name",
    ]

    def get_provider(self):
        return get_provider_for_user(self.request.user)

    def get_queryset(self):
        provider = self.get_provider()

        return (
            StaffMember.objects.filter(provider=provider)
            .select_related(
                "provider",
                "user",
            )
            .order_by(
                "last_name",
                "first_name",
            )
        )

    def perform_create(self, serializer):
        provider = self.get_provider()

        serializer.save(provider=provider)


class MyStaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProviderStaffSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    http_method_names = [
        "get",
        "patch",
        "put",
        "delete",
        "head",
        "options",
    ]

    def get_queryset(self):
        provider = get_provider_for_user(self.request.user)

        return StaffMember.objects.filter(provider=provider).select_related(
            "provider",
            "user",
        )


# ======================================================
# PROVIDER AVAILABILITY MANAGEMENT
# ======================================================


class MyAvailabilityListCreateView(generics.ListCreateAPIView):
    """
    List and create availability belonging only
    to the authenticated provider.
    """

    serializer_class = ProviderAvailabilitySerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "slot_type",
        "staff_member",
        "is_available",
        "is_booked",
        "is_recurring",
        "recurrence_type",
        "is_at_facility",
    ]

    ordering_fields = [
        "start_date",
        "start_time",
        "end_date",
        "created_at",
        "price_per_hour",
        "price_per_day",
        "price_per_week",
    ]

    ordering = [
        "start_date",
        "start_time",
    ]

    def get_provider(self):
        return get_provider_for_user(self.request.user)

    def get_queryset(self):
        provider = self.get_provider()

        return (
            AvailabilitySlot.objects.filter(provider=provider)
            .select_related(
                "provider",
                "staff_member",
            )
            .order_by(
                "start_date",
                "start_time",
            )
        )

    def perform_create(self, serializer):
        provider = self.get_provider()

        serializer.save(provider=provider)


class MyAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete one availability slot.

    Provider ownership is enforced through the
    queryset.
    """

    serializer_class = ProviderAvailabilitySerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    http_method_names = [
        "get",
        "patch",
        "put",
        "delete",
        "head",
        "options",
    ]

    def get_queryset(self):
        provider = get_provider_for_user(self.request.user)

        return AvailabilitySlot.objects.filter(provider=provider).select_related(
            "provider",
            "staff_member",
        )


# ======================================================
# PUBLIC STAFF
# ======================================================


class StaffMemberListView(generics.ListAPIView):
    serializer_class = StaffMemberSerializer

    permission_classes = [
        permissions.AllowAny,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "first_name",
        "last_name",
        "role",
        "qualifications",
        "languages_spoken",
    ]

    filterset_fields = [
        "provider",
        "role",
        "employment_type",
        "is_available",
        "dbs_verified",
        "is_active",
    ]

    ordering_fields = [
        "first_name",
        "last_name",
        "experience_years",
        "created_at",
    ]

    ordering = [
        "last_name",
        "first_name",
    ]

    def get_queryset(self):
        return StaffMember.objects.filter(is_active=True).select_related("provider")


class StaffMemberDetailView(generics.RetrieveAPIView):
    serializer_class = StaffMemberSerializer

    permission_classes = [
        permissions.AllowAny,
    ]

    def get_queryset(self):
        return StaffMember.objects.filter(is_active=True).select_related("provider")


# ======================================================
# PUBLIC AVAILABILITY
# ======================================================


class AvailabilitySlotListView(generics.ListAPIView):
    serializer_class = AvailabilitySlotSerializer

    permission_classes = [
        permissions.AllowAny,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "slot_type",
        "provider",
        "staff_member",
        "is_at_facility",
    ]

    ordering_fields = [
        "start_date",
        "start_time",
        "price_per_hour",
        "price_per_day",
        "price_per_week",
        "created_at",
    ]

    ordering = [
        "start_date",
        "start_time",
    ]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(
            is_available=True,
            is_booked=False,
        ).select_related(
            "provider",
            "staff_member",
        )


class AvailabilitySlotDetailView(generics.RetrieveAPIView):
    serializer_class = AvailabilitySlotSerializer

    permission_classes = [
        permissions.AllowAny,
    ]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(
            is_available=True,
            is_booked=False,
        ).select_related(
            "provider",
            "staff_member",
        )
