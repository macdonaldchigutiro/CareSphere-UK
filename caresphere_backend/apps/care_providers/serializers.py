# apps/care_providers/serializers.py
from rest_framework import serializers
from .models import CareProvider, StaffMember, AvailabilitySlot


class CareProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareProvider
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class StaffMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffMember
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    duration_hours = serializers.SerializerMethodField()
    provider_name = serializers.CharField(
        source="provider.company_name", read_only=True
    )

    class Meta:
        model = AvailabilitySlot
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def get_duration_hours(self, obj):
        return obj.duration_hours
