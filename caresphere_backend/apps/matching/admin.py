from django.contrib import admin

from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "provider",
        "match_score",
        "status",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "status",
        "provider",
        "created_at",
    )

    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "provider__company_name",
    )

    ordering = (
        "-match_score",
        "-created_at",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "user",
        "provider",
    )

    fieldsets = (
        (
            "Match",
            {
                "fields": (
                    "id",
                    "user",
                    "provider",
                    "match_score",
                    "status",
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
