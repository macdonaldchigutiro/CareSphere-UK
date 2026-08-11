"""
Trust and Verification Models
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.care_providers.models import CareProvider
import uuid

# REMOVE THIS LINE: from apps.users.models import User


class TrustVerification(models.Model):
    """Central trust verification record for care providers"""

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        EXPIRED = "expired", "Expired"
        REVOKED = "revoked", "Revoked"
        FAILED = "failed", "Failed"

    provider = models.OneToOneField(
        CareProvider, on_delete=models.CASCADE, related_name="trust_verifications"
    )

    # CQC Integration
    cqc_location_id = models.CharField(max_length=50, unique=True, blank=True)
    cqc_rating = models.CharField(
        max_length=20,
        choices=[
            ("Outstanding", "Outstanding"),
            ("Good", "Good"),
            ("Requires Improvement", "Requires Improvement"),
            ("Inadequate", "Inadequate"),
            ("Not Rated", "Not Rated"),
        ],
        default="Not Rated",
    )
    cqc_last_inspection = models.DateField(null=True, blank=True)
    cqc_report_url = models.URLField(blank=True)

    # DBS Checks
    dbs_verified = models.BooleanField(default=False)
    dbs_certificate_number = models.CharField(max_length=100, blank=True)
    dbs_issue_date = models.DateField(null=True, blank=True)
    dbs_expiry_date = models.DateField(null=True, blank=True)
    dbs_enhanced = models.BooleanField(default=False)

    # Insurance
    insurance_verified = models.BooleanField(default=False)
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    insurance_expiry_date = models.DateField(null=True, blank=True)
    insurance_coverage_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # Training Certifications
    training_certifications = models.JSONField(default=list)
    last_training_refresh = models.DateField(null=True, blank=True)

    # Compliance
    gdpr_compliant = models.BooleanField(default=False)
    health_safety_certified = models.BooleanField(default=False)
    iso_certified = models.BooleanField(default=False)

    # Reviews and Ratings
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
    )
    total_reviews = models.IntegerField(default=0)
    recommendation_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )  # Percentage

    # Staff Metrics
    staff_turnover_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )  # Percentage
    staff_training_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=0
    )  # Annual hours per staff

    # Verification Metrics
    overall_trust_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)], default=0
    )
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    # Audit Trail - CHANGE THIS to use string reference
    last_verified = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        "users.User",  # ← CHANGED: using string instead of direct import
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trust_verifications",
    )
    verification_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Trust Verification"
        verbose_name_plural = "Trust Verifications"
        indexes = [
            models.Index(fields=["overall_trust_score"]),
            models.Index(fields=["verification_status"]),
            models.Index(fields=["cqc_rating"]),
        ]

    def __str__(self):
        return f"Trust Verification for {self.provider.company_name}"

    def calculate_trust_score(self) -> int:
        """Calculate overall trust score based on various factors"""
        score = 0
        max_score = 100

        # CQC Rating (25 points)
        cqc_scores = {
            "Outstanding": 25,
            "Good": 20,
            "Requires Improvement": 10,
            "Inadequate": 0,
            "Not Rated": 5,
        }
        score += cqc_scores.get(self.cqc_rating, 5)

        # DBS Verification (20 points)
        if self.dbs_verified:
            score += 15
            if self.dbs_enhanced:
                score += 5

        # Insurance (15 points)
        if self.insurance_verified:
            score += 15

        # Training (10 points)
        if self.training_certifications and len(self.training_certifications) >= 3:
            score += 10
        elif self.training_certifications:
            score += 5

        # Reviews (15 points)
        if self.average_rating >= 4.5:
            score += 15
        elif self.average_rating >= 4.0:
            score += 12
        elif self.average_rating >= 3.5:
            score += 8
        elif self.average_rating >= 3.0:
            score += 5
        elif self.average_rating > 0:
            score += 2

        # Compliance (15 points)
        compliance_score = 0
        if self.gdpr_compliant:
            compliance_score += 5
        if self.health_safety_certified:
            compliance_score += 5
        if self.iso_certified:
            compliance_score += 5
        score += compliance_score

        return min(score, max_score)

    def save(self, *args, **kwargs):
        """Recalculate trust score before saving"""
        self.overall_trust_score = self.calculate_trust_score()
        super().save(*args, **kwargs)


class Review(models.Model):
    """Reviews and ratings for care providers"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        CareProvider, on_delete=models.CASCADE, related_name="reviews"
    )
    author = models.ForeignKey(
        "users.User",  # ← CHANGED: using string instead of direct import
        on_delete=models.SET_NULL,
        null=True,
        related_name="reviews_written",
    )

    # Ratings (1-5)
    overall_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    care_quality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )
    staff_attitude = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )
    communication = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )
    value_for_money = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True
    )

    # Review content
    title = models.CharField(max_length=200)
    content = models.TextField()
    would_recommend = models.BooleanField(default=True)

    # Service details
    service_type = models.CharField(max_length=50, blank=True)
    service_duration = models.CharField(max_length=50, blank=True)  # e.g., "6 months"
    relationship = models.CharField(
        max_length=50,
        choices=[
            ("service_user", "Service User"),
            ("family_member", "Family Member"),
            ("professional", "Professional Referral"),
            ("other", "Other"),
        ],
        default="service_user",
    )

    # Moderation
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    moderation_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
            ("flagged", "Flagged for Review"),
        ],
        default="pending",
    )
    moderation_notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["provider", "overall_rating"]),
            models.Index(fields=["is_verified", "moderation_status"]),
        ]

    def __str__(self):
        return f"Review by {self.author} for {self.provider.company_name}"

    def save(self, *args, **kwargs):
        """Update provider's average rating when review is saved"""
        super().save(*args, **kwargs)

        # Update provider's trust verification
        if self.provider.trust_verifications.exists():
            trust_verification = self.provider.trust_verifications.first()

            # Recalculate average rating
            reviews = Review.objects.filter(
                provider=self.provider, moderation_status="approved"
            )

            if reviews.exists():
                avg_rating = reviews.aggregate(models.Avg("overall_rating"))[
                    "overall_rating__avg"
                ]
                total_reviews = reviews.count()
                recommendation_rate = (
                    reviews.filter(would_recommend=True).count() / total_reviews * 100
                )

                trust_verification.average_rating = avg_rating or 0
                trust_verification.total_reviews = total_reviews
                trust_verification.recommendation_rate = recommendation_rate
                trust_verification.save()
