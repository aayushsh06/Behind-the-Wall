"""Populate the database with a sample home of six labeled walls.

Photos come from ``backend/assets/sample``. Each account gets its own copy of the
sample home: wall and photo IDs are derived from the account and the sample key, and
the photos are re-written on every run, so loading the sample home twice refreshes
rather than duplicates, and swapping an asset file takes effect on the next load.

Marker coordinates and calibration corners are hand-placed on real features in each
photo. Two walls share one photo through different crops.
"""

import hashlib
from dataclasses import dataclass
from datetime import date
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

from app.repositories import PhotoRepository, WallRepository
from app.schemas import (
    Coverage,
    LengthUnit,
    Marker,
    MarkerKind,
    Point,
    Region,
    UtilityType,
    WallCalibration,
    WallCreate,
)
from app.services.photo_storage import JPEG_CONTENT_TYPE, PhotoStorage

SAMPLE_ASSETS_DIR = Path(__file__).resolve().parent.parent.parent / "assets" / "sample"
SAMPLE_PREFIX = "sample"


class SampleAssetMissingError(FileNotFoundError):
    pass


@dataclass(frozen=True)
class SamplePhoto:
    """Which asset file a wall uses and, optionally, the normalized crop box to take."""

    asset: str
    crop: Region | None = None


@dataclass(frozen=True)
class SampleWall:
    key: str
    room: str
    label: str
    author: str
    observed_date: date
    coverage: Coverage
    photo: SamplePhoto | None = None
    calibration: WallCalibration | None = None
    coverage_note: str = ""
    uncovered_region: Region | None = None
    markers: tuple[Marker, ...] = ()
    notes: str = ""

    def wall_id(self, owner_id: str) -> str:
        return _sample_id("w", owner_id, self.key)

    def photo_id(self, owner_id: str) -> str:
        return _sample_id("p", owner_id, self.key)


def _sample_id(kind: str, owner_id: str, key: str) -> str:
    """Stable 32-character id, unique per account, so each account has its own copy."""
    digest = hashlib.sha256(f"{kind}:{owner_id}:{key}".encode()).hexdigest()
    return f"{SAMPLE_PREFIX}{digest}"[:32]


def _point(kind: UtilityType, x: float, y: float, text: str, ref: str, note: str = "") -> Marker:
    return Marker(type=kind, x=x, y=y, measurement=text, reference_point=ref, note=note)


def _line(
    kind: UtilityType,
    x: float,
    y: float,
    x2: float,
    y2: float,
    text: str,
    ref: str,
    note: str = "",
) -> Marker:
    return Marker(
        type=kind,
        kind=MarkerKind.LINE,
        x=x,
        y=y,
        x2=x2,
        y2=y2,
        measurement=text,
        reference_point=ref,
        note=note,
    )


def _calibration(tl: tuple[float, float], br: tuple[float, float], w: float, h: float):
    return WallCalibration(
        top_left=Point(x=tl[0], y=tl[1]),
        bottom_right=Point(x=br[0], y=br[1]),
        width=w,
        height=h,
        unit=LengthUnit.INCH,
    )


SAMPLE_WALLS: tuple[SampleWall, ...] = (
    SampleWall(
        key="kitchen-sink",
        room="Kitchen",
        label="Wall behind sink",
        author="Plumber",
        observed_date=date(2026, 3, 4),
        coverage=Coverage.FULL,
        photo=SamplePhoto(asset="sink-wall.png"),
        # Framed bay between the drywall returns, floor to window sill.
        calibration=_calibration((0.235, 0.0), (0.745, 0.85), 48, 48),
        markers=(
            _line(
                UtilityType.PIPE,
                0.344,
                0.82,
                0.344,
                0.30,
                '1/2" copper, HOT',
                "Left of sink center",
            ),
            _line(
                UtilityType.PIPE, 0.39, 0.82, 0.39, 0.30, '1/2" copper, COLD', "Left of sink center"
            ),
            _line(UtilityType.PIPE, 0.48, 0.82, 0.48, 0.56, '1-1/2" PVC drain', "Sink center"),
            _line(UtilityType.PIPE, 0.31, 0.05, 0.31, 0.68, '2" PVC vent stack', "Left stud bay"),
            _line(
                UtilityType.WIRE,
                0.43,
                0.43,
                0.72,
                0.43,
                "12/2 NM, counter circuits",
                "Across center bay",
            ),
            _point(
                UtilityType.WIRE,
                0.62,
                0.29,
                "Junction box: GFI ckt 10, disposal ckt 12",
                "Right stud, upper",
            ),
            _point(UtilityType.WIRE, 0.615, 0.64, "Dishwasher ckt 14 box", "Right stud, lower"),
            _line(
                UtilityType.FRAMING,
                0.425,
                0.84,
                0.425,
                0.0,
                "Stud, 16 in o.c.",
                "Second stud from left",
            ),
        ),
        notes="Opened for the disposal install. Circuit numbers are written on the studs.",
    ),
    SampleWall(
        key="kitchen-stove",
        room="Kitchen",
        label="Wall behind stove",
        author="Electrician",
        observed_date=date(2025, 11, 12),
        coverage=Coverage.PARTIAL,
        photo=SamplePhoto(
            asset="plumbing-wall.png", crop=Region(x=0.22, y=0.0, width=0.34, height=1.0)
        ),
        calibration=_calibration((0.0, 0.11), (1.0, 0.86), 40, 84),
        coverage_note="Only the section below the junction box was opened for the range outlet. "
        "Everything above it was not inspected.",
        uncovered_region=Region(x=0.0, y=0.0, width=1.0, height=0.35),
        markers=(
            _point(
                UtilityType.WIRE,
                0.546,
                0.385,
                "Junction box, range receptacle feed",
                "Right of center stud",
            ),
            _line(
                UtilityType.WIRE, 0.30, 0.465, 0.73, 0.465, "Yellow 12/2 NM run", "Between studs"
            ),
            _line(
                UtilityType.FRAMING, 0.618, 0.86, 0.618, 0.36, "Stud, 16 in o.c.", "From left edge"
            ),
        ),
    ),
    SampleWall(
        key="bath-vanity",
        room="Bathroom",
        label="Wall behind vanity",
        author="Plumber",
        observed_date=date(2026, 1, 20),
        coverage=Coverage.FULL,
        photo=SamplePhoto(
            asset="plumbing-wall.png", crop=Region(x=0.52, y=0.0, width=0.28, height=1.0)
        ),
        calibration=_calibration((0.0, 0.10), (1.0, 0.86), 30, 84),
        markers=(
            _line(
                UtilityType.PIPE, 0.43, 0.72, 0.43, 0.11, '2" PVC drain and vent', "Center stud bay"
            ),
            _line(
                UtilityType.PIPE, 0.05, 0.73, 0.43, 0.73, "Trap arm to drain", "Low in center bay"
            ),
            _line(
                UtilityType.PIPE,
                0.25,
                0.82,
                0.25,
                0.43,
                '1/2" copper supply with shutoff',
                "Left of drain",
            ),
            _point(UtilityType.WIRE, 0.12, 0.60, "GFCI feed (white NM)", "Left stud, mid height"),
            _line(UtilityType.FRAMING, 0.55, 0.93, 0.55, 0.0, "Stud", "Right of drain"),
        ),
        notes="Pink insulation in the right bay is an exterior wall.",
    ),
    SampleWall(
        key="living-tv",
        room="Living Room",
        label="TV wall",
        author="Carpenter",
        observed_date=date(2025, 8, 2),
        coverage=Coverage.PARTIAL,
        photo=SamplePhoto(asset="framed-partition.png"),
        calibration=_calibration((0.31, 0.0), (0.87, 0.95), 168, 96),
        coverage_note=(
            "Only the right side of the partition was checked while fishing the HDMI cable. "
            "The left section and the plywood backing area are unknown."
        ),
        uncovered_region=Region(x=0.0, y=0.0, width=0.62, height=1.0),
        markers=(
            _line(UtilityType.FRAMING, 0.65, 0.95, 0.65, 0.0, "Stud", "From left corner"),
            _line(UtilityType.FRAMING, 0.742, 0.95, 0.742, 0.0, "Stud", "From left corner"),
            _line(
                UtilityType.WIRE,
                0.775,
                0.30,
                0.775,
                0.80,
                "Green low-voltage cable, no line voltage",
                "Between studs",
            ),
        ),
    ),
    SampleWall(
        key="bedroom-closet",
        room="Bedroom",
        label="Closet wall",
        author="Carpenter",
        observed_date=date(2025, 5, 15),
        coverage=Coverage.NONE,
        coverage_note=(
            "Never opened. Previous owner mentioned old knob-and-tube in this area; unverified."
        ),
    ),
    SampleWall(
        key="basement-panel",
        room="Basement",
        label="Alcove left of electrical panel",
        author="Electrician",
        observed_date=date(2026, 2, 9),
        coverage=Coverage.FULL,
        photo=SamplePhoto(asset="basement-alcove.avif"),
        calibration=_calibration((0.19, 0.23), (0.90, 0.77), 48, 60),
        markers=(
            _line(
                UtilityType.WIRE, 0.20, 0.32, 0.88, 0.32, "14/2 NM across top of bay", "Top plate"
            ),
            _point(
                UtilityType.WIRE, 0.19, 0.31, "Cable enters from left wall outlet", "Top-left stud"
            ),
            _line(
                UtilityType.FRAMING, 0.375, 0.75, 0.375, 0.24, "Stud, 16 in o.c.", "From left edge"
            ),
            _line(
                UtilityType.FRAMING, 0.63, 0.75, 0.63, 0.24, "Stud, 16 in o.c.", "From left edge"
            ),
            _point(
                UtilityType.OTHER,
                0.55,
                0.52,
                "Poured concrete foundation behind studs",
                "Center bay",
            ),
        ),
        notes="Furred-out foundation wall. No insulation or vapor barrier when opened.",
    ),
    # ---- Second and third walls per room (crops of the same site photos) ----
    SampleWall(
        key="kitchen-window-right",
        room="Kitchen",
        label="Wall right of window",
        author="Carpenter",
        observed_date=date(2026, 3, 4),
        coverage=Coverage.FULL,
        photo=SamplePhoto(
            asset="sink-wall.png", crop=Region(x=0.70, y=0.0, width=0.30, height=0.85)
        ),
        calibration=_calibration((0.0, 0.05), (1.0, 1.0), 36, 70),
        markers=(
            _line(UtilityType.FRAMING, 0.12, 0.98, 0.12, 0.05, "Stud, 16 in o.c.", "Left edge"),
            _line(UtilityType.FRAMING, 0.57, 0.98, 0.57, 0.05, "Stud, 16 in o.c.", "Left stud"),
            _point(UtilityType.OTHER, 0.82, 0.45, "R-13 kraft-faced insulation", "Right bay"),
        ),
        notes="No services in this bay. Insulation is intact behind the cabinet run.",
    ),
    SampleWall(
        key="bath-left-of-vanity",
        room="Bathroom",
        label="Wall left of vanity",
        author="Electrician",
        observed_date=date(2026, 1, 20),
        coverage=Coverage.FULL,
        photo=SamplePhoto(
            asset="plumbing-wall.png", crop=Region(x=0.24, y=0.10, width=0.24, height=0.75)
        ),
        calibration=_calibration((0.0, 0.0), (1.0, 1.0), 32, 72),
        markers=(
            _point(UtilityType.WIRE, 0.69, 0.37, "Junction box: fan and lights", "Right stud"),
            _line(
                UtilityType.WIRE, 0.22, 0.53, 0.98, 0.53, "12/2 NM to vanity light", "Mid-height"
            ),
            _line(
                UtilityType.WIRE, 0.375, 0.05, 0.375, 0.62, "14/2 NM, fan circuit", "Down the bay"
            ),
            _line(UtilityType.FRAMING, 0.17, 0.98, 0.17, 0.02, "Stud, 16 in o.c.", "Left edge"),
        ),
        notes="Fan and light circuits share this bay. Box is 5 ft above the floor.",
    ),
    SampleWall(
        key="basement-right-of-panel",
        room="Basement",
        label="Wall right of panel",
        author="Electrician",
        observed_date=date(2026, 2, 9),
        coverage=Coverage.FULL,
        photo=SamplePhoto(
            asset="basement-alcove.avif", crop=Region(x=0.18, y=0.28, width=0.70, height=0.50)
        ),
        calibration=_calibration((0.0, 0.04), (1.0, 0.94), 40, 54),
        markers=(
            _line(UtilityType.WIRE, 0.02, 0.08, 0.98, 0.08, "14/2 NM along top plate", "Top plate"),
            _line(UtilityType.FRAMING, 0.28, 0.94, 0.28, 0.04, "Stud, 24 in o.c.", "Left stud"),
            _line(UtilityType.FRAMING, 0.64, 0.94, 0.64, 0.04, "Stud, 24 in o.c.", "Right stud"),
            _point(UtilityType.OTHER, 0.46, 0.55, "Poured concrete, no moisture barrier", "Center"),
        ),
        notes="Cable is stapled to the top plate the full width of the wall.",
    ),
    SampleWall(
        key="bedroom-behind-bed",
        room="Bedroom",
        label="Wall behind bed",
        author="Carpenter",
        observed_date=date(2025, 5, 15),
        coverage=Coverage.FULL,
        photo=SamplePhoto(
            asset="framed-partition.png", crop=Region(x=0.0, y=0.12, width=0.30, height=0.70)
        ),
        calibration=_calibration((0.0, 0.0), (1.0, 1.0), 48, 80),
        markers=(
            _line(UtilityType.FRAMING, 0.17, 0.98, 0.17, 0.02, "Stud, 16 in o.c.", "Left edge"),
            _line(UtilityType.FRAMING, 0.50, 0.98, 0.50, 0.02, "Stud, 16 in o.c.", "Center"),
            _point(UtilityType.OTHER, 0.33, 0.45, "R-19 fiberglass batts", "Between studs"),
        ),
        notes="Exterior wall. Insulated, no services found.",
    ),
    SampleWall(
        key="living-front-window",
        room="Living Room",
        label="Wall by front window",
        author="Carpenter",
        observed_date=date(2025, 8, 2),
        coverage=Coverage.FULL,
        photo=SamplePhoto(
            asset="framed-partition.png", crop=Region(x=0.55, y=0.05, width=0.40, height=0.90)
        ),
        calibration=_calibration((0.0, 0.05), (1.0, 0.98), 60, 96),
        markers=(
            _line(
                UtilityType.FRAMING, 0.21, 0.98, 0.21, 0.05, "Stud, 16 in o.c.", "Left of opening"
            ),
            _line(UtilityType.FRAMING, 0.53, 0.98, 0.53, 0.05, "Stud, 16 in o.c.", "Partition"),
            _point(UtilityType.OTHER, 0.40, 0.38, "Window rough opening", "Behind partition"),
        ),
        notes="Temporary work lights only; no permanent wiring in this wall.",
    ),
)


class SeedService:
    def __init__(
        self, walls: WallRepository, photos: PhotoRepository, storage: PhotoStorage
    ) -> None:
        self._walls = walls
        self._photos = photos
        self._storage = storage

    def seed_sample_home(
        self, owner_id: str, tradesperson_id: str, *, only_missing: bool = False
    ) -> list[str]:
        """Create or refresh a homeowner's sample walls and photos. Returns the wall IDs.

        Every wall is recorded as added by ``tradesperson_id``, so that account sees them
        under this homeowner as a client. With ``only_missing`` existing sample walls are
        left untouched (keeping any edits) and only new ones are added.
        """
        ids: list[str] = []
        for sample in SAMPLE_WALLS:
            if only_missing and self._walls.exists(sample.wall_id(owner_id)):
                continue
            created_by_id = tradesperson_id
            photo_id = self._write_photo(sample, created_by_id) if sample.photo else None
            data = WallCreate(
                room=sample.room,
                label=sample.label,
                author=sample.author,
                observed_date=sample.observed_date,
                coverage=sample.coverage,
                coverage_note=sample.coverage_note,
                uncovered_region=sample.uncovered_region,
                photo_id=photo_id,
                calibration=sample.calibration if photo_id else None,
                markers=list(sample.markers),
                notes=sample.notes,
            )
            wall = self._walls.upsert(
                sample.wall_id(owner_id), data, owner_id=owner_id, created_by_id=created_by_id
            )
            ids.append(wall.id)
        return ids

    def _write_photo(self, sample: SampleWall, uploader_id: str) -> str:
        assert sample.photo is not None
        photo_id = sample.photo_id(uploader_id)
        raw = load_sample_image(sample.photo)
        processed = self._storage.save(photo_id, raw)
        self._photos.upsert(
            photo_id=photo_id,
            owner_id=uploader_id,
            content_type=JPEG_CONTENT_TYPE,
            width=processed.width,
            height=processed.height,
            size_bytes=len(processed.data),
        )
        return photo_id


def load_sample_image(photo: SamplePhoto) -> bytes:
    """Read an asset, apply its crop, and return JPEG bytes ready for the photo pipeline."""
    path = SAMPLE_ASSETS_DIR / photo.asset
    if not path.is_file():
        raise SampleAssetMissingError(f"Sample photo not found: {path}")
    image = Image.open(path)
    image.load()
    image = ImageOps.exif_transpose(image) or image
    image = image.convert("RGB")
    if photo.crop:
        box = (
            round(photo.crop.x * image.width),
            round(photo.crop.y * image.height),
            round((photo.crop.x + photo.crop.width) * image.width),
            round((photo.crop.y + photo.crop.height) * image.height),
        )
        image = image.crop(box)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=92)
    return buffer.getvalue()
