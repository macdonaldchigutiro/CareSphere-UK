from django.contrib import admin

from .models import Review, TrustVerification


@admin.register(TrustVerification)
class TrustVerificationAdmin(admin.ModelAdmin):
    list_display = (
        "provider",
        "verification_status",
        "overall_trust_score",
        "cqc_rating",
        "dbs_verified",
        "insurance_verified",
        "gdpr_compliant",
        "last_verified",
    )

    list_filter = (
        "verification_status",
        "cqc_rating",
        "dbs_verified",
        "dbs_enhanced",
        "insurance_verified",
        "gdpr_compliant",
        "health_safety_certified",
        "iso_certified",
    )

    search_fields = (
        "provider__company_name",
        "cqc_location_id",
        "dbs_certificate_number",
        "insurance_provider",
        "insurance_policy_number",
        "verified_by__email",
        "verification_notes",
    )

    ordering = ("-overall_trust_score",)

    readonly_fields = (
        "overall_trust_score",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "provider",
        "verified_by",
    )

    fieldsets = (
        (
            "Provider & Verification",
            {
                "fields": (
                    "provider",
                    "verification_status",
                    "overall_trust_score",
                    "last_verified",
                    "verified_by",
                    "verification_notes",
                )
            },
        ),
        (
            "CQC",
            {
                "fields": (
                    "cqc_location_id",
                    "cqc_rating",
                    "cqc_last_inspection",
                    "cqc_report_url",
                )
            },
        ),
        (
            "DBS",
            {
                "fields": (
                    "dbs_verified",
                    "dbs_enhanced",
                    "dbs_certificate_number",
                    "dbs_issue_date",
                    "dbs_expiry_date",
                )
            },
        ),
        (
            "Insurance",
            {
                "fields": (
                    "insurance_verified",
                    "insurance_provider",
                    "insurance_policy_number",
                    "insurance_expiry_date",
                    "insurance_coverage_amount",
                )
            },
        ),
        (
            "Training",
            {
                "fields": (
                    "training_certifications",
                    "last_training_refresh",
                )
            },
        ),
        (
            "Compliance",
            {
                "fields": (
                    "gdpr_compliant",
                    "health_safety_certified",
                    "iso_certified",
                )
            },
        ),
        (
            "Reviews & Ratings",
            {
                "fields": (
                    "average_rating",
                    "total_reviews",
                    "recommendation_rate",
                )
            },
        ),
        (
            "Staff Metrics",
            {
                "fields": (
                    "staff_turnover_rate",
                    "staff_training_hours",
                )
            },
        ),
        (
            "System Information",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "provider",
        "author",
        "overall_rating",
        "would_recommend",
        "is_verified",
        "moderation_status",
        "is_featured",
        "created_at",
    )

    list_filter = (
        "moderation_status",
        "overall_rating",
        "would_recommend",
        "is_verified",
        "is_featured",
        "relationship",
        "created_at",
    )

    search_fields = (
        "title",
        "content",
        "provider__company_name",
        "author__email",
        "service_type",
        "moderation_notes",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "provider",
        "author",
    )

    fieldsets = (
        (
            "Review",
            {
                "fields": (
                    "id",
                    "provider",
                    "author",
                    "title",
                    "content",
                )
            },
        ),
        (
            "Ratings",
            {
                "fields": (
                    "overall_rating",
                    "care_quality",
                    "staff_attitude",
                    "communication",
                    "value_for_money",
                    "would_recommend",
                )
            },
        ),
        (
            "Service Information",
            {
                "fields": (
                    "service_type",
                    "service_duration",
                    "relationship",
                )
            },
        ),
        (
            "Moderation",
            {
                "fields": (
                    "moderation_status",
                    "moderation_notes",
                    "is_verified",
                    "is_featured",
                )
            },
        ),
        (
            "System Information",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
