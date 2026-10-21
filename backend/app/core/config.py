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

    # Photos are resized so the longest edge is at most this many pixels.
    photo_max_edge: int = 1600
    thumbnail_max_edge: int = 320
    photo_jpeg_quality: int = 85
    max_upload_bytes: int = 25 * 1024 * 1024

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
