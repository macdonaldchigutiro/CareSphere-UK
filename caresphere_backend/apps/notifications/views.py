from rest_framework import (
    permissions,
    status,
    viewsets,
)

from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    # ======================================================
    # QUERYSET
    # ======================================================

    def get_queryset(self):
        return (
            Notification.objects.select_related(
                "recipient",
            )
            .filter(
                recipient=self.request.user,
            )
            .order_by("-created_at")
        )

    # ======================================================
    # UNREAD COUNT
    # ======================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="unread-count",
    )
    def unread_count(
        self,
        request,
    ):
        count = (
            self.get_queryset()
            .filter(
                is_read=False,
            )
            .count()
        )

        return Response(
            {
                "unread_count": count,
            },
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # MARK ONE AS READ
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-read",
    )
    def mark_read(
        self,
        request,
        pk=None,
    ):
        notification = self.get_object()

        if not notification.is_read:
            notification.is_read = True

            notification.save(
                update_fields=[
                    "is_read",
                ]
            )

        serializer = self.get_serializer(notification)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # MARK ONE AS UNREAD
    # ======================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-unread",
    )
    def mark_unread(
        self,
        request,
        pk=None,
    ):
        notification = self.get_object()

        if notification.is_read:
            notification.is_read = False

            notification.save(
                update_fields=[
                    "is_read",
                ]
            )

        serializer = self.get_serializer(notification)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ======================================================
    # MARK ALL AS READ
    # ======================================================

    @action(
        detail=False,
        methods=["post"],
        url_path="mark-all-read",
    )
    def mark_all_read(
        self,
        request,
    ):
        updated = (
            self.get_queryset()
            .filter(
                is_read=False,
            )
            .update(
                is_read=True,
            )
        )

        return Response(
            {
                "message": ("All notifications marked as read."),
                "updated": updated,
            },
            status=status.HTTP_200_OK,
        )
