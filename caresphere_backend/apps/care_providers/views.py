# apps/care_providers/views.py
from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import CareProvider, StaffMember, AvailabilitySlot
from .serializers import (
    CareProviderSerializer,
    StaffMemberSerializer,
    AvailabilitySlotSerializer,
)


# Care Provider Views
class CareProviderListView(generics.ListAPIView):
    queryset = CareProvider.objects.filter(is_accepting_clients=True)
    serializer_class = CareProviderSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["company_name", "city", "postcode", "specializations"]
    filterset_fields = ["care_types", "city", "is_verified"]
    ordering_fields = ["hourly_rate", "created_at"]


class CareProviderDetailView(generics.RetrieveAPIView):
    queryset = CareProvider.objects.all()
    serializer_class = CareProviderSerializer
    permission_classes = [permissions.AllowAny]


# Staff Member Views
class StaffMemberListView(generics.ListAPIView):
    queryset = StaffMember.objects.filter(is_active=True)
    serializer_class = StaffMemberSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["first_name", "last_name", "role"]
    filterset_fields = ["role", "is_available"]


class StaffMemberDetailView(generics.RetrieveAPIView):
    queryset = StaffMember.objects.all()
    serializer_class = StaffMemberSerializer
    permission_classes = [permissions.AllowAny]


# Availability Slot Views
class AvailabilitySlotListView(generics.ListAPIView):
    queryset = AvailabilitySlot.objects.filter(is_available=True, is_booked=False)
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["slot_type", "provider"]
    ordering_fields = ["start_date", "start_time"]


class AvailabilitySlotDetailView(generics.RetrieveAPIView):
    queryset = AvailabilitySlot.objects.all()
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]
