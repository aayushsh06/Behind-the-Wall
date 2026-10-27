"""Build single-wall handoff documents.

The HTML export is fully self-contained (inline CSS, inline SVG overlay, photo as a
data URI) so a recipient can open it anywhere without the app. The JSON export is
the same record plus the photo, suitable for re-import.
"""

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models import Photo, Wall
from app.schemas import MarkerKind, WallRead
from app.services.geometry import describe_marker, describe_wall_size
from app.services.photo_storage import JPEG_CONTENT_TYPE

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
EXPORT_FORMAT_VERSION = 1

UTILITY_LABELS = {
    "water": "Water",
    "gas": "Gas",
    "pipe": "Pipe",
    "wire": "Wire",
    "framing": "Framing",
    "other": "Other",
}
UTILITY_COLORS = {
    "water": "#0284c7",
    "gas": "#c2410c",
    "pipe": "#1f6feb",
    "wire": "#d4a017",
    "framing": "#8b5a2b",
    "other": "#6b6b6b",
}
COVERAGE_LABELS = {
    "full": "Entire wall documented",
    "partial": "Part of this wall is undocumented. Unmarked areas are unknown.",
    "none": "No photo or markers for this wall. Treat the whole wall as unknown.",
}


@dataclass(frozen=True)
class ExportBundle:
    filename: str
    content: bytes
    media_type: str


class ExportService:
    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(["html"]),
        )

    def to_html(self, wall: Wall, photo: Photo | None, photo_bytes: bytes | None) -> ExportBundle:
        record = WallRead.model_validate(wall)
        template = self._env.get_template("wall_export.html")
        html = template.render(
            wall=record,
            photo=photo,
            photo_data_uri=self._data_uri(photo_bytes),
            coverage_label=COVERAGE_LABELS[record.coverage.value],
            wall_size=describe_wall_size(record.calibration) if record.calibration else None,
            utility_labels=UTILITY_LABELS,
            utility_colors=UTILITY_COLORS,
            markers=[
                m.model_dump()
                | {
                    "index": i + 1,
                    "type_label": UTILITY_LABELS[m.type.value],
                    "is_line": m.kind is MarkerKind.LINE,
                    "position": describe_marker(m, record.calibration),
                }
                for i, m in enumerate(record.markers)
            ],
        )
        return ExportBundle(
            filename=self._filename(record, "html"),
            content=html.encode("utf-8"),
            media_type="text/html",
        )

    def to_json(self, wall: Wall, photo: Photo | None, photo_bytes: bytes | None) -> ExportBundle:
        import json

        record = WallRead.model_validate(wall)
        payload: dict[str, Any] = {
            "format": "behind-the-wall/wall",
            "format_version": EXPORT_FORMAT_VERSION,
            "wall": record.model_dump(mode="json"),
            "photo": None,
        }
        if photo is not None and photo_bytes is not None:
            payload["photo"] = {
                "content_type": photo.content_type,
                "width": photo.width,
                "height": photo.height,
                "data_base64": base64.b64encode(photo_bytes).decode("ascii"),
            }
        return ExportBundle(
            filename=self._filename(record, "json"),
            content=json.dumps(payload, indent=2).encode("utf-8"),
            media_type="application/json",
        )

    @staticmethod
    def _data_uri(photo_bytes: bytes | None) -> str | None:
        if photo_bytes is None:
            return None
        encoded = base64.b64encode(photo_bytes).decode("ascii")
        return f"data:{JPEG_CONTENT_TYPE};base64,{encoded}"

    @staticmethod
    def _filename(record: WallRead, extension: str) -> str:
        slug = "-".join(part for part in f"{record.room} {record.label}".lower().split() if part)
        safe = "".join(ch for ch in slug if ch.isalnum() or ch == "-") or "wall"
        return f"behind-the-wall-{safe}.{extension}"
