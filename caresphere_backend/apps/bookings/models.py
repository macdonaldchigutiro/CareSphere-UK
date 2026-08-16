from django.db import models
from apps.care_providers.models import CareProvider
import uuid


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        DECLINED = "declined", "Declined"

    class Frequency(models.TextChoices):
        ONE_OFF = "one_off", "One-off care"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MULTIPLE_WEEKLY = "multiple_weekly", "Multiple times per week"
        FORTNIGHTLY = "fortnightly", "Fortnightly"
        LIVE_IN = "live_in", "Live-in care"
        FLEXIBLE = "flexible", "Flexible / To be discussed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="bookings",
    )

    provider = models.ForeignKey(
        CareProvider,
        on_delete=models.CASCADE,
        related_name="bookings",
    )

    # Person requiring care
    care_recipient_name = models.CharField(
        max_length=255,
        blank=True,
    )

    # Requested type of care
    care_type = models.CharField(
        max_length=100,
        blank=True,
    )

    frequency = models.CharField(
        max_length=30,
        choices=Frequency.choices,
        default=Frequency.FLEXIBLE,
    )

    # Timing
    start_time = models.DateTimeField(
        null=True,
        blank=True,
    )

    end_time = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Care request information
    requirements = models.TextField(
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["provider", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return (
            f"{self.care_recipient_name or self.user.email} "
            f"→ {self.provider.company_name} "
            f"({self.status})"
        )
