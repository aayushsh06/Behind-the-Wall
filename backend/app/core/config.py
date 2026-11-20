"""Application settings loaded from environment variables (prefix ``BTW_``)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BTW_", env_file=".env", extra="ignore")

    app_name: str = "Behind the Wall API"
    data_dir: Path = BACKEND_ROOT / "data"
    database_url: str | None = None
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # Built frontend to serve from this process when present (see app/spa.py).
    frontend_dist: Path = BACKEND_ROOT.parent / "frontend" / "dist"

    # Photos are resized so the longest edge is at most this many pixels.
    photo_max_edge: int = 1600
    thumbnail_max_edge: int = 320
    photo_jpeg_quality: int = 85
    max_upload_bytes: int = 25 * 1024 * 1024

    session_cookie_name: str = "btw_session"
    session_days: int = 30
    # Set true when served over HTTPS so the browser only sends the cookie securely.
    session_cookie_secure: bool = False
    # Create the demo logins on startup (see app/services/demo_accounts.py).
    demo_accounts: bool = True

    # Public address of the site, used in invitation links (e.g. https://example.com).
    # When empty, links use the address the request came in on.
    public_url: str = ""
    # Outgoing mail for invitations. When smtp_host is empty, invitations are not emailed
    # and the tradesperson sends the link from their own email app instead.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    # Minimum minutes between invitation emails to the same address from one sender.
    invite_resend_minutes: int = 10
    # Email confirmation links stop working after this many hours.
    verification_hours: int = 48
    # Minimum seconds between confirmation emails to one account.
    verification_resend_seconds: int = 60

    @property
    def photos_dir(self) -> Path:
        return self.data_dir / "photos"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{self.data_dir / 'behind_the_wall.db'}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
