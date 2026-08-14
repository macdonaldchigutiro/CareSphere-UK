from rest_framework import serializers

from .models import (
    CareProvider,
    ProviderSpecialization,
    StaffMember,
    AvailabilitySlot,
)


class ProviderSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderSpecialization
        fields = "__all__"
        read_only_fields = (
            "id",
            "provider",
        )


class CareProviderSerializer(serializers.ModelSerializer):
    availability_status = serializers.CharField(
        read_only=True,
    )

    verification_badge = serializers.CharField(
        read_only=True,
    )

    cqc_status = serializers.CharField(
        read_only=True,
    )

    expertise = ProviderSpecializationSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CareProvider
        fields = "__all__"

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "registered_date",
            "verification_date",
            "verified_by",
        )


class StaffMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        read_only=True,
    )

    is_dbs_valid = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = StaffMember
        fields = "__all__"

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    duration_hours = serializers.FloatField(
        read_only=True,
    )

    is_past = serializers.BooleanField(
        read_only=True,
    )

    provider_name = serializers.CharField(
        source="provider.company_name",
        read_only=True,
    )

    staff_member_name = serializers.CharField(
        source="staff_member.full_name",
        read_only=True,
    )

    class Meta:
        model = AvailabilitySlot
        fields = "__all__"

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )
