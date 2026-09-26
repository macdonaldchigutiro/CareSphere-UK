import logging

import requests
from django.conf import settings
from django.core import signing
from django.core.mail import send_mail


logger = logging.getLogger(__name__)
TOKEN_SALT = "caresphere.password-reset"


def make_password_reset_token(user):
    return signing.dumps(
        {
            "user_id": user.pk,
            "email": user.email,
            "password_hash": user.password,
        },
        salt=TOKEN_SALT,
        compress=True,
    )


def send_password_reset_email(user):
    token = make_password_reset_token(user)
    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    subject = "Reset your CareSphere UK password"
    message = (
        f"Hello {user.first_name or 'there'},\n\n"
        "We received a request to reset your CareSphere UK password. "
        "Open this secure link to choose a new password:\n"
        f"{reset_url}\n\n"
        "This link expires in one hour and can only be used once. If you did "
        "not request this reset, you can ignore this message."
    )

    if settings.RESEND_API_KEY:
        response = requests.post(
            settings.RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.RESEND_FROM_EMAIL,
                "to": [user.email],
                "subject": subject,
                "text": message,
            },
            timeout=settings.RESEND_TIMEOUT,
        )
        response.raise_for_status()
        return True

    return send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email_safely(user):
    try:
        return bool(send_password_reset_email(user))
    except Exception:
        logger.exception("Unable to send password reset email for user %s", user.pk)
        return False
