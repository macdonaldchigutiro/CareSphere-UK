from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.EmailField(
        source="recipient.email",
        read_only=True,
    )

    notification_type_display = serializers.CharField(
        source="get_notification_type_display",
        read_only=True,
    )

    class Meta:
        model = Notification

        fields = (
            "id",
            "recipient",
            "recipient_email",
            "title",
            "message",
            "notification_type",
            "notification_type_display",
            "is_read",
            "link",
            "created_at",
        )

        read_only_fields = (
            "id",
            "recipient",
            "recipient_email",
            "title",
            "message",
            "notification_type",
            "notification_type_display",
            "link",
            "created_at",
        )
