from django.db import models
from apps.users.models import User


class ServiceUserProfile(models.Model):
    """
    Represents a person receiving care.

    A service user does not need their own CareSphere login.
    They can be managed by a family member and optionally
    linked to a CareSphere user account later.
    """

    # ======================================================
    # OWNERSHIP / ACCOUNT LINKING
    # ======================================================

    managed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="managed_service_users",
        null=True,
        blank=True,
    )

    linked_user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_profile",
    )

    # ======================================================
    # PERSONAL DETAILS
    # ======================================================

    first_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    last_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    relationship_to_manager = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text=(
            "Relationship between the service user "
            "and the person managing their care."
        ),
    )

    # ======================================================
    # CARE INFORMATION
    # ======================================================

    care_requirements = models.JSONField(
        default=dict,
        blank=True,
    )

    medical_conditions = models.JSONField(
        default=list,
        blank=True,
    )

    allergies = models.JSONField(
        default=list,
        blank=True,
    )

    medications = models.JSONField(
        default=list,
        blank=True,
    )

    mobility_needs = models.TextField(
        blank=True,
        default="",
    )

    communication_needs = models.TextField(
        blank=True,
        default="",
    )

    additional_notes = models.TextField(
        blank=True,
        default="",
    )

    # ======================================================
    # EMERGENCY CONTACT
    # ======================================================

    emergency_contact = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    emergency_phone = models.CharField(
        max_length=17,
        blank=True,
        default="",
    )

    # ======================================================
    # STATUS
    # ======================================================

    is_active = models.BooleanField(
        default=True,
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
        ordering = [
            "first_name",
            "last_name",
        ]

        verbose_name = "Service User Profile"
        verbose_name_plural = "Service User Profiles"

    # ======================================================
    # HELPERS
    # ======================================================

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.full_name or "Service User"
