"""
Care Provider Models
"""

# from django.contrib.auth.models import User  ← DELETE THIS LINE
import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CareProvider(models.Model):
    """Main care provider model"""

    class CareType(models.TextChoices):
        DOMICILIARY = "domiciliary", "Domiciliary Care"
        RESIDENTIAL = "residential", "Residential Care"
        NURSING = "nursing", "Nursing Care"
        LIVE_IN = "live_in", "Live-in Care"
        RESPITE = "respite", "Respite Care"
        DAY_CARE = "day_care", "Day Care Centre"
        SPECIALIST = "specialist", "Specialist Care"

    class BusinessType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual Caregiver"
        AGENCY = "agency", "Care Agency"
        NURSING_HOME = "nursing_home", "Nursing Home"
        RESIDENTIAL_HOME = "residential_home", "Residential Home"
        CHARITY = "charity", "Charity/Non-profit"
        NHS = "nhs", "NHS Trust"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending Verification"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    # Core identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "users.User", on_delete=models.CASCADE, related_name="care_provider"
    )  # ← FIXED
    company_name = models.CharField(max_length=255)
    trading_name = models.CharField(max_length=255, blank=True)
    cqc_location_id = models.CharField(
        max_length=50, unique=True, null=True, blank=True
    )

    # Business details
    business_type = models.CharField(max_length=50, choices=BusinessType.choices)
    company_number = models.CharField(
        max_length=50, blank=True
    )  # Companies House number
    vat_number = models.CharField(max_length=50, blank=True)

    # Specializations
    care_types = models.JSONField(default=list)  # List of CareType choices
    specializations = models.JSONField(default=list)  # e.g., ["dementia", "palliative"]

    # Location
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    postcode = models.CharField(max_length=10)
    county = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="United Kingdom")

    # Coordinates
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )

    # Contact
    phone = models.CharField(max_length=17)
    email = models.EmailField()
    website = models.URLField(blank=True)

    # Capacity
    max_capacity = models.IntegerField(default=1)
    current_clients = models.IntegerField(default=0)
    staff_count = models.IntegerField(default=1)

    # Operational details
    years_operating = models.IntegerField(default=0)
    registered_date = models.DateField(auto_now_add=True)
    is_accepting_clients = models.BooleanField(default=True)
    emergency_care_available = models.BooleanField(default=False)

    # Verification fields (ADDED)
    is_verified = models.BooleanField(default=False)  # Simple boolean for quick checks
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    verification_date = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        "users.User",  # ← FIXED
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_provider_verifications",
    )
    verification_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    # CQC verification (ADDED)
    cqc_verified = models.BooleanField(default=False)
    cqc_rating = models.CharField(
        max_length=50, null=True, blank=True
    )  # Outstanding, Good, Requires Improvement, Inadequate
    cqc_last_inspection = models.DateField(null=True, blank=True)
    cqc_report_url = models.URLField(blank=True)

    # Insurance and compliance (ADDED)
    insurance_provider = models.CharField(max_length=255, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    liability_insurance = models.BooleanField(default=False)
    safeguarding_training = models.BooleanField(default=False)

    # Pricing
    hourly_rate_min = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    hourly_rate_max = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    live_in_rate_min = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    live_in_rate_max = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    accepts_local_authority_funding = models.BooleanField(default=False)
    accepts_nhs_funding = models.BooleanField(default=False)
    accepts_private_pay = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Care Provider"
        verbose_name_plural = "Care Providers"
        indexes = [
            models.Index(fields=["city"]),
            models.Index(fields=["postcode"]),
            models.Index(fields=["care_types"]),
            models.Index(fields=["is_accepting_clients"]),
            models.Index(fields=["is_verified"]),  # ADDED
            models.Index(fields=["verification_status"]),  # ADDED
        ]
        ordering = ["company_name"]

    def __str__(self):
        return self.company_name

    @property
    def availability_status(self):
        """Calculate availability status"""
        if not self.is_accepting_clients:
            return "not_accepting"
        if self.current_clients >= self.max_capacity:
            return "full"
        if self.current_clients >= self.max_capacity * 0.9:
            return "limited"
        return "available"

    @property
    def capacity_percentage(self):
        """Calculate capacity percentage"""
        if self.max_capacity == 0:
            return 0
        return (self.current_clients / self.max_capacity) * 100

    @property
    def verification_badge(self):
        """Return verification badge based on status"""
        if self.verification_status == self.VerificationStatus.VERIFIED:
            return "Verified Provider"
        elif self.verification_status == self.VerificationStatus.PENDING:
            return "Verification Pending"
        elif self.verification_status == self.VerificationStatus.REJECTED:
            return "Not Verified"
        elif self.verification_status == self.VerificationStatus.SUSPENDED:
            return "Suspended"
        return "Unknown"

    @property
    def cqc_status(self):
        """Return CQC status"""
        if self.cqc_verified and self.cqc_location_id:
            return f"CQC Registered - Rating: {self.cqc_rating or 'Not Rated'}"
        return "Not CQC Registered"


class ExternalProviderLocation(models.Model):
    """A discoverable care location imported from the public CQC directory."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CQC identifiers are the stable keys used for idempotent imports.
    cqc_location_id = models.CharField(max_length=50, unique=True)
    cqc_provider_id = models.CharField(max_length=50, blank=True)

    # Directory identity and contact details.
    name = models.CharField(max_length=255)
    also_known_as = models.CharField(max_length=255, blank=True)
    provider_name = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    postcode = models.CharField(max_length=12, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(max_length=500, blank=True)

    # CQC classification fields. The original labels are retained while
    # care_types provides CareSphere's smaller discovery taxonomy.
    service_types = models.JSONField(default=list)
    specialisms = models.JSONField(default=list)
    care_types = models.JSONField(default=list)

    local_authority = models.CharField(max_length=150, blank=True)
    region = models.CharField(max_length=150, blank=True)
    location_url = models.URLField(max_length=500)
    latest_check_date = models.DateField(null=True, blank=True)

    # Quality data is enriched separately from CQC's monthly ratings sheet.
    # The weekly directory CSV does not contain ratings.
    cqc_rating = models.CharField(max_length=50, blank=True, db_index=True)
    cqc_rating_date = models.DateField(null=True, blank=True)
    cqc_rating_inherited = models.BooleanField(null=True, blank=True)

    # Import provenance and lifecycle.
    source_published_on = models.DateField(null=True, blank=True)
    content_hash = models.CharField(max_length=64)
    search_document = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    first_imported_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "External Provider Location"
        verbose_name_plural = "External Provider Locations"
        ordering = ["name", "postcode"]
        indexes = [
            models.Index(fields=["postcode"], name="ext_provider_postcode_idx"),
            models.Index(
                fields=["local_authority"], name="ext_provider_authority_idx"
            ),
            models.Index(fields=["region"], name="ext_provider_region_idx"),
            models.Index(
                fields=["is_active", "postcode"], name="ext_provider_active_post_idx"
            ),
            models.Index(
                fields=["is_active", "name"], name="ext_provider_active_name_idx"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.cqc_location_id})"


class ProviderSpecialization(models.Model):
    """Provider specializations and expertise"""

    provider = models.ForeignKey(
        CareProvider, on_delete=models.CASCADE, related_name="expertise"
    )

    # Medical specializations
    dementia_care = models.BooleanField(default=False)
    alzheimers_care = models.BooleanField(default=False)
    parkinsons_care = models.BooleanField(default=False)
    stroke_recovery = models.BooleanField(default=False)
    palliative_care = models.BooleanField(default=False)
    disability_care = models.BooleanField(default=False)
    mental_health = models.BooleanField(default=False)
    learning_disabilities = models.BooleanField(default=False)
    physical_disabilities = models.BooleanField(default=False)
    sensory_impairment = models.BooleanField(default=False)

    # Service capabilities
    medication_management = models.BooleanField(default=False)
    personal_care = models.BooleanField(default=False)
    mobility_support = models.BooleanField(default=False)
    meal_preparation = models.BooleanField(default=False)
    housekeeping = models.BooleanField(default=False)
    companionship = models.BooleanField(default=False)
    transportation = models.BooleanField(default=False)
    night_care = models.BooleanField(default=False)
    weekend_care = models.BooleanField(default=False)
    holiday_care = models.BooleanField(default=False)

    # Language capabilities
    languages = models.JSONField(default=list)  # List of languages spoken

    # Cultural competencies
    cultural_competencies = models.JSONField(
        default=list
    )  # e.g., ["muslim", "vegan", "lgbtq+"]

    # Age groups served (ADDED)
    serves_children = models.BooleanField(default=False)
    serves_adults = models.BooleanField(default=True)
    serves_elderly = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Provider Specialization"
        verbose_name_plural = "Provider Specializations"

    def __str__(self):
        return f"Specializations for {self.provider.company_name}"


class StaffMember(models.Model):
    """Staff members associated with care provider"""

    class Role(models.TextChoices):
        CAREGIVER = "caregiver", "Caregiver"
        NURSE = "nurse", "Nurse"
        SENIOR_CAREGIVER = "senior_caregiver", "Senior Caregiver"
        MANAGER = "manager", "Manager"
        ADMIN = "admin", "Administrator"
        SUPERVISOR = "supervisor", "Supervisor"
        TRAINER = "trainer", "Trainer"
        OTHER = "other", "Other"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"
        AGENCY = "agency", "Agency Staff"
        VOLUNTEER = "volunteer", "Volunteer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        CareProvider, on_delete=models.CASCADE, related_name="staff"
    )
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, null=True, blank=True
    )  # ← FIXED

    # Staff details
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=50, choices=Role.choices)
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    qualifications = models.JSONField(default=list)
    experience_years = models.IntegerField(default=0)

    # Availability
    is_available = models.BooleanField(default=True)
    availability_schedule = models.JSONField(default=dict)  # Weekly schedule
    max_hours_per_week = models.IntegerField(default=40, null=True, blank=True)

    # Verification
    dbs_verified = models.BooleanField(default=False)
    dbs_expiry_date = models.DateField(null=True, blank=True)
    dbs_reference = models.CharField(max_length=100, blank=True)
    training_certifications = models.JSONField(default=list)
    right_to_work_verified = models.BooleanField(default=False)
    professional_body_registration = models.CharField(
        max_length=100, blank=True
    )  # e.g., NMC number for nurses

    # Contact
    phone = models.CharField(max_length=17, blank=True)
    email = models.EmailField(blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)

    # Bio
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(
        upload_to="staff_profiles/", null=True, blank=True
    )
    languages_spoken = models.JSONField(default=list)

    # Employment dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Staff Member"
        verbose_name_plural = "Staff Members"
        indexes = [
            models.Index(fields=["provider", "role"]),
            models.Index(fields=["is_available", "is_active"]),
        ]
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.role}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_dbs_valid(self):
        if self.dbs_expiry_date:
            from django.utils import timezone

            return self.dbs_expiry_date > timezone.now().date()
        return self.dbs_verified


class AvailabilitySlot(models.Model):
    """Availability slots for care providers"""

    class SlotType(models.TextChoices):
        HOURLY = "hourly", "Hourly Care"
        LIVE_IN = "live_in", "Live-in Care"
        OVERNIGHT = "overnight", "Overnight Care"
        RESPITE = "respite", "Respite Care"
        EMERGENCY = "emergency", "Emergency Care"
        DAY_CARE = "day_care", "Day Care"

    class RecurrenceType(models.TextChoices):
        NONE = "none", "No Recurrence"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        BI_WEEKLY = "bi_weekly", "Bi-Weekly"
        MONTHLY = "monthly", "Monthly"

    provider = models.ForeignKey(
        CareProvider, on_delete=models.CASCADE, related_name="availability_slots"
    )
    staff_member = models.ForeignKey(
        StaffMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="availability_slots",
    )
    slot_type = models.CharField(max_length=20, choices=SlotType.choices)

    # Time slots
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # For recurring slots
    start_time = models.TimeField()
    end_time = models.TimeField()

    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_type = models.CharField(
        max_length=20, choices=RecurrenceType.choices, default=RecurrenceType.NONE
    )
    recurrence_pattern = models.JSONField(
        default=dict
    )  # e.g., {"frequency": "weekly", "days": [1,3,5]}
    recurrence_end_date = models.DateField(null=True, blank=True)

    # Status
    is_booked = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    booking_reference = models.CharField(max_length=100, blank=True)

    # Pricing
    price_per_hour = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    price_per_day = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    price_per_week = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    # Location (for home care vs facility care)
    is_at_facility = models.BooleanField(default=True)
    location_postcode = models.CharField(max_length=10, blank=True)  # For home care

    # Notes
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Availability Slot"
        verbose_name_plural = "Availability Slots"
        ordering = ["start_date", "start_time"]
        indexes = [
            models.Index(fields=["provider", "start_date"]),
            models.Index(fields=["is_available", "is_booked"]),
            models.Index(fields=["slot_type"]),
        ]

    def __str__(self):
        return f"{self.provider.company_name} - {self.slot_type} on {self.start_date}"

    @property
    def duration_hours(self):
        """Calculate duration in hours"""
        if self.start_time and self.end_time:
            start = self.start_time.hour + self.start_time.minute / 60
            end = self.end_time.hour + self.end_time.minute / 60
            return round(end - start, 2)
        return 0

    @property
    def is_past(self):
        """Check if slot is in the past"""
        from django.utils import timezone

        slot_datetime = timezone.datetime.combine(
        self.start_date,
        self.start_time,
    )

        if timezone.is_naive(slot_datetime):
            slot_datetime = timezone.make_aware(
            slot_datetime,
            timezone.get_current_timezone(),
        )

        return slot_datetime < timezone.now()
