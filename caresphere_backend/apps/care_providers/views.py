from rest_framework import (
    generics,
    permissions,
    filters,
)

from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
)

from django_filters.rest_framework import (
    DjangoFilterBackend,
)

from .models import (
    CareProvider,
    StaffMember,
    AvailabilitySlot,
)

from .serializers import (
    CareProviderSerializer,
    ProviderSelfProfileSerializer,
    StaffMemberSerializer,
    ProviderStaffSerializer,
    AvailabilitySlotSerializer,
    ProviderAvailabilitySerializer,
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
