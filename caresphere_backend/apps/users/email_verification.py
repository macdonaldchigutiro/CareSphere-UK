import logging

import requests
from django.conf import settings
from django.core import signing
from django.core.mail import send_mail


logger = logging.getLogger(__name__)
TOKEN_SALT = "caresphere.email-verification"


def make_verification_token(user):
    return signing.dumps(
        {"user_id": user.pk, "email": user.email},
        salt=TOKEN_SALT,
        compress=True,
    )


def send_verification_email(user):
    token = make_verification_token(user)
    verification_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    )
    subject = "Verify your CareSphere UK email"
    message = (
        f"Hello {user.first_name or 'there'},\n\n"
        "Please verify your CareSphere UK email address by opening this link:\n"
        f"{verification_url}\n\n"
        "This link expires in 24 hours. If you did not create this account, "
        "you can ignore this message."
    )

    # Render free services block outbound SMTP. Use Resend's HTTPS API when a
    # key is configured, while retaining Django's email backend for local tests.
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


def send_verification_email_safely(user):
    try:
        return bool(send_verification_email(user))
    except Exception:
        logger.exception("Unable to send verification email for user %s", user.pk)
        return False
