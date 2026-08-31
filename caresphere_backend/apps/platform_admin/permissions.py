from rest_framework.permissions import (
    BasePermission,
)


class IsPlatformAdmin(BasePermission):
    """
    Restrict CareSphere platform administration
    endpoints to Django staff and superusers.

    Frontend checks are only for user experience.
    This permission is the real security boundary.
    """

    message = (
        "You do not have permission to access " "CareSphere platform administration."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        return bool(
            user and user.is_authenticated and (user.is_staff or user.is_superuser)
        )
