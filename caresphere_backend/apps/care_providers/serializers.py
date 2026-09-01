from rest_framework import serializers

from .models import (
    AvailabilitySlot,
    CareProvider,
    ExternalProviderLocation,
    ProviderSpecialization,
    StaffMember,
)

# ======================================================
# PROVIDER SPECIALISATIONS
# ======================================================


class ProviderSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderSpecialization
        fields = "__all__"

        read_only_fields = (
            "id",
            "provider",
        )


# ======================================================
# PUBLIC PROVIDER
# ======================================================


class CareProviderSerializer(serializers.ModelSerializer):
    availability_status = serializers.CharField(
        read_only=True,
    )

    verification_badge = serializers.CharField(
        read_only=True,
    )

    cqc_status = serializers.CharField(
        read_only=True,
    )

    expertise = ProviderSpecializationSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CareProvider
        fields = "__all__"

        read_only_fields = (
            "id",
            "user",
            "created_at",
            "updated_at",
            "registered_date",
            "verification_date",
            "verified_by",
        )


class ExternalProviderLocationSerializer(serializers.ModelSerializer):
    """Present a CQC directory row in CareSphere's discovery result shape."""

    company_name = serializers.CharField(source="name", read_only=True)
    trading_name = serializers.CharField(source="also_known_as", read_only=True)
    address_line1 = serializers.CharField(source="address", read_only=True)
    specializations = serializers.JSONField(source="specialisms", read_only=True)
    county = serializers.CharField(source="local_authority", read_only=True)
    cqc_report_url = serializers.URLField(source="location_url", read_only=True)

    class Meta:
        model = ExternalProviderLocation
        fields = (
            "id",
            "company_name",
            "trading_name",
            "provider_name",
            "address_line1",
            "postcode",
            "phone",
            "website",
            "service_types",
            "specializations",
            "care_types",
            "county",
            "region",
            "cqc_location_id",
            "cqc_provider_id",
            "cqc_rating",
            "cqc_rating_date",
            "cqc_rating_inherited",
            "cqc_report_url",
            "latest_check_date",
            "source_published_on",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.update(
            {
                "source": "cqc_directory",
                "city": "",
                "country": "England",
                "email": "",
                "business_type": "external_directory",
                "is_verified": False,
                "verification_badge": "CQC registered",
                "cqc_verified": True,
                "cqc_registered": True,
                "cqc_rating": instance.cqc_rating or None,
                "cqc_status": (
                    f"CQC rated {instance.cqc_rating}"
                    if instance.cqc_rating
                    else "CQC registered location - rating not available"
                ),
                "availability_status": "unknown",
                "hourly_rate_min": None,
                "hourly_rate_max": None,
                "live_in_rate_min": None,
                "live_in_rate_max": None,
                "accepts_nhs_funding": None,
                "accepts_local_authority_funding": None,
                "accepts_private_pay": None,
                "can_book": False,
                "can_save": False,
                "external_url": instance.location_url,
            }
        )
        return data


# ======================================================
# PROVIDER SELF PROFILE
# ======================================================


class ProviderSelfProfileSerializer(serializers.ModelSerializer):
    availability_status = serializers.CharField(
        read_only=True,
    )

    verification_badge = serializers.CharField(
        read_only=True,
    )

    cqc_status = serializers.CharField(
        read_only=True,
    )

    expertise = ProviderSpecializationSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CareProvider

        fields = (
            "id",
            "company_name",
            "trading_name",
            "business_type",
            "company_number",
            "vat_number",
            "care_types",
            "specializations",
            "address_line1",
            "address_line2",
            "city",
            "postcode",
            "county",
            "country",
            "phone",
            "email",
            "website",
            "max_capacity",
            "current_clients",
            "staff_count",
            "years_operating",
            "is_accepting_clients",
            "emergency_care_available",
            "hourly_rate_min",
            "hourly_rate_max",
            "live_in_rate_min",
            "live_in_rate_max",
            "accepts_local_authority_funding",
            "accepts_nhs_funding",
            "accepts_private_pay",
            "is_verified",
            "verification_status",
            "verification_badge",
            "cqc_location_id",
            "cqc_verified",
            "cqc_rating",
            "cqc_last_inspection",
            "cqc_report_url",
            "cqc_status",
            "insurance_provider",
            "insurance_expiry",
            "liability_insurance",
            "safeguarding_training",
            "availability_status",
            "expertise",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "current_clients",
            "staff_count",
            "is_verified",
            "verification_status",
            "verification_badge",
            "cqc_location_id",
            "cqc_verified",
            "cqc_rating",
            "cqc_last_inspection",
            "cqc_report_url",
            "cqc_status",
            "availability_status",
            "expertise",
            "created_at",
            "updated_at",
        )

    def validate_max_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Maximum capacity must be at least 1.")

        current_clients = self.instance.current_clients if self.instance else 0

        if value < current_clients:
            raise serializers.ValidationError(
                "Maximum capacity cannot be lower "
                "than the provider's current client count."
            )

        return value

    def validate(self, attrs):
        hourly_min = attrs.get(
            "hourly_rate_min",
            getattr(
                self.instance,
                "hourly_rate_min",
                None,
            ),
        )

        hourly_max = attrs.get(
            "hourly_rate_max",
            getattr(
                self.instance,
                "hourly_rate_max",
                None,
            ),
        )

        live_in_min = attrs.get(
            "live_in_rate_min",
            getattr(
                self.instance,
                "live_in_rate_min",
                None,
            ),
        )

        live_in_max = attrs.get(
            "live_in_rate_max",
            getattr(
                self.instance,
                "live_in_rate_max",
                None,
            ),
        )

        if (
            hourly_min is not None
            and hourly_max is not None
            and hourly_max < hourly_min
        ):
            raise serializers.ValidationError(
                {
                    "hourly_rate_max": (
                        "Maximum hourly rate cannot " "be lower than the minimum rate."
                    )
                }
            )

        if (
            live_in_min is not None
            and live_in_max is not None
            and live_in_max < live_in_min
        ):
            raise serializers.ValidationError(
                {
                    "live_in_rate_max": (
                        "Maximum live-in rate cannot " "be lower than the minimum rate."
                    )
                }
            )

        return attrs


# ======================================================
# PUBLIC STAFF
# ======================================================


class StaffMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        read_only=True,
    )

    is_dbs_valid = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = StaffMember
        fields = "__all__"

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


# ======================================================
# PROVIDER STAFF MANAGEMENT
# ======================================================


class ProviderStaffSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        read_only=True,
    )

    is_dbs_valid = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = StaffMember

        fields = (
            "id",
            "full_name",
            "first_name",
            "last_name",
            "role",
            "employment_type",
            "qualifications",
            "experience_years",
            "is_available",
            "availability_schedule",
            "max_hours_per_week",
            "dbs_verified",
            "dbs_expiry_date",
            "dbs_reference",
            "is_dbs_valid",
            "training_certifications",
            "right_to_work_verified",
            "professional_body_registration",
            "phone",
            "email",
            "emergency_contact",
            "bio",
            "profile_picture",
            "languages_spoken",
            "start_date",
            "end_date",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "full_name",
            "dbs_verified",
            "dbs_expiry_date",
            "dbs_reference",
            "is_dbs_valid",
            "right_to_work_verified",
            "created_at",
            "updated_at",
        )

    def validate_experience_years(self, value):
        if value < 0:
            raise serializers.ValidationError("Experience cannot be negative.")

        return value

    def validate_max_hours_per_week(self, value):
        if value is None:
            return value

        if value < 0:
            raise serializers.ValidationError(
                "Maximum weekly hours cannot be negative."
            )

        if value > 168:
            raise serializers.ValidationError("Maximum weekly hours cannot exceed 168.")

        return value

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(
                self.instance,
                "start_date",
                None,
            ),
        )

        end_date = attrs.get(
            "end_date",
            getattr(
                self.instance,
                "end_date",
                None,
            ),
        )

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {
                    "end_date": (
                        "End date cannot be before " "the staff member's start date."
                    )
                }
            )

        return attrs


# ======================================================
# PUBLIC AVAILABILITY
# ======================================================


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    duration_hours = serializers.FloatField(
        read_only=True,
    )

    is_past = serializers.BooleanField(
        read_only=True,
    )

    provider_name = serializers.CharField(
        source="provider.company_name",
        read_only=True,
    )

    staff_member_name = serializers.CharField(
        source="staff_member.full_name",
        read_only=True,
    )

    class Meta:
        model = AvailabilitySlot
        fields = "__all__"

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


# ======================================================
# PROVIDER AVAILABILITY MANAGEMENT
# ======================================================


class ProviderAvailabilitySerializer(serializers.ModelSerializer):
    """
    Provider-facing availability serializer.

    Provider ownership is always determined by the
    authenticated account.

    Staff assignment is checked to ensure a provider
    cannot assign another organisation's employee.
    """

    provider_name = serializers.CharField(
        source="provider.company_name",
        read_only=True,
    )

    staff_member_name = serializers.CharField(
        source="staff_member.full_name",
        read_only=True,
    )

    duration_hours = serializers.FloatField(
        read_only=True,
    )

    is_past = serializers.BooleanField(
        read_only=True,
    )

    staff_member = serializers.PrimaryKeyRelatedField(
        queryset=StaffMember.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = AvailabilitySlot

        fields = (
            "id",
            "provider_name",
            "staff_member",
            "staff_member_name",
            "slot_type",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "is_recurring",
            "recurrence_type",
            "recurrence_pattern",
            "recurrence_end_date",
            "is_booked",
            "is_available",
            "booking_reference",
            "price_per_hour",
            "price_per_day",
            "price_per_week",
            "is_at_facility",
            "location_postcode",
            "notes",
            "duration_hours",
            "is_past",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "provider_name",
            "staff_member_name",
            "is_booked",
            "booking_reference",
            "duration_hours",
            "is_past",
            "created_at",
            "updated_at",
        )

    def validate_staff_member(self, value):
        if value is None:
            return value

        request = self.context.get("request")

        if not request:
            raise serializers.ValidationError("Unable to verify staff ownership.")

        try:
            provider = request.user.care_provider
        except (
            AttributeError,
            CareProvider.DoesNotExist,
        ):
            raise serializers.ValidationError(
                "No provider profile is linked " "to this account."
            )

        if value.provider_id != provider.id:
            raise serializers.ValidationError(
                "You can only assign staff members " "belonging to your organisation."
            )

        if not value.is_active:
            raise serializers.ValidationError(
                "Inactive staff members cannot be "
                "assigned to new availability slots."
            )

        return value

    def validate_price_per_hour(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Hourly price cannot be negative.")

        return value

    def validate_price_per_day(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Daily price cannot be negative.")

        return value

    def validate_price_per_week(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Weekly price cannot be negative.")

        return value

    def validate(self, attrs):
        instance = self.instance

        start_date = attrs.get(
            "start_date",
            getattr(
                instance,
                "start_date",
                None,
            ),
        )

        end_date = attrs.get(
            "end_date",
            getattr(
                instance,
                "end_date",
                None,
            ),
        )

        is_recurring = attrs.get(
            "is_recurring",
            getattr(
                instance,
                "is_recurring",
                False,
            ),
        )

        recurrence_type = attrs.get(
            "recurrence_type",
            getattr(
                instance,
                "recurrence_type",
                "none",
            ),
        )

        recurrence_end_date = attrs.get(
            "recurrence_end_date",
            getattr(
                instance,
                "recurrence_end_date",
                None,
            ),
        )

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": ("End date cannot be before " "the start date.")}
            )

        if recurrence_end_date and start_date and recurrence_end_date < start_date:
            raise serializers.ValidationError(
                {
                    "recurrence_end_date": (
                        "Recurrence end date cannot " "be before the start date."
                    )
                }
            )

        if is_recurring and recurrence_type == "none":
            raise serializers.ValidationError(
                {
                    "recurrence_type": (
                        "Choose a recurrence type " "for recurring availability."
                    )
                }
            )

        if not is_recurring:
            attrs["recurrence_type"] = "none"
            attrs["recurrence_pattern"] = {}
            attrs["recurrence_end_date"] = None

        return attrs
