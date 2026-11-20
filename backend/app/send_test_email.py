"""Check the email settings by sending one message.

    cd backend && .venv/bin/python -m app.send_test_email you@example.com

Reads the same BTW_SMTP_* settings as the app (environment or backend/.env).
"""

import sys

from app.core.config import get_settings
from app.services.mailer import Mailer, MailError


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    settings = get_settings()
    mailer = Mailer(settings)
    if not mailer.configured:
        print("BTW_SMTP_HOST and BTW_SMTP_FROM must be set (see backend/.env.example).")
        return 1
    to = sys.argv[1]
    try:
        mailer.send(
            to,
            "Behind the Wall email test",
            "Email is set up correctly. Confirmation and invitation emails will be delivered.\n",
        )
    except MailError as exc:
        cause = exc.__cause__
        print(f"Sending failed: {exc}. {type(cause).__name__}: {cause}" if cause else exc)
        return 1
    print(f"Sent a test email to {to} via {settings.smtp_host}:{settings.smtp_port}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
