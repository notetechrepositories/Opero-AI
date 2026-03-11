import os
import smtplib
from email.message import EmailMessage


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Sends a password reset link to the user.
    Requires SMTP_* environment variables.
    """
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    if not smtp_host or not smtp_from:
        raise RuntimeError("SMTP is not configured (missing SMTP_HOST/SMTP_FROM).")

    msg = EmailMessage()
    msg["Subject"] = "Reset your VF AI Desk password"
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.set_content(
        "\n".join(
            [
                "We received a request to reset your password for VF AI Desk.",
                "",
                f"Reset link: {reset_link}",
                "",
                "If you didn’t request this, you can ignore this email.",
            ]
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if smtp_use_tls:
            server.starttls()
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
        server.send_message(msg)

