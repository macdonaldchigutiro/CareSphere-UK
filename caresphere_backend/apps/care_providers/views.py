from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    CareProvider,
    StaffMember,
    AvailabilitySlot,
)

from .serializers import (
    CareProviderSerializer,
    StaffMemberSerializer,
    AvailabilitySlotSerializer,
)

# ======================================================
# CARE PROVIDERS
# ======================================================


class CareProviderListView(generics.ListAPIView):
    """
    Public list of care providers currently accepting clients.

    Supports:
    - search
    - filtering
    - ordering
    """

    serializer_class = CareProviderSerializer
    permission_classes = [permissions.AllowAny]

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
    """
    Public detail page for one care provider.
    """

    serializer_class = CareProviderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return CareProvider.objects.all().prefetch_related("expertise")


# ======================================================
# STAFF MEMBERS
# ======================================================


class StaffMemberListView(generics.ListAPIView):
    """
    Public list of active provider staff.
    """

    serializer_class = StaffMemberSerializer
    permission_classes = [permissions.AllowAny]

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
    """
    Public detail page for one active staff member.
    """

    serializer_class = StaffMemberSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return StaffMember.objects.filter(is_active=True).select_related("provider")


# ======================================================
# AVAILABILITY
# ======================================================


class AvailabilitySlotListView(generics.ListAPIView):
    """
    Public list of care availability that is currently open.
    """

    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]

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
    """
    Public detail page for one available care slot.
    """

    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(
            is_available=True,
            is_booked=False,
        ).select_related(
            "provider",
            "staff_member",
        )
