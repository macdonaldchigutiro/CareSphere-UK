from django.contrib import admin

from .models import PricingTier


@admin.register(PricingTier)
class PricingTierAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "provider",
        "hourly_rate",
        "daily_rate",
        "weekly_rate",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
        "provider",
        "created_at",
    )

    search_fields = (
        "name",
        "description",
        "provider__company_name",
    )

    ordering = (
        "provider",
        "name",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    list_select_related = ("provider",)

    fieldsets = (
        (
            "Pricing Tier",
            {
                "fields": (
                    "id",
                    "provider",
                    "name",
                    "description",
                    "is_active",
                )
            },
        ),
        (
            "Rates",
            {
                "fields": (
                    "hourly_rate",
                    "daily_rate",
                    "weekly_rate",
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
