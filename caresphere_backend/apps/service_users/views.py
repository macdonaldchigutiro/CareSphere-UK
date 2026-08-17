from django.db.models import Q

from rest_framework import (
    permissions,
    viewsets,
)

from .models import ServiceUserProfile
from .serializers import (
    ServiceUserProfileSerializer,
)


class ServiceUserProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceUserProfileSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    # ======================================================
    # QUERYSET
    # ======================================================

    def get_queryset(self):
        user = self.request.user

        queryset = ServiceUserProfile.objects.select_related(
            "managed_by",
            "linked_user",
        ).order_by(
            "first_name",
            "last_name",
        )

        # --------------------------------------------------
        # ADMINS
        # --------------------------------------------------

        if user.is_staff or user.is_superuser:
            return queryset

        # --------------------------------------------------
        # NORMAL USERS
        # --------------------------------------------------
        #
        # A user may see a care recipient if:
        #
        # 1. They directly manage that person, OR
        # 2. They are an active member of that person's
        #    Family Circle.
        #
        # This allows authorised family members to access
        # the recipient through Family Circle collaboration,
        # while keeping unrelated users blocked.
        # --------------------------------------------------

        return queryset.filter(
            Q(managed_by=user)
            | Q(
                care_circle__members__user=user,
                care_circle__members__is_active=True,
            )
        ).distinct()

    # ======================================================
    # CREATE
    # ======================================================

    def perform_create(
        self,
        serializer,
    ):
        serializer.save(managed_by=self.request.user)
