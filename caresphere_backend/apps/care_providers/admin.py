from django.contrib import admin

from .models import (
    AvailabilitySlot,
    CareProvider,
    ProviderSpecialization,
    StaffMember,
)

@admin.register(CareProvider)
class CareProviderAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "city",
        "is_verified",
        "is_accepting_clients",
        "created_at",
    )

    list_filter = (
        "is_verified",
        "is_accepting_clients",
        "city",
    )

    search_fields = (
        "company_name",
        "city",
        "postcode",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("company_name",)


@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display = (
        "full_name_display",
        "provider",
        "role",
        "employment_type",
        "experience_years",
        "is_available",
        "dbs_verified",
        "right_to_work_verified",
        "is_active",
    )

    list_filter = (
        "role",
        "employment_type",
        "is_available",
        "is_active",
        "dbs_verified",
        "right_to_work_verified",
        "provider",
    )

    search_fields = (
        "first_name",
        "last_name",
        "email",
        "phone",
        "provider__company_name",
        "dbs_reference",
        "professional_body_registration",
    )

    ordering = (
        "last_name",
        "first_name",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "provider",
        "user",
    )

    fieldsets = (
        (
            "Staff Member",
            {
                "fields": (
                    "id",
                    "provider",
                    "user",
                    "first_name",
                    "last_name",
                    "role",
                    "employment_type",
                )
            },
        ),
        (
            "Experience & Qualifications",
            {
                "fields": (
                    "experience_years",
                    "qualifications",
                    "training_certifications",
                    "languages_spoken",
                )
            },
        ),
        (
            "Availability",
            {
                "fields": (
                    "is_available",
                    "availability_schedule",
                    "max_hours_per_week",
                )
            },
        ),
        (
            "Verification",
            {
                "fields": (
                    "dbs_verified",
                    "dbs_expiry_date",
                    "dbs_reference",
                    "right_to_work_verified",
                    "professional_body_registration",
                )
            },
        ),
        (
            "Contact",
            {
                "fields": (
                    "phone",
                    "email",
                    "emergency_contact",
                )
            },
        ),
        (
            "Profile",
            {
                "fields": (
                    "bio",
                    "profile_picture",
                )
            },
        ),
        (
            "Employment",
            {
                "fields": (
                    "start_date",
                    "end_date",
                    "is_active",
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
        description="Staff member",
        ordering="last_name",
    )
    def full_name_display(self, obj):
        return obj.full_name


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = (
        "provider",
        "staff_member",
        "slot_type",
        "start_date",
        "start_time",
        "end_time",
        "recurrence_type",
        "is_available",
        "is_booked",
    )

    list_filter = (
        "slot_type",
        "is_available",
        "is_booked",
        "is_recurring",
        "recurrence_type",
        "is_at_facility",
        "provider",
        "start_date",
    )

    search_fields = (
        "provider__company_name",
        "staff_member__first_name",
        "staff_member__last_name",
        "location_postcode",
        "booking_reference",
        "notes",
    )

    ordering = (
        "start_date",
        "start_time",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    list_select_related = (
        "provider",
        "staff_member",
    )

    date_hierarchy = "start_date"

    fieldsets = (
        (
            "Provider & Staff",
            {
                "fields": (
                    "provider",
                    "staff_member",
                    "slot_type",
                )
            },
        ),
        (
            "Schedule",
            {
                "fields": (
                    "start_date",
                    "end_date",
                    "start_time",
                    "end_time",
                )
            },
        ),
        (
            "Recurrence",
            {
                "fields": (
                    "is_recurring",
                    "recurrence_type",
                    "recurrence_pattern",
                    "recurrence_end_date",
                )
            },
        ),
        (
            "Availability Status",
            {
                "fields": (
                    "is_available",
                    "is_booked",
                    "booking_reference",
                )
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "price_per_hour",
                    "price_per_day",
                    "price_per_week",
                )
            },
        ),
        (
            "Location",
            {
                "fields": (
                    "is_at_facility",
                    "location_postcode",
                )
            },
        ),
        (
            "Additional Information",
            {"fields": ("notes",)},
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


@admin.register(ProviderSpecialization)
class ProviderSpecializationAdmin(admin.ModelAdmin):
    list_display = (
        "provider",
        "dementia_care",
        "palliative_care",
        "mental_health",
        "personal_care",
        "night_care",
        "serves_adults",
        "serves_elderly",
    )

    list_filter = (
        "dementia_care",
        "alzheimers_care",
        "parkinsons_care",
        "palliative_care",
        "disability_care",
        "mental_health",
        "learning_disabilities",
        "personal_care",
        "night_care",
        "weekend_care",
        "serves_children",
        "serves_adults",
        "serves_elderly",
    )

    search_fields = ("provider__company_name",)

    list_select_related = ("provider",)

    fieldsets = (
        (
            "Provider",
            {"fields": ("provider",)},
        ),
        (
            "Specialist Care",
            {
                "fields": (
                    "dementia_care",
                    "alzheimers_care",
                    "parkinsons_care",
                    "stroke_recovery",
                    "palliative_care",
                    "disability_care",
                    "mental_health",
                    "learning_disabilities",
                    "physical_disabilities",
                    "sensory_impairment",
                )
            },
        ),
        (
            "Care Services",
            {
                "fields": (
                    "medication_management",
                    "personal_care",
                    "mobility_support",
                    "meal_preparation",
                    "housekeeping",
                    "companionship",
                    "transportation",
                    "night_care",
                    "weekend_care",
                    "holiday_care",
                )
            },
        ),
        (
            "Languages & Culture",
            {
                "fields": (
                    "languages",
                    "cultural_competencies",
                )
            },
        ),
        (
            "Age Groups",
            {
                "fields": (
                    "serves_children",
                    "serves_adults",
                    "serves_elderly",
                )
            },
        ),
    )
