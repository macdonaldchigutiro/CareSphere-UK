from rest_framework import (
    permissions,
    status,
    viewsets,
)

from rest_framework.decorators import action
from rest_framework.response import Response

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
        ).order_by("-created_at")

        # Django administrators can see everything.
        if user.is_staff or user.is_superuser:
            return queryset

        # Provider accounts only see enquiries/bookings
        # linked to their own CareProvider profile.
        if user.user_type == "provider":
            try:
                provider = user.care_provider

                return queryset.filter(provider=provider)
            except Exception:
                return queryset.none()

        # Family / individual accounts only see
        # their own bookings.
        return queryset.filter(user=user)

    # ======================================================
    # CREATE BOOKING / CARE REQUEST
    # ======================================================

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            status=Booking.Status.PENDING,
        )

    # ======================================================
    # PROVIDER PERMISSION CHECK
    # ======================================================

    def _get_provider_booking(self, request, pk=None):
        """
        Returns the booking only if the logged-in user
        is allowed to manage it as a provider.
        """

        user = request.user

        # Admins can manage any booking.
        if user.is_staff or user.is_superuser:
            try:
                return Booking.objects.select_related(
                    "user",
                    "provider",
                ).get(pk=pk)
            except Booking.DoesNotExist:
                return None

        # Only provider accounts can accept/decline enquiries.
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
            ).get(
                pk=pk,
                provider=provider,
            )
        except Booking.DoesNotExist:
            return None

    # ======================================================
    # ACCEPT ENQUIRY
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="accept",
    )
    def accept(self, request, pk=None):
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
    def decline(self, request, pk=None):
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

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Care request declined."),
                "booking": serializer.data,
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
    def confirm(self, request, pk=None):
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

        booking.status = Booking.Status.CONFIRMED

        booking.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(booking)

        return Response(
            {
                "message": ("Booking confirmed successfully."),
                "booking": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
