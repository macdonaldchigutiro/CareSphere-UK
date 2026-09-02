import math
import re

from django.db.models import Q
from django_filters.rest_framework import (
    DjangoFilterBackend,
)
from rest_framework import (
    filters,
    generics,
    permissions,
    status,
)
from rest_framework.exceptions import (
    APIException,
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
from .services.discovery_ranking import (
    add_match_explanation,
    distance_score_expression,
    external_match_score,
    internal_match_score,
    quality_score_expression,
    result_ordering_key,
)
from .services.postcode_geo import (
    PostcodeFormatError,
    PostcodeNotFound,
    PostcodeServiceError,
    apply_radius_filter,
    resolve_search_postcode,
)


DISCOVERY_TERM_CORRECTIONS = {
    "demenita": "dementia",
    "demensia": "dementia",
    "dimentia": "dementia",
    "domicillary": "domiciliary",
    "paliative": "palliative",
    "residental": "residential",
}

DISCOVERY_STOP_WORDS = frozenset(
    {
        "care",
        "find",
        "for",
        "me",
        "near",
        "need",
        "needed",
        "provider",
        "providers",
        "service",
        "services",
        "with",
    }
)


class PostcodeLookupUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Postcode lookup is temporarily unavailable. Please try again."
    default_code = "postcode_lookup_unavailable"


def normalise_discovery_query(query):
    """Return useful search terms and transparent spelling corrections."""

    raw_terms = re.findall(r"[a-z0-9]+", query.casefold())
    corrected_terms = []
    corrections = []

    for term in raw_terms:
        corrected = DISCOVERY_TERM_CORRECTIONS.get(term, term)
        if corrected != term:
            corrections.append({"from": term, "to": corrected})
        if corrected not in corrected_terms:
            corrected_terms.append(corrected)

    meaningful_terms = [
        term for term in corrected_terms if term not in DISCOVERY_STOP_WORDS
    ]
    return meaningful_terms or corrected_terms, corrections


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
    def _positive_float(value, *, name, default, maximum=None):
        if value in (None, ""):
            return default
        try:
            parsed = float(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({name: "Must be a positive number."}) from exc
        if not math.isfinite(parsed) or parsed <= 0:
            raise ValidationError({name: "Must be a positive number."})
        if maximum is not None and parsed > maximum:
            raise ValidationError({name: f"Must not exceed {maximum}."})
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
        query_terms, query_corrections = normalise_discovery_query(query)
        source = request.query_params.get("source", "all").casefold()
        care_type = request.query_params.get("care_type", "").casefold()
        postcode = " ".join(
            request.query_params.get("postcode", "").upper().split()
        )[:12]
        region = " ".join(request.query_params.get("region", "").split())[:150]
        location = " ".join(
            request.query_params.get("location", "").split()
        )[:150]
        origin_postcode = " ".join(
            request.query_params.get("origin_postcode", "").upper().split()
        )[:12]
        radius_requested = request.query_params.get("radius_miles")
        radius_miles = self._positive_float(
            radius_requested,
            name="radius_miles",
            default=25.0,
            maximum=50,
        )
        sort = request.query_params.get("sort", "best_match").casefold()
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

        allowed_sorts = {"best_match", "cqc_rating", "distance", "name"}
        if sort not in allowed_sorts:
            raise ValidationError(
                {"sort": f"Choose one of: {', '.join(sorted(allowed_sorts))}."}
            )
        if radius_requested not in (None, "") and not origin_postcode:
            raise ValidationError(
                {"radius_miles": "A full origin_postcode is required."}
            )
        if sort == "distance" and not origin_postcode:
            raise ValidationError(
                {"sort": "Nearest-first sorting requires a full origin_postcode."}
            )

        origin = None
        if origin_postcode:
            try:
                origin = resolve_search_postcode(origin_postcode)
            except (PostcodeFormatError, PostcodeNotFound) as exc:
                raise ValidationError({"origin_postcode": str(exc)}) from exc
            except PostcodeServiceError as exc:
                raise PostcodeLookupUnavailable(str(exc)) from exc
            origin_postcode = origin.postcode

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

        for term in query_terms:
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

        if location:
            internal = internal.filter(
                Q(address_line1__icontains=location)
                | Q(city__icontains=location)
                | Q(county__icontains=location)
                | Q(postcode__istartswith=location)
            )
            external = external.filter(
                Q(address__icontains=location)
                | Q(local_authority__icontains=location)
                | Q(region__icontains=location)
                | Q(postcode__istartswith=location)
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
            external = external.filter(cqc_rating__iexact=cqc_rating)

        if funding != "all":
            funding_field = {
                "nhs": "accepts_nhs_funding",
                "local_authority": "accepts_local_authority_funding",
                "private": "accepts_private_pay",
            }[funding]
            internal = internal.filter(**{funding_field: True})
            # Funding is unknown for directory-only results.
            external = external.none()

        coordinates_unavailable = {"caresphere": 0, "cqc_directory": 0}
        if origin is not None:
            coordinates_unavailable = {
                "caresphere": internal.filter(
                    Q(latitude__isnull=True) | Q(longitude__isnull=True)
                ).count(),
                "cqc_directory": external.filter(
                    Q(latitude__isnull=True) | Q(longitude__isnull=True)
                ).count(),
            }
            internal = apply_radius_filter(internal, origin, radius_miles)
            external = apply_radius_filter(external, origin, radius_miles)

        internal_score = internal_match_score(
            query_terms,
            care_type=care_type,
            location=location,
        )
        external_score = external_match_score(
            query_terms,
            care_type=care_type,
            location=location,
        )
        if origin is not None:
            internal_score += distance_score_expression()
            external_score += distance_score_expression()

        internal = internal.annotate(
            match_score=internal_score,
            quality_score=quality_score_expression(),
        )
        external = external.annotate(
            match_score=external_score,
            quality_score=quality_score_expression(),
        )

        if sort == "name":
            internal = internal.order_by("company_name", "id")
            external = external.order_by("name", "id")
        elif sort == "distance":
            internal = internal.order_by(
                "distance_miles", "-match_score", "company_name", "id"
            )
            external = external.order_by(
                "distance_miles", "-match_score", "name", "id"
            )
        elif sort == "cqc_rating":
            internal = internal.order_by(
                "-quality_score", "-match_score", "company_name", "id"
            )
            external = external.order_by(
                "-quality_score", "-match_score", "name", "id"
            )
        else:
            internal_order = ["-match_score"]
            external_order = ["-match_score"]
            if origin is not None:
                internal_order.append("distance_miles")
                external_order.append("distance_miles")
            internal = internal.order_by(*internal_order, "company_name", "id")
            external = external.order_by(*external_order, "name", "id")
        internal_count = internal.count()
        external_count = external.count()
        total = internal_count + external_count

        offset = (page - 1) * page_size
        fetch_limit = offset + page_size
        combined = []
        for provider in internal[:fetch_limit]:
            data = self._internal_result(provider)
            data.update(
                {
                    "match_score": provider.match_score,
                    "quality_score": provider.quality_score,
                    "distance_miles": (
                        round(float(provider.distance_miles), 1)
                        if origin is not None
                        else None
                    ),
                }
            )
            combined.append(
                add_match_explanation(
                    data,
                    query_terms=query_terms,
                    care_type=care_type,
                    location=location,
                    origin_postcode=origin_postcode,
                )
            )

        for external_location in external[:fetch_limit]:
            data = dict(ExternalProviderLocationSerializer(external_location).data)
            data.update(
                {
                    "match_score": external_location.match_score,
                    "quality_score": external_location.quality_score,
                    "distance_miles": (
                        round(float(external_location.distance_miles), 1)
                        if origin is not None
                        else None
                    ),
                }
            )
            combined.append(
                add_match_explanation(
                    data,
                    query_terms=query_terms,
                    care_type=care_type,
                    location=location,
                    origin_postcode=origin_postcode,
                )
            )

        combined.sort(key=lambda item: result_ordering_key(item, sort))
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
                "query": query,
                "interpreted_query": " ".join(query_terms),
                "query_corrections": query_corrections,
                "location": location,
                "origin_postcode": origin_postcode or None,
                "radius_miles": radius_miles if origin is not None else None,
                "sort": sort,
                "ranking": {
                    "signals": [
                        "care_match",
                        "distance" if origin is not None else "location_match",
                        "cqc_quality",
                    ],
                    "quality_unknown_is_neutral": True,
                },
                "distance_search": {
                    "enabled": origin is not None,
                    "origin_postcode": origin_postcode or None,
                    "radius_miles": radius_miles if origin is not None else None,
                    "measurement": "straight_line",
                    "coordinates": "postcode_centroid",
                    "excluded_without_coordinates": coordinates_unavailable,
                },
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
