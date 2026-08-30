from django.db import models

from apps.care_providers.models import CareProvider, StaffMember
from apps.service_users.models import ServiceUserProfile

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
        MULTIPLE_WEEKLY = (
            "multiple_weekly",
            "Multiple times per week",
        )
        FORTNIGHTLY = "fortnightly", "Fortnightly"
        LIVE_IN = "live_in", "Live-in care"
        FLEXIBLE = "flexible", "Flexible / To be discussed"

    # ======================================================
    # PRIMARY KEY
    # ======================================================

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # ======================================================
    # BOOKING OWNER / PROVIDER
    # ======================================================

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

    assigned_staff = models.ForeignKey(
        StaffMember,
        on_delete=models.SET_NULL,
        related_name="assigned_bookings",
        null=True,
        blank=True,
    )

    # ======================================================
    # CARE RECIPIENT
    # ======================================================

    service_user = models.ForeignKey(
        ServiceUserProfile,
        on_delete=models.SET_NULL,
        related_name="bookings",
        null=True,
        blank=True,
    )

    care_recipient_name = models.CharField(
        max_length=255,
        blank=True,
    )

    # ======================================================
    # CARE REQUEST
    # ======================================================

    care_type = models.CharField(
        max_length=100,
        blank=True,
    )

    frequency = models.CharField(
        max_length=30,
        choices=Frequency.choices,
        default=Frequency.FLEXIBLE,
    )

    # ======================================================
    # TIMING
    # ======================================================

    start_time = models.DateTimeField(
        null=True,
        blank=True,
    )

    end_time = models.DateTimeField(
        null=True,
        blank=True,
    )

    # ======================================================
    # DETAILS
    # ======================================================

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

    # ======================================================
    # META
    # ======================================================

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["provider", "status"]),
            models.Index(fields=["service_user", "status"]),
            models.Index(fields=["created_at"]),
        ]

    # ======================================================
    # HELPERS
    # ======================================================

    def save(
        self,
        *args,
        **kwargs,
    ):
        if self.service_user:
            self.care_recipient_name = self.service_user.full_name

        super().save(
            *args,
            **kwargs,
        )

    def __str__(self):
        return (
            f"{self.care_recipient_name or self.user.email} "
            f"→ {self.provider.company_name} "
            f"({self.status})"
        )
