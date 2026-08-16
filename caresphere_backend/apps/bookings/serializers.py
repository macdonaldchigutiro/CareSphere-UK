from rest_framework import serializers

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
            "status",
            "created_at",
            "updated_at",
        )

    def get_user_name(self, obj):
        full_name = obj.user.get_full_name()

        return full_name.strip() or obj.user.email

    def validate(self, attrs):
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
