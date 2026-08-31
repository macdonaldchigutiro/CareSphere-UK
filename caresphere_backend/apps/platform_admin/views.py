from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.care_providers.models import (
    AvailabilitySlot,
    CareProvider,
    StaffMember,
)
from apps.matching.models import Match
from apps.notifications.models import Notification
from apps.pricing.models import PricingTier
from apps.service_users.models import (
    ServiceUserProfile,
)
from apps.trust_layer.models import (
    Review,
    TrustVerification,
)
from apps.users.models import User

from .permissions import IsPlatformAdmin


class AdminDashboardView(APIView):
    """
    CareSphere platform-level operational dashboard.

    This endpoint intentionally aggregates platform
    information server-side so the admin frontend
    does not need to call many unrelated APIs.
    """

    permission_classes = [
        IsPlatformAdmin,
    ]

    def get(
        self,
        request,
    ):
        now = timezone.now()

        next_24_hours = now + timedelta(hours=24)

        # ==================================================
        # USERS
        # ==================================================

        total_users = User.objects.count()

        family_users = User.objects.filter(
            user_type="family",
        ).count()

        provider_accounts = User.objects.filter(
            user_type="provider",
        ).count()

        admin_accounts = User.objects.filter(
            user_type="admin",
        ).count()

        # ==================================================
        # PROVIDERS
        # ==================================================

        total_providers = CareProvider.objects.count()

        verified_providers = CareProvider.objects.filter(
            is_verified=True,
        ).count()

        providers_awaiting_verification = CareProvider.objects.filter(
            is_verified=False,
        ).count()

        accepting_clients = CareProvider.objects.filter(
            is_accepting_clients=True,
        ).count()

        # ==================================================
        # CARE RECIPIENTS / STAFF
        # ==================================================

        total_service_users = ServiceUserProfile.objects.count()

        total_staff = StaffMember.objects.count()

        active_staff = StaffMember.objects.filter(
            is_active=True,
        ).count()

        available_staff = StaffMember.objects.filter(
            is_active=True,
            is_available=True,
        ).count()

        available_slots = AvailabilitySlot.objects.filter(
            is_available=True,
            is_booked=False,
        ).count()

        # ==================================================
        # BOOKINGS
        # ==================================================

        total_bookings = Booking.objects.count()

        pending_bookings = Booking.objects.filter(
            status=Booking.Status.PENDING,
        ).count()

        accepted_bookings = Booking.objects.filter(
            status=Booking.Status.ACCEPTED,
        ).count()

        confirmed_bookings = Booking.objects.filter(
            status=Booking.Status.CONFIRMED,
        ).count()

        in_progress_bookings = Booking.objects.filter(
            status=Booking.Status.IN_PROGRESS,
        ).count()

        completed_bookings = Booking.objects.filter(
            status=Booking.Status.COMPLETED,
        ).count()

        active_bookings = Booking.objects.filter(
            status__in=[
                Booking.Status.ACCEPTED,
                Booking.Status.CONFIRMED,
                Booking.Status.IN_PROGRESS,
            ]
        ).count()

        unassigned_queryset = Booking.objects.filter(
            status=Booking.Status.ACCEPTED,
            assigned_staff__isnull=True,
        )

        unassigned_shifts = unassigned_queryset.count()

        overdue_unassigned = unassigned_queryset.filter(
            start_time__lt=now,
        ).count()

        urgent_unassigned = unassigned_queryset.filter(
            start_time__gte=now,
            start_time__lte=next_24_hours,
        ).count()

        # ==================================================
        # MATCHING / NOTIFICATIONS / GOVERNANCE
        # ==================================================

        pending_matches = Match.objects.filter(
            status="pending",
        ).count()

        unread_notifications = Notification.objects.filter(
            is_read=False,
        ).count()

        trust_verifications = TrustVerification.objects.count()

        reviews = Review.objects.count()

        pricing_tiers = PricingTier.objects.count()

        # ==================================================
        # BOOKING STATUS DISTRIBUTION
        # ==================================================

        booking_status_distribution = {
            "pending": pending_bookings,
            "accepted": accepted_bookings,
            "confirmed": confirmed_bookings,
            "in_progress": in_progress_bookings,
            "completed": completed_bookings,
            "cancelled": (
                Booking.objects.filter(
                    status=Booking.Status.CANCELLED,
                ).count()
            ),
            "declined": (
                Booking.objects.filter(
                    status=Booking.Status.DECLINED,
                ).count()
            ),
        }

        # ==================================================
        # RECENT BOOKINGS
        # ==================================================

        recent_bookings_queryset = Booking.objects.select_related(
            "provider",
            "service_user",
            "assigned_staff",
            "user",
        ).order_by("-created_at")[:6]

        recent_bookings = []

        for booking in recent_bookings_queryset:
            recipient_name = (
                booking.service_user.full_name
                if booking.service_user
                else booking.care_recipient_name
            )

            recent_bookings.append(
                {
                    "id": str(booking.id),
                    "recipient_name": (recipient_name or "Care recipient"),
                    "provider_name": (
                        booking.provider.company_name
                        if booking.provider
                        else "No provider"
                    ),
                    "assigned_staff": (
                        booking.assigned_staff.full_name
                        if booking.assigned_staff
                        else None
                    ),
                    "care_type": (booking.care_type),
                    "status": (booking.status),
                    "status_display": (booking.get_status_display()),
                    "start_time": (booking.start_time),
                    "created_at": (booking.created_at),
                }
            )

        # ==================================================
        # RECENT PROVIDERS
        # ==================================================

        recent_provider_queryset = CareProvider.objects.order_by("-created_at")[:5]

        recent_providers = [
            {
                "id": str(provider.id),
                "company_name": (provider.company_name),
                "city": (provider.city),
                "is_verified": (provider.is_verified),
                "cqc_verified": (provider.cqc_verified),
                "is_accepting_clients": (provider.is_accepting_clients),
                "created_at": (provider.created_at),
            }
            for provider in recent_provider_queryset
        ]

        # ==================================================
        # ADMIN IDENTITY
        # ==================================================

        full_name = request.user.get_full_name().strip()

        administrator = {
            "id": request.user.id,
            "name": (full_name or request.user.email),
            "email": request.user.email,
            "is_staff": (request.user.is_staff),
            "is_superuser": (request.user.is_superuser),
        }

        # ==================================================
        # RESPONSE
        # ==================================================

        return Response(
            {
                "administrator": (administrator),
                "summary": {
                    "total_users": (total_users),
                    "family_users": (family_users),
                    "provider_accounts": (provider_accounts),
                    "admin_accounts": (admin_accounts),
                    "total_providers": (total_providers),
                    "verified_providers": (verified_providers),
                    "providers_awaiting_verification": (
                        providers_awaiting_verification
                    ),
                    "accepting_clients": (accepting_clients),
                    "total_service_users": (total_service_users),
                    "total_staff": (total_staff),
                    "active_staff": (active_staff),
                    "available_staff": (available_staff),
                    "available_slots": (available_slots),
                    "total_bookings": (total_bookings),
                    "pending_bookings": (pending_bookings),
                    "active_bookings": (active_bookings),
                    "unassigned_shifts": (unassigned_shifts),
                    "urgent_unassigned": (urgent_unassigned),
                    "overdue_unassigned": (overdue_unassigned),
                    "in_progress_bookings": (in_progress_bookings),
                    "completed_bookings": (completed_bookings),
                    "pending_matches": (pending_matches),
                    "unread_notifications": (unread_notifications),
                    "trust_verifications": (trust_verifications),
                    "reviews": reviews,
                    "pricing_tiers": (pricing_tiers),
                },
                "booking_status": (booking_status_distribution),
                "recent_bookings": (recent_bookings),
                "recent_providers": (recent_providers),
                "generated_at": now,
            },
            status=status.HTTP_200_OK,
        )
