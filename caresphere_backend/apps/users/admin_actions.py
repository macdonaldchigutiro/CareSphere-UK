from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.care_providers.models import CareProvider
from apps.family.models import CommunicationThread
from apps.notifications.models import Notification
from apps.pricing.models import PricingTier
from apps.trust_layer.models import Review, TrustVerification

from .models import User
from .views import IsPlatformAdmin


class ProviderVerificationActionView(APIView):
    """
    Platform-admin controls for provider verification.

    Supported actions:
    - verify
    - reject
    - suspend
    - pending
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, provider_id):
        provider = get_object_or_404(
            CareProvider,
            id=provider_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        notes = str(request.data.get("notes", "")).strip()

        allowed_actions = {
            "verify",
            "reject",
            "suspend",
            "pending",
        }

        if action not in allowed_actions:
            return Response(
                {"detail": ("Invalid provider verification action.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "verify":
            provider.is_verified = True
            provider.verification_status = "verified"
            provider.verification_date = timezone.now()
            provider.verified_by = request.user
            provider.verification_notes = notes
            provider.rejection_reason = ""

        elif action == "reject":
            provider.is_verified = False
            provider.verification_status = "rejected"
            provider.verification_date = None
            provider.verified_by = request.user
            provider.rejection_reason = notes
            provider.verification_notes = notes

        elif action == "suspend":
            provider.is_verified = False
            provider.verification_status = "suspended"
            provider.verified_by = request.user
            provider.verification_notes = notes

        elif action == "pending":
            provider.is_verified = False
            provider.verification_status = "pending"
            provider.verification_date = None
            provider.verified_by = None
            provider.verification_notes = notes
            provider.rejection_reason = ""

        provider.save(
            update_fields=[
                "is_verified",
                "verification_status",
                "verification_date",
                "verified_by",
                "verification_notes",
                "rejection_reason",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Provider verification updated.",
                "provider_id": str(provider.id),
                "is_verified": provider.is_verified,
                "verification_status": provider.verification_status,
            }
        )


class TrustVerificationActionView(APIView):
    """
    Platform-admin controls for TrustVerification records.

    Supported actions:
    - verify
    - pending
    - expire
    - revoke
    - fail
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, verification_id):
        verification = get_object_or_404(
            TrustVerification,
            id=verification_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        notes = str(request.data.get("notes", "")).strip()

        status_map = {
            "verify": "verified",
            "pending": "pending",
            "expire": "expired",
            "revoke": "revoked",
            "fail": "failed",
        }

        if action not in status_map:
            return Response(
                {"detail": ("Invalid trust verification action.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification.verification_status = status_map[action]

        verification.verification_notes = notes

        if action == "verify":
            verification.last_verified = timezone.now()
            verification.verified_by = request.user

        verification.save()

        return Response(
            {
                "detail": "Trust verification updated.",
                "verification_id": verification.id,
                "verification_status": verification.verification_status,
                "overall_trust_score": verification.overall_trust_score,
            }
        )


class ReviewModerationActionView(APIView):
    """
    Platform-admin review moderation.

    Supported actions:
    - approve
    - reject
    - flag
    - pending

    Optional fields:
    - notes
    - is_verified
    - is_featured
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, review_id):
        review = get_object_or_404(
            Review,
            id=review_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        status_map = {
            "approve": "approved",
            "reject": "rejected",
            "flag": "flagged",
            "pending": "pending",
        }

        if action not in status_map:
            return Response(
                {"detail": ("Invalid review moderation action.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review.moderation_status = status_map[action]

        if "notes" in request.data:
            review.moderation_notes = str(request.data.get("notes") or "").strip()

        if "is_verified" in request.data:
            review.is_verified = bool(request.data.get("is_verified"))

        if "is_featured" in request.data:
            review.is_featured = bool(request.data.get("is_featured"))

        review.save()

        return Response(
            {
                "detail": "Review moderation updated.",
                "review_id": str(review.id),
                "moderation_status": review.moderation_status,
                "is_verified": review.is_verified,
                "is_featured": review.is_featured,
            }
        )


class PricingTierStatusActionView(APIView):
    """
    Activate or deactivate a provider pricing tier.
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, tier_id):
        tier = get_object_or_404(
            PricingTier,
            id=tier_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        if action not in {
            "activate",
            "deactivate",
        }:
            return Response(
                {"detail": ("Action must be activate " "or deactivate.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tier.is_active = action == "activate"
        tier.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Pricing tier status updated.",
                "tier_id": str(tier.id),
                "is_active": tier.is_active,
            }
        )


class CommunicationThreadActionView(APIView):
    """
    Administrative thread controls.

    Supported actions:
    - lock
    - unlock
    - archive
    - unarchive
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, thread_id):
        thread = get_object_or_404(
            CommunicationThread,
            id=thread_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        if action == "lock":
            thread.is_locked = True

        elif action == "unlock":
            thread.is_locked = False

        elif action == "archive":
            thread.is_archived = True

        elif action == "unarchive":
            thread.is_archived = False

        else:
            return Response(
                {"detail": ("Invalid communication action.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        thread.save(
            update_fields=[
                "is_locked",
                "is_archived",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Communication thread updated.",
                "thread_id": str(thread.id),
                "is_locked": thread.is_locked,
                "is_archived": thread.is_archived,
            }
        )


class AdminNotificationActionView(APIView):
    """
    Mark any platform notification read or unread.
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            id=notification_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        if action == "read":
            notification.is_read = True

        elif action == "unread":
            notification.is_read = False

        else:
            return Response(
                {"detail": ("Action must be read or unread.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notification.save(update_fields=["is_read"])

        return Response(
            {
                "detail": "Notification updated.",
                "notification_id": str(notification.id),
                "is_read": notification.is_read,
            }
        )


class AdminUserStatusActionView(APIView):
    """
    Platform-admin account activation controls.

    Supported actions:
    - activate
    - deactivate

    Safety:
    - administrators cannot deactivate themselves
    - the final active superuser cannot be deactivated
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, user_id):
        target_user = get_object_or_404(
            User,
            id=user_id,
        )

        action = str(request.data.get("action", "")).strip().lower()

        if action not in {
            "activate",
            "deactivate",
        }:
            return Response(
                {"detail": ("Action must be activate " "or deactivate.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "deactivate" and target_user.id == request.user.id:
            return Response(
                {"detail": ("You cannot deactivate " "your own account.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "deactivate" and target_user.is_superuser:
            active_superusers = (
                User.objects.filter(
                    is_superuser=True,
                    is_active=True,
                )
                .exclude(id=target_user.id)
                .count()
            )

            if active_superusers == 0:
                return Response(
                    {
                        "detail": (
                            "The final active superuser " "cannot be deactivated."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        target_user.is_active = action == "activate"

        target_user.save(update_fields=["is_active"])

        return Response(
            {
                "detail": "User account status updated.",
                "user_id": target_user.id,
                "is_active": target_user.is_active,
            }
        )


class AdminMatchStatusActionView(APIView):
    """
    Platform-admin control for CareSphere match status.

    Allowed actions:
    - pending
    - accept
    - reject
    - complete
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, match_id):
        from apps.matching.models import Match

        try:
            match = Match.objects.get(pk=match_id)
        except Match.DoesNotExist:
            return Response(
                {"detail": "Match not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = str(request.data.get("action", "")).strip().lower()

        status_map = {
            "pending": "pending",
            "accept": "accepted",
            "reject": "rejected",
            "complete": "completed",
        }

        if action not in status_map:
            return Response(
                {
                    "detail": (
                        "Invalid action. Use pending, " "accept, reject or complete."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = status_map[action]

        # Keep the lifecycle sensible.
        if action == "complete" and match.status != "accepted":
            return Response(
                {"detail": ("Only an accepted match can " "be marked completed.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match.status = new_status
        match.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "detail": "Match status updated successfully.",
                "id": str(match.id),
                "status": match.status,
            },
            status=status.HTTP_200_OK,
        )
