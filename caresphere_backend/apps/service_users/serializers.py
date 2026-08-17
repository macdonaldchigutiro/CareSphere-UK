from rest_framework import serializers

from .models import ServiceUserProfile


class ServiceUserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        read_only=True,
    )

    manager_name = serializers.SerializerMethodField()

    linked_user_email = serializers.EmailField(
        source="linked_user.email",
        read_only=True,
    )

    class Meta:
        model = ServiceUserProfile

        fields = (
            "id",
            "managed_by",
            "manager_name",
            "linked_user",
            "linked_user_email",
            "first_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "relationship_to_manager",
            "care_requirements",
            "medical_conditions",
            "allergies",
            "medications",
            "mobility_needs",
            "communication_needs",
            "additional_notes",
            "emergency_contact",
            "emergency_phone",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "managed_by",
            "manager_name",
            "linked_user_email",
            "full_name",
            "created_at",
            "updated_at",
        )

    def get_manager_name(self, obj):
        if not obj.managed_by:
            return ""

        full_name = obj.managed_by.get_full_name().strip()

        return full_name or obj.managed_by.email or obj.managed_by.username

    def validate_first_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("First name is required.")

        return value

    def validate_last_name(self, value):
        return value.strip()

    def validate_emergency_phone(self, value):
        return value.strip()
