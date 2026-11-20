"""Normalise uploaded images and store them in the database.

Every photo is re-encoded as JPEG, orientation-corrected from EXIF, and resized so
the longest edge is bounded. A small thumbnail is stored alongside for list views.

Photos saved by earlier versions as files under ``data/photos`` are still read from
there, so existing local records keep their pictures.
"""

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import PhotoFile

JPEG_CONTENT_TYPE = "image/jpeg"


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    width: int
    height: int


class PhotoStorage:
    def __init__(self, settings: Settings, session: Session) -> None:
        self._settings = settings
        self._session = session
        self._legacy_root = settings.photos_dir

    def _legacy_path(self, photo_id: str, thumbnail: bool = False) -> Path:
        return self._legacy_root / f"{photo_id}{'_thumb' if thumbnail else ''}.jpg"

    # ---- processing --------------------------------------------------------------

    def process(self, raw: bytes) -> ProcessedImage:
        return self._encode(raw, self._settings.photo_max_edge)

    def process_thumbnail(self, raw: bytes) -> ProcessedImage:
        return self._encode(raw, self._settings.thumbnail_max_edge)

    def _encode(self, raw: bytes, max_edge: int) -> ProcessedImage:
        try:
            image = Image.open(BytesIO(raw))
            image.load()
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("Uploaded file is not a readable image") from exc

        image = ImageOps.exif_transpose(image) or image
        image = image.convert("RGB")
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)

        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=self._settings.photo_jpeg_quality, optimize=True)
        return ProcessedImage(data=buffer.getvalue(), width=image.width, height=image.height)

    # ---- storage -----------------------------------------------------------------

    def save(self, photo_id: str, raw: bytes) -> ProcessedImage:
        """Process and store (or replace) a photo and its thumbnail."""
        full = self.process(raw)
        thumb = self.process_thumbnail(raw)
        row = self._session.get(PhotoFile, photo_id)
        if row is None:
            self._session.add(PhotoFile(photo_id=photo_id, data=full.data, thumbnail=thumb.data))
        else:
            row.data, row.thumbnail = full.data, thumb.data
        self._session.commit()
        return full

    def read(self, photo_id: str) -> bytes | None:
        row = self._session.get(PhotoFile, photo_id)
        if row is not None:
            return row.data
        legacy = self._legacy_path(photo_id)
        return legacy.read_bytes() if legacy.is_file() else None

    def read_thumbnail(self, photo_id: str) -> bytes | None:
        row = self._session.get(PhotoFile, photo_id)
        if row is not None:
            return row.thumbnail
        legacy = self._legacy_path(photo_id, thumbnail=True)
        return legacy.read_bytes() if legacy.is_file() else self.read(photo_id)

    def delete(self, photo_id: str) -> None:
        row = self._session.get(PhotoFile, photo_id)
        if row is not None:
            self._session.delete(row)
            self._session.commit()
