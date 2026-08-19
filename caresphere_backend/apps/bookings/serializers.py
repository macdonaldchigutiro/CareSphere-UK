from rest_framework import serializers

from apps.family.models import CareCircleMember

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(
        source="provider.company_name",
        read_only=True,
    )

    provider_city = serializers.CharField(
        source="provider.city",
        read_only=True,
    )

    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    user_name = serializers.SerializerMethodField()

    service_user_name = serializers.CharField(
        source="service_user.full_name",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    frequency_display = serializers.CharField(
        source="get_frequency_display",
        read_only=True,
    )

    class Meta:
        model = Booking

        fields = (
            "id",
            "user",
            "user_name",
            "user_email",
            "provider",
            "provider_name",
            "provider_city",
            "service_user",
            "service_user_name",
            "care_recipient_name",
            "care_type",
            "frequency",
            "frequency_display",
            "start_time",
            "end_time",
            "requirements",
            "notes",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "user",
            "user_name",
            "user_email",
            "provider_name",
            "provider_city",
            "service_user_name",
            "care_recipient_name",
            "status",
            "status_display",
            "frequency_display",
            "created_at",
            "updated_at",
        )

    def get_user_name(
        self,
        obj,
    ):
        full_name = obj.user.get_full_name().strip()

        return full_name or obj.user.email

    def validate_service_user(
        self,
        service_user,
    ):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "You must be logged in to create a booking."
            )

        user = request.user

        if user.is_staff or user.is_superuser:
            return service_user

        if not service_user.is_active:
            raise serializers.ValidationError("This care recipient is not active.")

        # Direct manager can create bookings.
        if service_user.managed_by_id == user.id:
            return service_user

        # Active Family Circle members may create bookings
        # when their role or explicit permission allows it.
        membership = CareCircleMember.objects.filter(
            care_circle__service_user=service_user,
            user=user,
            is_active=True,
        ).first()

        if not membership:
            raise serializers.ValidationError(
                "You do not have permission "
                "to create a booking for this care recipient."
            )

        allowed_roles = {
            CareCircleMember.MemberRole.PRIMARY,
            CareCircleMember.MemberRole.ADMIN,
        }

        if membership.can_manage_bookings or membership.role in allowed_roles:
            return service_user

        raise serializers.ValidationError(
            "Your Family Circle role does not allow "
            "you to create bookings for this care recipient."
        )

    def validate(
        self,
        attrs,
    ):
        start_time = attrs.get(
            "start_time",
            getattr(
                self.instance,
                "start_time",
                None,
            ),
        )

        end_time = attrs.get(
            "end_time",
            getattr(
                self.instance,
                "end_time",
                None,
            ),
        )

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": ("End time must be later " "than start time.")}
            )

        return attrs
