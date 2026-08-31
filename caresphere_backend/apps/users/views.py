# apps/users/views.py

from django.db.models import Count

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer


class IsPlatformAdmin(permissions.BasePermission):
    """
    Allows access only to CareSphere platform administrators.
    """

    message = "CareSphere administrator access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "message": "Registration successful",
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "message": "Login successful",
            }
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminDashboardView(APIView):
    """
    CareSphere administration dashboard overview.

    This endpoint is intentionally protected on the backend.
    Frontend checks are for user experience only and are not
    relied upon for security.
    """

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        # Imported here to avoid unnecessary cross-app imports
        # when the normal users endpoints are loaded.
        from apps.bookings.models import Booking
        from apps.care_providers.models import CareProvider, StaffMember
        from apps.matching.models import Match
        from apps.notifications.models import Notification
        from apps.service_users.models import ServiceUserProfile

        # -----------------------------------------------------
        # USERS
        # -----------------------------------------------------

        total_users = User.objects.count()

        family_users = User.objects.filter(user_type="family").count()

        provider_users = User.objects.filter(user_type="provider").count()

        # -----------------------------------------------------
        # PROVIDERS / STAFF / SERVICE USERS
        # -----------------------------------------------------

        total_providers = CareProvider.objects.count()
        total_staff = StaffMember.objects.count()
        total_service_users = ServiceUserProfile.objects.count()

        # -----------------------------------------------------
        # BOOKINGS
        # -----------------------------------------------------

        total_bookings = Booking.objects.count()

        active_statuses = [
            "pending",
            "accepted",
            "confirmed",
            "in_progress",
        ]

        active_bookings = Booking.objects.filter(status__in=active_statuses).count()

        pending_bookings = Booking.objects.filter(status="pending").count()

        in_progress_bookings = Booking.objects.filter(status="in_progress").count()

        unassigned_shifts = Booking.objects.filter(
            status__in=["accepted", "confirmed"],
            assigned_staff__isnull=True,
        ).count()

        booking_status_rows = (
            Booking.objects.values("status").annotate(count=Count("id")).order_by()
        )

        booking_status = {row["status"]: row["count"] for row in booking_status_rows}

        # -----------------------------------------------------
        # MATCHING
        # -----------------------------------------------------

        total_matches = Match.objects.count()

        pending_matches = Match.objects.filter(status="pending").count()

        # -----------------------------------------------------
        # NOTIFICATIONS
        # -----------------------------------------------------

        unread_notifications = Notification.objects.filter(is_read=False).count()

        # -----------------------------------------------------
        # RECENT BOOKINGS
        # -----------------------------------------------------

        recent_booking_objects = Booking.objects.select_related(
            "user",
            "provider",
            "assigned_staff",
            "service_user",
        ).order_by("-created_at")[:6]

        recent_bookings = []

        for booking in recent_booking_objects:
            recipient_name = (
                booking.care_recipient_name
                or (booking.service_user.full_name if booking.service_user else "")
                or "Not specified"
            )

            provider_name = "Not assigned"

            if booking.provider:
                provider_name = (
                    getattr(booking.provider, "business_name", None)
                    or getattr(booking.provider, "company_name", None)
                    or str(booking.provider)
                )

            assigned_staff_name = "Unassigned"

            if booking.assigned_staff:
                first_name = getattr(
                    booking.assigned_staff,
                    "first_name",
                    "",
                )
                last_name = getattr(
                    booking.assigned_staff,
                    "last_name",
                    "",
                )

                staff_full_name = f"{first_name} {last_name}".strip()

                assigned_staff_name = staff_full_name or str(booking.assigned_staff)

            recent_bookings.append(
                {
                    "id": str(booking.id),
                    "recipient_name": recipient_name,
                    "provider_name": provider_name,
                    "assigned_staff_name": assigned_staff_name,
                    "care_type": booking.care_type,
                    "status": booking.status,
                    "start_time": (
                        booking.start_time.isoformat() if booking.start_time else None
                    ),
                    "created_at": booking.created_at.isoformat(),
                }
            )

        # -----------------------------------------------------
        # RECENT USERS
        # -----------------------------------------------------

        recent_user_objects = User.objects.order_by("-date_joined")[:6]

        recent_users = []

        for user in recent_user_objects:
            full_name = user.get_full_name().strip()

            recent_users.append(
                {
                    "id": user.id,
                    "name": full_name or user.username or user.email,
                    "email": user.email,
                    "user_type": user.user_type,
                    "is_verified": user.is_verified,
                    "is_active": user.is_active,
                    "date_joined": (
                        user.date_joined.isoformat() if user.date_joined else None
                    ),
                }
            )

        # -----------------------------------------------------
        # RESPONSE
        # -----------------------------------------------------

        return Response(
            {
                "summary": {
                    "total_users": total_users,
                    "family_users": family_users,
                    "provider_users": provider_users,
                    "total_providers": total_providers,
                    "total_staff": total_staff,
                    "total_service_users": total_service_users,
                    "total_bookings": total_bookings,
                    "active_bookings": active_bookings,
                    "pending_bookings": pending_bookings,
                    "in_progress_bookings": in_progress_bookings,
                    "unassigned_shifts": unassigned_shifts,
                    "total_matches": total_matches,
                    "pending_matches": pending_matches,
                    "unread_notifications": unread_notifications,
                },
                "booking_status": booking_status,
                "recent_bookings": recent_bookings,
                "recent_users": recent_users,
            }
        )


class AdminOperationsView(APIView):
    """
    Operational data for the branded CareSphere admin workspace.

    Provides platform-wide provider, booking, staffing,
    service-user and matching information.

    Access is restricted to CareSphere platform administrators.
    """

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from apps.bookings.models import Booking
        from apps.care_providers.models import (
            CareProvider,
            StaffMember,
            AvailabilitySlot,
        )
        from apps.matching.models import Match
        from apps.service_users.models import ServiceUserProfile

        # =====================================================
        # HELPERS
        # =====================================================

        def user_display_name(user):
            if not user:
                return ""

            full_name = user.get_full_name().strip()

            return full_name or user.email or user.username or "Unknown user"

        def provider_display_name(provider):
            if not provider:
                return "Not assigned"

            return provider.trading_name or provider.company_name or "Unnamed provider"

        def staff_display_name(staff):
            if not staff:
                return "Unassigned"

            full_name = f"{staff.first_name} {staff.last_name}".strip()

            return full_name or staff.email or "Unnamed staff member"

        # =====================================================
        # PROVIDERS
        # =====================================================

        provider_queryset = CareProvider.objects.select_related("user").order_by(
            "-created_at"
        )

        provider_items = []

        for provider in provider_queryset:
            provider_items.append(
                {
                    "id": str(provider.id),
                    "company_name": provider.company_name,
                    "trading_name": provider.trading_name,
                    "display_name": provider_display_name(provider),
                    "business_type": provider.business_type,
                    "city": provider.city,
                    "postcode": provider.postcode,
                    "county": provider.county,
                    "phone": provider.phone,
                    "email": provider.email,
                    "website": provider.website,
                    "care_types": provider.care_types,
                    "specializations": provider.specializations,
                    "max_capacity": provider.max_capacity,
                    "current_clients": provider.current_clients,
                    "staff_count": provider.staff_count,
                    "is_accepting_clients": provider.is_accepting_clients,
                    "emergency_care_available": provider.emergency_care_available,
                    "is_verified": provider.is_verified,
                    "verification_status": provider.verification_status,
                    "cqc_verified": provider.cqc_verified,
                    "cqc_rating": provider.cqc_rating,
                    "hourly_rate_min": (
                        str(provider.hourly_rate_min)
                        if provider.hourly_rate_min is not None
                        else None
                    ),
                    "hourly_rate_max": (
                        str(provider.hourly_rate_max)
                        if provider.hourly_rate_max is not None
                        else None
                    ),
                    "account_email": (provider.user.email if provider.user else ""),
                    "account_active": (
                        provider.user.is_active if provider.user else False
                    ),
                    "created_at": (
                        provider.created_at.isoformat() if provider.created_at else None
                    ),
                }
            )

        providers_summary = {
            "total": provider_queryset.count(),
            "verified": provider_queryset.filter(is_verified=True).count(),
            "awaiting_review": provider_queryset.filter(is_verified=False).count(),
            "active": provider_queryset.filter(user__is_active=True).count(),
            "accepting_clients": provider_queryset.filter(
                is_accepting_clients=True
            ).count(),
        }

        # =====================================================
        # BOOKINGS
        # =====================================================

        booking_queryset = Booking.objects.select_related(
            "user",
            "provider",
            "assigned_staff",
            "service_user",
        ).order_by("-created_at")

        booking_items = []

        for booking in booking_queryset:
            recipient_name = (
                booking.service_user.full_name
                if booking.service_user
                else booking.care_recipient_name
            ) or "Not specified"

            staffing_risk = (
                booking.status in ["accepted", "confirmed"]
                and booking.assigned_staff is None
            )

            booking_items.append(
                {
                    "id": str(booking.id),
                    "recipient_name": recipient_name,
                    "service_user_id": (
                        booking.service_user_id if booking.service_user_id else None
                    ),
                    "family_user": user_display_name(booking.user),
                    "family_email": (booking.user.email if booking.user else ""),
                    "provider_id": str(booking.provider_id),
                    "provider_name": provider_display_name(booking.provider),
                    "assigned_staff_id": (
                        str(booking.assigned_staff_id)
                        if booking.assigned_staff_id
                        else None
                    ),
                    "assigned_staff_name": staff_display_name(booking.assigned_staff),
                    "care_type": booking.care_type,
                    "frequency": booking.frequency,
                    "frequency_display": booking.get_frequency_display(),
                    "start_time": (
                        booking.start_time.isoformat() if booking.start_time else None
                    ),
                    "end_time": (
                        booking.end_time.isoformat() if booking.end_time else None
                    ),
                    "status": booking.status,
                    "status_display": booking.get_status_display(),
                    "staffing_risk": staffing_risk,
                    "created_at": booking.created_at.isoformat(),
                    "updated_at": booking.updated_at.isoformat(),
                }
            )

        booking_summary = {
            "total": booking_queryset.count(),
            "pending": booking_queryset.filter(status="pending").count(),
            "accepted": booking_queryset.filter(status="accepted").count(),
            "confirmed": booking_queryset.filter(status="confirmed").count(),
            "in_progress": booking_queryset.filter(status="in_progress").count(),
            "completed": booking_queryset.filter(status="completed").count(),
            "cancelled": booking_queryset.filter(status="cancelled").count(),
            "declined": booking_queryset.filter(status="declined").count(),
            "unassigned_shifts": booking_queryset.filter(
                status__in=["accepted", "confirmed"],
                assigned_staff__isnull=True,
            ).count(),
        }

        # =====================================================
        # STAFF & CAPACITY
        # =====================================================

        staff_queryset = StaffMember.objects.select_related(
            "provider", "user"
        ).order_by("first_name", "last_name")

        availability_queryset = AvailabilitySlot.objects.select_related(
            "provider", "staff_member"
        ).all()

        staff_items = []

        for staff in staff_queryset:
            staff_availability = availability_queryset.filter(staff_member=staff)

            active_availability = staff_availability.filter(
                is_available=True,
                is_booked=False,
            )

            active_booking_count = Booking.objects.filter(
                assigned_staff=staff,
                status__in=[
                    "accepted",
                    "confirmed",
                    "in_progress",
                ],
            ).count()

            staff_items.append(
                {
                    "id": str(staff.id),
                    "name": staff_display_name(staff),
                    "first_name": staff.first_name,
                    "last_name": staff.last_name,
                    "provider_id": str(staff.provider_id),
                    "provider_name": provider_display_name(staff.provider),
                    "role": staff.role,
                    "employment_type": staff.employment_type,
                    "experience_years": staff.experience_years,
                    "is_available": staff.is_available,
                    "is_active": staff.is_active,
                    "max_hours_per_week": staff.max_hours_per_week,
                    "dbs_verified": staff.dbs_verified,
                    "right_to_work_verified": (staff.right_to_work_verified),
                    "phone": staff.phone,
                    "email": staff.email,
                    "languages_spoken": staff.languages_spoken,
                    "availability_slots": staff_availability.count(),
                    "open_availability_slots": (active_availability.count()),
                    "active_booking_commitments": (active_booking_count),
                    "created_at": (
                        staff.created_at.isoformat() if staff.created_at else None
                    ),
                }
            )

        staff_summary = {
            "total_staff": staff_queryset.count(),
            "active_staff": staff_queryset.filter(is_active=True).count(),
            "available_staff": staff_queryset.filter(
                is_active=True,
                is_available=True,
            ).count(),
            "unavailable_staff": staff_queryset.filter(
                is_active=True,
                is_available=False,
            ).count(),
            "availability_slots": availability_queryset.count(),
            "open_slots": availability_queryset.filter(
                is_available=True,
                is_booked=False,
            ).count(),
            "booked_slots": availability_queryset.filter(is_booked=True).count(),
            "unassigned_shifts": booking_queryset.filter(
                status__in=["accepted", "confirmed"],
                assigned_staff__isnull=True,
            ).count(),
        }

        # =====================================================
        # SERVICE USERS
        # =====================================================

        service_user_queryset = ServiceUserProfile.objects.select_related(
            "managed_by", "linked_user"
        ).order_by("first_name", "last_name")

        service_user_items = []

        for service_user in service_user_queryset:
            service_user_items.append(
                {
                    "id": service_user.id,
                    "name": (service_user.full_name or "Unnamed service user"),
                    "first_name": service_user.first_name,
                    "last_name": service_user.last_name,
                    "relationship_to_manager": (service_user.relationship_to_manager),
                    "managed_by": user_display_name(service_user.managed_by),
                    "managed_by_email": (
                        service_user.managed_by.email if service_user.managed_by else ""
                    ),
                    "linked_account": user_display_name(service_user.linked_user),
                    "linked_account_email": (
                        service_user.linked_user.email
                        if service_user.linked_user
                        else ""
                    ),
                    "has_linked_account": bool(service_user.linked_user_id),
                    "is_active": service_user.is_active,
                    "care_requirements": (service_user.care_requirements),
                    "medical_conditions": (service_user.medical_conditions),
                    "mobility_needs": (service_user.mobility_needs),
                    "communication_needs": (service_user.communication_needs),
                    "created_at": (
                        service_user.created_at.isoformat()
                        if service_user.created_at
                        else None
                    ),
                }
            )

        service_users_summary = {
            "total": service_user_queryset.count(),
            "active": service_user_queryset.filter(is_active=True).count(),
            "inactive": service_user_queryset.filter(is_active=False).count(),
            "managed_profiles": service_user_queryset.filter(
                managed_by__isnull=False
            ).count(),
            "linked_accounts": service_user_queryset.filter(
                linked_user__isnull=False
            ).count(),
        }

        # =====================================================
        # MATCHING
        # =====================================================

        match_queryset = Match.objects.select_related("user", "provider").order_by(
            "-created_at"
        )

        match_items = []

        for match in match_queryset:
            match_items.append(
                {
                    "id": str(match.id),
                    "user_id": match.user_id,
                    "user_name": user_display_name(match.user),
                    "user_email": (match.user.email if match.user else ""),
                    "provider_id": str(match.provider_id),
                    "provider_name": provider_display_name(match.provider),
                    "match_score": match.match_score,
                    "status": match.status,
                    "status_display": match.get_status_display(),
                    "created_at": (
                        match.created_at.isoformat() if match.created_at else None
                    ),
                    "updated_at": (
                        match.updated_at.isoformat() if match.updated_at else None
                    ),
                }
            )

        matching_summary = {
            "total": match_queryset.count(),
            "pending": match_queryset.filter(status="pending").count(),
            "accepted": match_queryset.filter(status="accepted").count(),
            "rejected": match_queryset.filter(status="rejected").count(),
            "completed": match_queryset.filter(status="completed").count(),
        }

        # =====================================================
        # RESPONSE
        # =====================================================

        return Response(
            {
                "providers": {
                    "summary": providers_summary,
                    "items": provider_items,
                },
                "bookings": {
                    "summary": booking_summary,
                    "items": booking_items,
                },
                "staff_capacity": {
                    "summary": staff_summary,
                    "items": staff_items,
                },
                "service_users": {
                    "summary": service_users_summary,
                    "items": service_user_items,
                },
                "matching": {
                    "summary": matching_summary,
                    "items": match_items,
                },
            }
        )


class AdminGovernanceView(APIView):
    """
    Platform administration data for the branded CareSphere
    Admin Workspace.

    Covers:
    - Trust & Verification
    - Reviews
    - Pricing
    - Communications
    - Notifications
    - Users
    """

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from django.db.models import Avg, Sum

        from apps.family.models import CommunicationThread
        from apps.notifications.models import Notification
        from apps.pricing.models import PricingTier
        from apps.trust_layer.models import Review, TrustVerification

        def user_display_name(user):
            if not user:
                return ""

            full_name = user.get_full_name().strip()

            return full_name or user.email or user.username

        def provider_display_name(provider):
            if not provider:
                return ""

            return (
                getattr(provider, "trading_name", "")
                or getattr(provider, "company_name", "")
                or "Unnamed provider"
            )

        # =========================================================
        # TRUST & VERIFICATION
        # =========================================================

        trust_queryset = (
            TrustVerification.objects.select_related(
                "provider",
                "provider__user",
                "verified_by",
            )
            .all()
            .order_by("-updated_at")
        )

        trust_summary = {
            "total": trust_queryset.count(),
            "pending": trust_queryset.filter(verification_status="pending").count(),
            "verified": trust_queryset.filter(verification_status="verified").count(),
            "expired": trust_queryset.filter(verification_status="expired").count(),
            "revoked": trust_queryset.filter(verification_status="revoked").count(),
            "failed": trust_queryset.filter(verification_status="failed").count(),
            "cqc_verified": trust_queryset.exclude(cqc_rating="Not Rated").count(),
            "dbs_verified": trust_queryset.filter(dbs_verified=True).count(),
            "insurance_verified": trust_queryset.filter(
                insurance_verified=True
            ).count(),
        }

        trust_items = []

        for verification in trust_queryset[:100]:
            provider = verification.provider

            trust_items.append(
                {
                    "id": verification.id,
                    "provider_id": str(provider.id),
                    "provider_name": provider_display_name(provider),
                    "provider_email": getattr(
                        provider,
                        "email",
                        "",
                    ),
                    "verification_status": verification.verification_status,
                    "verification_status_display": verification.get_verification_status_display(),
                    "overall_trust_score": verification.overall_trust_score,
                    "cqc_location_id": verification.cqc_location_id,
                    "cqc_rating": verification.cqc_rating,
                    "cqc_last_inspection": verification.cqc_last_inspection,
                    "dbs_verified": verification.dbs_verified,
                    "dbs_enhanced": verification.dbs_enhanced,
                    "dbs_expiry_date": verification.dbs_expiry_date,
                    "insurance_verified": verification.insurance_verified,
                    "insurance_provider": verification.insurance_provider,
                    "insurance_expiry_date": verification.insurance_expiry_date,
                    "gdpr_compliant": verification.gdpr_compliant,
                    "health_safety_certified": verification.health_safety_certified,
                    "iso_certified": verification.iso_certified,
                    "average_rating": str(verification.average_rating),
                    "total_reviews": verification.total_reviews,
                    "recommendation_rate": str(verification.recommendation_rate),
                    "verified_by": user_display_name(verification.verified_by),
                    "last_verified": verification.last_verified,
                    "verification_notes": verification.verification_notes,
                    "created_at": verification.created_at,
                    "updated_at": verification.updated_at,
                }
            )

        # =========================================================
        # REVIEWS
        # =========================================================

        reviews_queryset = (
            Review.objects.select_related(
                "provider",
                "author",
            )
            .all()
            .order_by("-created_at")
        )

        review_average = (
            reviews_queryset.aggregate(average=Avg("overall_rating"))["average"] or 0
        )

        reviews_summary = {
            "total": reviews_queryset.count(),
            "pending": reviews_queryset.filter(moderation_status="pending").count(),
            "approved": reviews_queryset.filter(moderation_status="approved").count(),
            "rejected": reviews_queryset.filter(moderation_status="rejected").count(),
            "flagged": reviews_queryset.filter(moderation_status="flagged").count(),
            "verified": reviews_queryset.filter(is_verified=True).count(),
            "featured": reviews_queryset.filter(is_featured=True).count(),
            "average_rating": round(
                float(review_average),
                2,
            ),
        }

        review_items = []

        for review in reviews_queryset[:100]:
            review_items.append(
                {
                    "id": str(review.id),
                    "provider_id": str(review.provider_id),
                    "provider_name": provider_display_name(review.provider),
                    "author_id": review.author_id,
                    "author_name": user_display_name(review.author),
                    "author_email": (
                        getattr(
                            review.author,
                            "email",
                            "",
                        )
                        if review.author
                        else ""
                    ),
                    "overall_rating": review.overall_rating,
                    "care_quality": review.care_quality,
                    "staff_attitude": review.staff_attitude,
                    "communication": review.communication,
                    "value_for_money": review.value_for_money,
                    "title": review.title,
                    "content": review.content,
                    "would_recommend": review.would_recommend,
                    "service_type": review.service_type,
                    "service_duration": review.service_duration,
                    "relationship": review.relationship,
                    "relationship_display": review.get_relationship_display(),
                    "is_verified": review.is_verified,
                    "is_featured": review.is_featured,
                    "moderation_status": review.moderation_status,
                    "moderation_status_display": review.get_moderation_status_display(),
                    "moderation_notes": review.moderation_notes,
                    "created_at": review.created_at,
                    "updated_at": review.updated_at,
                }
            )

        # =========================================================
        # PRICING
        # =========================================================

        pricing_queryset = (
            PricingTier.objects.select_related("provider")
            .all()
            .order_by(
                "provider__company_name",
                "name",
            )
        )

        average_hourly_rate = (
            pricing_queryset.aggregate(average=Avg("hourly_rate"))["average"] or 0
        )

        pricing_summary = {
            "total": pricing_queryset.count(),
            "active": pricing_queryset.filter(is_active=True).count(),
            "inactive": pricing_queryset.filter(is_active=False).count(),
            "average_hourly_rate": str(
                round(
                    average_hourly_rate,
                    2,
                )
            ),
        }

        pricing_items = []

        for tier in pricing_queryset[:100]:
            pricing_items.append(
                {
                    "id": str(tier.id),
                    "provider_id": str(tier.provider_id),
                    "provider_name": provider_display_name(tier.provider),
                    "name": tier.name,
                    "description": tier.description,
                    "hourly_rate": str(tier.hourly_rate),
                    "daily_rate": (
                        str(tier.daily_rate) if tier.daily_rate is not None else None
                    ),
                    "weekly_rate": (
                        str(tier.weekly_rate) if tier.weekly_rate is not None else None
                    ),
                    "is_active": tier.is_active,
                    "created_at": tier.created_at,
                    "updated_at": tier.updated_at,
                }
            )

        # =========================================================
        # COMMUNICATIONS
        # =========================================================

        communications_queryset = (
            CommunicationThread.objects.select_related(
                "care_circle",
                "care_circle__service_user",
                "started_by",
                "started_by__user",
            )
            .all()
            .order_by(
                "-last_message_at",
                "-created_at",
            )
        )

        message_total = (
            communications_queryset.aggregate(total=Sum("message_count"))["total"] or 0
        )

        communications_summary = {
            "total_threads": communications_queryset.count(),
            "active_threads": communications_queryset.filter(is_archived=False).count(),
            "archived_threads": communications_queryset.filter(
                is_archived=True
            ).count(),
            "locked_threads": communications_queryset.filter(is_locked=True).count(),
            "total_messages": message_total,
        }

        communication_items = []

        for thread in communications_queryset[:100]:
            service_user = (
                thread.care_circle.service_user if thread.care_circle else None
            )

            started_by_user = thread.started_by.user if thread.started_by else None

            communication_items.append(
                {
                    "id": str(thread.id),
                    "subject": thread.subject,
                    "care_circle_id": str(thread.care_circle_id),
                    "care_circle_name": thread.care_circle.name,
                    "service_user_id": (service_user.id if service_user else None),
                    "service_user_name": (
                        service_user.full_name if service_user else ""
                    ),
                    "started_by": user_display_name(started_by_user),
                    "started_by_email": (
                        started_by_user.email if started_by_user else ""
                    ),
                    "message_count": thread.message_count,
                    "is_locked": thread.is_locked,
                    "is_archived": thread.is_archived,
                    "last_message_at": thread.last_message_at,
                    "created_at": thread.created_at,
                    "updated_at": thread.updated_at,
                }
            )

        # =========================================================
        # NOTIFICATIONS
        # =========================================================

        notifications_queryset = (
            Notification.objects.select_related("recipient")
            .all()
            .order_by("-created_at")
        )

        notifications_summary = {
            "total": notifications_queryset.count(),
            "unread": notifications_queryset.filter(is_read=False).count(),
            "read": notifications_queryset.filter(is_read=True).count(),
            "information": notifications_queryset.filter(
                notification_type="info"
            ).count(),
            "success": notifications_queryset.filter(
                notification_type="success"
            ).count(),
            "warning": notifications_queryset.filter(
                notification_type="warning"
            ).count(),
            "error": notifications_queryset.filter(notification_type="error").count(),
        }

        notification_items = []

        for notification in notifications_queryset[:100]:
            notification_items.append(
                {
                    "id": str(notification.id),
                    "recipient_id": notification.recipient_id,
                    "recipient_name": user_display_name(notification.recipient),
                    "recipient_email": notification.recipient.email,
                    "title": notification.title,
                    "message": notification.message,
                    "notification_type": notification.notification_type,
                    "notification_type_display": notification.get_notification_type_display(),
                    "is_read": notification.is_read,
                    "link": notification.link,
                    "created_at": notification.created_at,
                }
            )

        # =========================================================
        # USERS
        # =========================================================

        users_queryset = User.objects.all().order_by("-date_joined")

        users_summary = {
            "total": users_queryset.count(),
            "active": users_queryset.filter(is_active=True).count(),
            "inactive": users_queryset.filter(is_active=False).count(),
            "family": users_queryset.filter(user_type="family").count(),
            "providers": users_queryset.filter(user_type="provider").count(),
            "administrators": users_queryset.filter(user_type="admin").count(),
            "staff_accounts": users_queryset.filter(is_staff=True).count(),
            "superusers": users_queryset.filter(is_superuser=True).count(),
            "verified": users_queryset.filter(is_verified=True).count(),
        }

        user_items = []

        for user in users_queryset[:100]:
            user_items.append(
                {
                    "id": user.id,
                    "username": user.username,
                    "name": user_display_name(user),
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "user_type": user.user_type,
                    "user_type_display": user.get_user_type_display(),
                    "is_verified": user.is_verified,
                    "is_active": user.is_active,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                    "date_joined": user.date_joined,
                    "last_login": user.last_login,
                }
            )

        return Response(
            {
                "trust": {
                    "summary": trust_summary,
                    "items": trust_items,
                },
                "reviews": {
                    "summary": reviews_summary,
                    "items": review_items,
                },
                "pricing": {
                    "summary": pricing_summary,
                    "items": pricing_items,
                },
                "communications": {
                    "summary": communications_summary,
                    "items": communication_items,
                },
                "notifications": {
                    "summary": notifications_summary,
                    "items": notification_items,
                },
                "users": {
                    "summary": users_summary,
                    "items": user_items,
                },
            }
        )
