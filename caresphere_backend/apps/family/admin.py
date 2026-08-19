from django.contrib import admin

from .models import (
    CareCircle,
    CareCircleMember,
    DecisionVote,
    FamilyDecision,
    FamilyNote,
    SavedProvider,
)


@admin.register(CareCircle)
class CareCircleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "service_user",
        "is_active",
        "requires_consensus",
        "consensus_threshold",
        "created_at",
    )

    search_fields = (
        "name",
        "service_user__first_name",
        "service_user__last_name",
    )

    list_filter = (
        "is_active",
        "requires_consensus",
    )


@admin.register(CareCircleMember)
class CareCircleMemberAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "care_circle",
        "role",
        "relationship",
        "can_manage_bookings",
        "can_make_decisions",
        "is_active",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "care_circle__name",
    )

    list_filter = (
        "role",
        "relationship",
        "can_invite_members",
        "can_manage_bookings",
        "can_view_financials",
        "can_make_decisions",
        "can_edit_profiles",
        "is_active",
        "is_verified",
    )

    fieldsets = (
        (
            "Member",
            {
                "fields": (
                    "care_circle",
                    "user",
                    "role",
                    "relationship",
                    "nickname",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "can_invite_members",
                    "can_manage_bookings",
                    "can_view_financials",
                    "can_make_decisions",
                    "can_edit_profiles",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
                    "is_verified",
                    "notification_preferences",
                )
            },
        ),
    )


@admin.register(FamilyDecision)
class FamilyDecisionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "care_circle",
        "status",
        "decision_type",
        "created_by",
        "created_at",
    )

    list_filter = (
        "status",
        "decision_type",
    )

    search_fields = (
        "title",
        "description",
    )


@admin.register(DecisionVote)
class DecisionVoteAdmin(admin.ModelAdmin):
    list_display = (
        "decision",
        "voter",
        "chosen_option",
        "is_abstained",
        "voted_at",
    )

    list_filter = ("is_abstained",)


@admin.register(FamilyNote)
class FamilyNoteAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "care_circle",
        "author",
        "note_type",
        "privacy_level",
        "is_pinned",
        "created_at",
    )

    list_filter = (
        "note_type",
        "privacy_level",
        "is_pinned",
    )

    search_fields = (
        "title",
        "content",
    )


@admin.register(SavedProvider)
class SavedProviderAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "provider",
        "saved_at",
    )

    search_fields = (
        "user__email",
        "provider__company_name",
    )
