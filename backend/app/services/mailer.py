"""Send invitation emails over SMTP when the server is configured for it.

Without ``BTW_SMTP_HOST`` nothing is sent; the app then hands the tradesperson an
invitation link to send from their own email app instead.
"""

import smtplib
from email.message import EmailMessage

from app.core.config import Settings


class MailError(RuntimeError):
    pass


class Mailer:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def configured(self) -> bool:
        return bool(self._settings.smtp_host and self._settings.smtp_from)

    def send(self, to: str, subject: str, body: str) -> None:
        if not self.configured:
            raise MailError("Email is not set up on this server")
        s = self._settings
        message = EmailMessage()
        message["From"] = s.smtp_from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        try:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as smtp:
                if s.smtp_starttls:
                    smtp.starttls()
                if s.smtp_username:
                    smtp.login(s.smtp_username, s.smtp_password)
                smtp.send_message(message)
        except (OSError, smtplib.SMTPException) as exc:
            raise MailError("The invitation email could not be sent") from exc
