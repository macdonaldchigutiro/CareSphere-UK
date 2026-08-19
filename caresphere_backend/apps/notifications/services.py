from .models import Notification


def create_notification(
    *,
    recipient,
    title,
    message,
    notification_type=Notification.NotificationType.INFO,
    link="",
):
    """
    Create a CareSphere notification for a user.

    This helper keeps notification creation consistent
    across bookings, Family Circles, verification,
    payments and future CareSphere modules.
    """

    if recipient is None:
        return None

    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        link=link,
    )
