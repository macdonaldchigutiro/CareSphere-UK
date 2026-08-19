from django.db import models
import uuid


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        INFO = "info", "Information"
        SUCCESS = "success", "Success"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    recipient = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    title = models.CharField(
        max_length=200,
    )

    message = models.TextField()

    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
    )

    is_read = models.BooleanField(
        default=False,
    )

    link = models.CharField(
        max_length=500,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "recipient",
                    "is_read",
                ]
            ),
            models.Index(
                fields=[
                    "created_at",
                ]
            ),
        ]

    def __str__(self):
        return f"{self.title} - " f"{self.recipient.email}"
