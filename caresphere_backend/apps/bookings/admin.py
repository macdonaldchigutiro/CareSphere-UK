from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "care_recipient",
        "provider",
        "assigned_staff",
        "care_type",
        "frequency",
        "start_time",
        "end_time",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "frequency",
        "care_type",
        "provider",
        "created_at",
    )

    search_fields = (
        "care_recipient_name",
        "service_user__first_name",
        "service_user__last_name",
        "user__email",
        "user__first_name",
        "user__last_name",
        "provider__company_name",
        "assigned_staff__first_name",
        "assigned_staff__last_name",
        "care_type",
        "requirements",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "user",
        "provider",
        "assigned_staff",
        "service_user",
    )

    fieldsets = (
        (
            "Booking",
            {
                "fields": (
                    "id",
                    "status",
                    "user",
                    "provider",
                )
            },
        ),
        (
            "Care Recipient",
            {
                "fields": (
                    "service_user",
                    "care_recipient_name",
                )
            },
        ),
        (
            "Care Request",
            {
                "fields": (
                    "care_type",
                    "frequency",
                    "requirements",
                    "notes",
                )
            },
        ),
        (
            "Scheduling",
            {
                "fields": (
                    "start_time",
                    "end_time",
                    "assigned_staff",
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

    @admin.display(
        description="Care recipient",
        ordering="care_recipient_name",
    )
    def care_recipient(self, obj):
        if obj.service_user:
            return obj.service_user.full_name

        return obj.care_recipient_name or obj.user.email
