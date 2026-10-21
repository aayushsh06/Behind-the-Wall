"""Normalise uploaded images and store them on disk.

Every photo is re-encoded as JPEG, orientation-corrected from EXIF, and resized so
the longest edge is bounded. A small thumbnail is written alongside for list views.
"""

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import Settings

JPEG_CONTENT_TYPE = "image/jpeg"


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    width: int
    height: int


class PhotoStorage:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._root = settings.photos_dir
        self._root.mkdir(parents=True, exist_ok=True)

    # ---- paths -------------------------------------------------------------------

    def path_for(self, photo_id: str) -> Path:
        return self._root / f"{photo_id}.jpg"

    def thumbnail_path_for(self, photo_id: str) -> Path:
        return self._root / f"{photo_id}_thumb.jpg"

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

    # ---- disk --------------------------------------------------------------------

    def save(self, photo_id: str, raw: bytes) -> ProcessedImage:
        full = self.process(raw)
        thumb = self.process_thumbnail(raw)
        self.path_for(photo_id).write_bytes(full.data)
        self.thumbnail_path_for(photo_id).write_bytes(thumb.data)
        return full

    def read(self, photo_id: str) -> bytes | None:
        path = self.path_for(photo_id)
        return path.read_bytes() if path.exists() else None

    def read_thumbnail(self, photo_id: str) -> bytes | None:
        path = self.thumbnail_path_for(photo_id)
        if path.exists():
            return path.read_bytes()
        return self.read(photo_id)

    def delete(self, photo_id: str) -> None:
        for path in (self.path_for(photo_id), self.thumbnail_path_for(photo_id)):
            path.unlink(missing_ok=True)
