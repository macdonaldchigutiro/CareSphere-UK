from rest_framework import (
    permissions,
    status,
    viewsets,
)

from rest_framework.decorators import action
from rest_framework.response import Response

from django.utils import timezone

from apps.care_providers.models import AvailabilitySlot, StaffMember
from apps.notifications.models import Notification
from apps.notifications.services import create_notification

from .models import Booking
from .serializers import BookingSerializer


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    # ======================================================
    # QUERYSET
    # ======================================================

    def get_queryset(self):
        user = self.request.user

        queryset = Booking.objects.select_related(
            "user",
            "provider",
            "provider__user",
            "service_user",
            "assigned_staff",
        ).order_by("-created_at")

        # Django administrators can see everything.
        if user.is_staff or user.is_superuser:
            return queryset

        # Provider accounts only see bookings
        # linked to their CareProvider profile.
        if user.user_type == "provider":
            try:
                provider = user.care_provider

                return queryset.filter(provider=provider)

            except Exception:
                return queryset.none()

        # Family accounts only see bookings
        # created by their account.
        return queryset.filter(user=user)

    # ======================================================
    # HELPERS
    # ======================================================

    def _booking_link(self):
        return "/bookings"

    def _provider_name(self, booking):
        return (
            booking.provider.company_name if booking.provider else "your care provider"
        )

    def _care_recipient_name(self, booking):
        if booking.service_user:
            return booking.service_user.full_name or "your care recipient"

        return booking.care_recipient_name or "your care recipient"

    def _provider_user(self, booking):
        if booking.provider and booking.provider.user:
            return booking.provider.user

        return None

    # ======================================================
    # CREATE BOOKING / CARE REQUEST
    # ======================================================

    def perform_create(
        self,
        serializer,
    ):
        booking = serializer.save(
            user=self.request.user,
            status=Booking.Status.PENDING,
        )

        provider_user = self._provider_user(booking)

        create_notification(
            recipient=provider_user,
            title="New care request",
            message=(
                f"You have received a new care request "
                f"for {self._care_recipient_name(booking)}."
            ),
            notification_type=(Notification.NotificationType.INFO),
            link=self._booking_link(),
        )

    # ======================================================
    # PROVIDER PERMISSION CHECK
    # ======================================================

    def _get_provider_booking(
        self,
        request,
        pk=None,
    ):
        """
        Return the booking only if the logged-in user
        is allowed to manage it as a provider.
        """

        user = request.user

        if user.is_staff or user.is_superuser:
            try:
                return Booking.objects.select_related(
                    "user",
                    "provider",
                    "provider__user",
                    "service_user",
                    "assigned_staff",
                ).get(pk=pk)

            except Booking.DoesNotExist:
                return None

        if user.user_type != "provider":
            return None

        try:
            provider = user.care_provider

        except Exception:
            return None

        try:
            return Booking.objects.select_related(
                "user",
                "provider",
                "provider__user",
                "service_user",
                "assigned_staff",
            ).get(
                pk=pk,
                provider=provider,
            )

        except Booking.DoesNotExist:
            return None

    # ======================================================
    # BOOKING OWNER PERMISSION CHECK
    # ======================================================

    def _get_owner_booking(
        self,
        request,
        pk=None,
    ):
        """
        Return the booking only if the logged-in user
        owns it, or is a Django administrator.
        """

        user = request.user

        if user.is_staff or user.is_superuser:
            try:
                return Booking.objects.select_related(
                    "user",
                    "provider",
                    "provider__user",
                    "service_user",
                    "assigned_staff",
                ).get(pk=pk)

            except Booking.DoesNotExist:
                return None

        try:
            return Booking.objects.select_related(
                "user",
                "provider",
                "provider__user",
                "service_user",
                "assigned_staff",
            ).get(
                pk=pk,
                user=user,
            )

        except Booking.DoesNotExist:
            return None

    # ======================================================
    # STAFF AVAILABILITY HELPERS
    # ======================================================

    def _staff_has_booking_conflict(
        self,
        booking,
        staff_member,
    ):
        """
        Return True when the staff member already has another
        active booking that overlaps this booking.
        """

        if not booking.start_time or not booking.end_time:
            return False

        active_statuses = [
            Booking.Status.ACCEPTED,
            Booking.Status.CONFIRMED,
            Booking.Status.IN_PROGRESS,
        ]

        return (
            Booking.objects.filter(
                assigned_staff=staff_member,
                status__in=active_statuses,
                start_time__lt=booking.end_time,
                end_time__gt=booking.start_time,
            )
            .exclude(
                pk=booking.pk,
            )
            .exists()
        )

    def _availability_occurs_on_date(
        self,
        slot,
        target_date,
    ):
        """
        Return True when this availability slot applies to target_date.

        Supported recurrence:
        - none
        - daily
        - weekly
        - bi_weekly
        - monthly

        The recurrence starts from slot.start_date and respects
        recurrence_end_date when one is set.
        """

        if target_date < slot.start_date:
            return False

        if slot.end_date and target_date > slot.end_date:
            return False

        if slot.recurrence_end_date and target_date > slot.recurrence_end_date:
            return False

        if not slot.is_recurring:
            return target_date == slot.start_date

        recurrence_type = slot.recurrence_type or "none"

        if recurrence_type == "none":
            return target_date == slot.start_date

        days_since_start = (target_date - slot.start_date).days

        if recurrence_type == "daily":
            return days_since_start >= 0

        if recurrence_type == "weekly":
            return days_since_start >= 0 and days_since_start % 7 == 0

        if recurrence_type == "bi_weekly":
            return days_since_start >= 0 and days_since_start % 14 == 0

        if recurrence_type == "monthly":
            if target_date.day != slot.start_date.day:
                return False

            months_since_start = (
                (target_date.year - slot.start_date.year) * 12
                + target_date.month
                - slot.start_date.month
            )

            return months_since_start >= 0

        return False

    def _staff_has_covering_availability(
        self,
        booking,
        staff_member,
    ):
        """
        Check whether one saved availability slot fully covers
        the requested booking period.

        Recurring slots are expanded logically from their
        stored start date, so providers do not need to create
        a separate slot for every recurrence.
        """

        if not booking.start_time or not booking.end_time:
            return False

        booking_start = booking.start_time
        booking_end = booking.end_time

        if timezone.is_naive(booking_start):
            booking_start = timezone.make_aware(
                booking_start,
                timezone.get_current_timezone(),
            )

        if timezone.is_naive(booking_end):
            booking_end = timezone.make_aware(
                booking_end,
                timezone.get_current_timezone(),
            )

        booking_start = timezone.localtime(booking_start)

        booking_end = timezone.localtime(booking_end)

        slots = AvailabilitySlot.objects.filter(
            provider=booking.provider,
            staff_member=staff_member,
            is_available=True,
            is_booked=False,
        ).order_by(
            "start_date",
            "start_time",
        )

        for slot in slots:
            target_date = booking_start.date()

            if not self._availability_occurs_on_date(
                slot,
                target_date,
            ):
                continue

            slot_start = timezone.datetime.combine(
                target_date,
                slot.start_time,
            )

            slot_end_date = target_date

            # Support overnight availability such as 22:00 -> 07:00.
            if slot.end_time <= slot.start_time:
                slot_end_date = target_date + timezone.timedelta(days=1)

            slot_end = timezone.datetime.combine(
                slot_end_date,
                slot.end_time,
            )

            if timezone.is_naive(slot_start):
                slot_start = timezone.make_aware(
                    slot_start,
                    timezone.get_current_timezone(),
                )

            if timezone.is_naive(slot_end):
                slot_end = timezone.make_aware(
                    slot_end,
                    timezone.get_current_timezone(),
                )

            if slot_start <= booking_start and slot_end >= booking_end:
                return True

        return False

    # ======================================================
    # ACCEPT ENQUIRY
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="accept",
    )
    def accept(
        self,
        request,
        pk=None,
    ):
        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {
                    "detail": (
                        "You do not have permission " "to accept this care request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.PENDING:
            return Response(
                {"detail": ("Only pending care requests " "can be accepted.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.ACCEPTED

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        create_notification(
            recipient=booking.user,
            title="Care request accepted",
            message=(
                f"{self._provider_name(booking)} "
                f"has accepted the care request for "
                f"{self._care_recipient_name(booking)}."
            ),
            notification_type=(Notification.NotificationType.SUCCESS),
            link=self._booking_link(),
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Care request accepted successfully."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # DECLINE ENQUIRY
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="decline",
    )
    def decline(
        self,
        request,
        pk=None,
    ):
        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {
                    "detail": (
                        "You do not have permission " "to decline this care request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.PENDING:
            return Response(
                {"detail": ("Only pending care requests " "can be declined.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.DECLINED

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        create_notification(
            recipient=booking.user,
            title="Care request declined",
            message=(
                f"{self._provider_name(booking)} "
                f"has declined the care request for "
                f"{self._care_recipient_name(booking)}."
            ),
            notification_type=(Notification.NotificationType.WARNING),
            link=self._booking_link(),
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Care request declined."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # ASSIGN STAFF
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="assign-staff",
    )
    def assign_staff(
        self,
        request,
        pk=None,
    ):
        """
        Assign one of the provider's active and available staff
        members to an accepted booking.

        Expected body:
        {
            "staff_member": "<staff UUID>"
        }

        Send null/blank to remove an assignment before confirmation.
        """

        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {
                    "detail": (
                        "You do not have permission " "to assign staff to this booking."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.ACCEPTED:
            return Response(
                {"detail": ("Staff can only be assigned " "to an accepted booking.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff_member_id = request.data.get("staff_member")

        # --------------------------------------------------
        # REMOVE CURRENT ASSIGNMENT
        # --------------------------------------------------

        if staff_member_id in [
            None,
            "",
        ]:
            booking.assigned_staff = None

            booking.save(
                update_fields=[
                    "assigned_staff",
                    "updated_at",
                ]
            )

            serializer = self.get_serializer(booking)

            return Response(
                {
                    "message": ("Staff assignment removed successfully."),
                    "booking": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        # --------------------------------------------------
        # VALIDATE BOOKING TIME
        # --------------------------------------------------

        if not booking.start_time or not booking.end_time:
            return Response(
                {
                    "detail": (
                        "This booking does not have a complete "
                        "start and end date/time. Please create "
                        "a new care request with both times."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.end_time <= booking.start_time:
            return Response(
                {
                    "detail": (
                        "The booking end time must be later " "than the start time."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # FIND STAFF MEMBER
        # --------------------------------------------------

        try:
            staff_member = StaffMember.objects.get(
                pk=staff_member_id,
                provider=booking.provider,
                is_active=True,
            )

        except (
            StaffMember.DoesNotExist,
            ValueError,
        ):
            return Response(
                {
                    "detail": (
                        "The selected staff member does not exist, "
                        "is inactive, or does not belong to this provider."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not staff_member.is_available:
            return Response(
                {
                    "detail": (
                        f"{staff_member.full_name} is currently "
                        "marked as unavailable."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # AVAILABILITY SLOT CHECK
        # --------------------------------------------------

        if not self._staff_has_covering_availability(
            booking,
            staff_member,
        ):
            return Response(
                {
                    "detail": (
                        f"{staff_member.full_name} is not available "
                        "for the requested booking period."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # DOUBLE-BOOKING CHECK
        # --------------------------------------------------

        if self._staff_has_booking_conflict(
            booking,
            staff_member,
        ):
            return Response(
                {
                    "detail": (
                        f"{staff_member.full_name} already has another "
                        "active booking during this period."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # ASSIGN STAFF
        # --------------------------------------------------

        booking.assigned_staff = staff_member

        booking.save(
            update_fields=[
                "assigned_staff",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": (
                    f"{staff_member.full_name} " "has been assigned successfully."
                ),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # STAFF OPTIONS FOR BOOKING
    # ======================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="staff-options",
    )
    def staff_options(
        self,
        request,
        pk=None,
    ):
        """
        Return this provider's active staff ranked by whether
        they can take the requested booking period.

        This endpoint is provider-only and uses the same
        availability/conflict rules as staff assignment,
        including recurring availability.
        """

        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to view staff options for this booking."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.ACCEPTED:
            return Response(
                {
                    "detail": (
                        "Staff options are available only " "for accepted bookings."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff_members = StaffMember.objects.filter(
            provider=booking.provider,
            is_active=True,
        ).order_by(
            "first_name",
            "last_name",
        )

        options = []

        for staff_member in staff_members:
            can_assign = True
            reason = "Requested time fits available schedule"

            if not staff_member.is_available:
                can_assign = False
                reason = "Marked unavailable"

            elif not booking.start_time or not booking.end_time:
                can_assign = False
                reason = "Booking time is incomplete"

            elif not self._staff_has_covering_availability(
                booking,
                staff_member,
            ):
                can_assign = False
                reason = "Outside saved availability"

            elif self._staff_has_booking_conflict(
                booking,
                staff_member,
            ):
                can_assign = False
                reason = "Conflicts with an existing booking"

            options.append(
                {
                    "id": str(staff_member.id),
                    "full_name": staff_member.full_name,
                    "role": staff_member.get_role_display(),
                    "role_value": staff_member.role,
                    "is_available": staff_member.is_available,
                    "can_assign": can_assign,
                    "reason": reason,
                    "is_currently_assigned": (
                        booking.assigned_staff_id == staff_member.id
                    ),
                }
            )

        options.sort(
            key=lambda item: (
                not item["can_assign"],
                item["full_name"].lower(),
            )
        )

        return Response(
            {
                "booking_id": str(booking.id),
                "staff_options": options,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # CONFIRM BOOKING
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm",
    )
    def confirm(
        self,
        request,
        pk=None,
    ):
        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {"detail": ("You do not have permission " "to confirm this booking.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.ACCEPTED:
            return Response(
                {"detail": ("Only accepted care requests " "can be confirmed.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not booking.assigned_staff:
            return Response(
                {
                    "detail": (
                        "Please assign a staff member "
                        "before confirming this booking."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not booking.assigned_staff.is_active:
            return Response(
                {
                    "detail": (
                        "The assigned staff member is inactive. "
                        "Please assign another staff member."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not booking.assigned_staff.is_available:
            return Response(
                {
                    "detail": (
                        "The assigned staff member is currently "
                        "marked as unavailable."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not self._staff_has_covering_availability(
            booking,
            booking.assigned_staff,
        ):
            return Response(
                {
                    "detail": (
                        f"{booking.assigned_staff.full_name} is no longer "
                        "available for the requested booking period."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if self._staff_has_booking_conflict(
            booking,
            booking.assigned_staff,
        ):
            return Response(
                {
                    "detail": (
                        f"{booking.assigned_staff.full_name} already has "
                        "another active booking during this period."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CONFIRMED

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        create_notification(
            recipient=booking.user,
            title="Booking confirmed",
            message=(
                f"Your care booking with "
                f"{self._provider_name(booking)} "
                f"for {self._care_recipient_name(booking)} "
                f"has been confirmed."
            ),
            notification_type=(Notification.NotificationType.SUCCESS),
            link=self._booking_link(),
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Booking confirmed successfully."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # START CARE
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="start",
    )
    def start(
        self,
        request,
        pk=None,
    ):
        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {"detail": ("You do not have permission " "to start this booking.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.CONFIRMED:
            return Response(
                {"detail": ("Only confirmed bookings " "can be started.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.IN_PROGRESS

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        create_notification(
            recipient=booking.user,
            title="Care started",
            message=(
                f"Care for "
                f"{self._care_recipient_name(booking)} "
                f"with {self._provider_name(booking)} "
                f"is now in progress."
            ),
            notification_type=(Notification.NotificationType.INFO),
            link=self._booking_link(),
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Care visit started successfully."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # COMPLETE CARE
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="complete",
    )
    def complete(
        self,
        request,
        pk=None,
    ):
        booking = self._get_provider_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {"detail": ("You do not have permission " "to complete this booking.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.IN_PROGRESS:
            return Response(
                {
                    "detail": (
                        "Only bookings currently " "in progress can be completed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.COMPLETED

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        create_notification(
            recipient=booking.user,
            title="Care completed",
            message=(
                f"Care for "
                f"{self._care_recipient_name(booking)} "
                f"with {self._provider_name(booking)} "
                f"has been completed."
            ),
            notification_type=(Notification.NotificationType.SUCCESS),
            link=self._booking_link(),
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Care booking completed successfully."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # CANCEL BOOKING
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="cancel",
    )
    def cancel(
        self,
        request,
        pk=None,
    ):
        booking = self._get_owner_booking(
            request,
            pk,
        )

        if booking is None:
            return Response(
                {"detail": ("You do not have permission " "to cancel this booking.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_statuses = [
            Booking.Status.PENDING,
            Booking.Status.ACCEPTED,
            Booking.Status.CONFIRMED,
        ]

        if booking.status not in allowed_statuses:
            return Response(
                {"detail": ("This booking can no longer " "be cancelled.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CANCELLED

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        provider_user = self._provider_user(booking)

        create_notification(
            recipient=provider_user,
            title="Booking cancelled",
            message=(
                f"The care booking for "
                f"{self._care_recipient_name(booking)} "
                f"has been cancelled."
            ),
            notification_type=(Notification.NotificationType.WARNING),
            link=self._booking_link(),
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Booking cancelled successfully."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
