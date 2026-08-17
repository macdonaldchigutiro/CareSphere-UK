from django.contrib import admin

from .models import ServiceUserProfile


@admin.register(ServiceUserProfile)
class ServiceUserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "first_name",
        "last_name",
        "managed_by",
        "linked_user",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
        "created_at",
    )

    search_fields = (
        "first_name",
        "last_name",
        "managed_by__email",
        "linked_user__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )
