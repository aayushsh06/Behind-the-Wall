"""Populate the database with a sample home of six labeled walls.

Seed walls use fixed IDs so running the seed twice updates rather than duplicates.
Photos are generated placeholders (a flat wall with a label) so the sample works
without bundling image files; swap in real photos by dropping ``<id>.jpg`` into
``assets/sample`` before seeding.
"""

from dataclasses import dataclass
from datetime import date
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

from app.repositories import PhotoRepository, WallRepository
from app.schemas import Coverage, Marker, Region, UtilityType, WallCreate
from app.services.photo_storage import JPEG_CONTENT_TYPE, PhotoStorage

SAMPLE_ASSETS_DIR = Path(__file__).resolve().parent.parent.parent / "assets" / "sample"
SAMPLE_PREFIX = "sample"


@dataclass(frozen=True)
class SampleWall:
    key: str
    room: str
    label: str
    author: str
    observed_date: date
    coverage: Coverage
    coverage_note: str = ""
    uncovered_region: Region | None = None
    markers: tuple[Marker, ...] = ()
    notes: str = ""

    @property
    def wall_id(self) -> str:
        return f"{SAMPLE_PREFIX}{self.key:0>26}"[:32]

    @property
    def photo_id(self) -> str:
        return f"{SAMPLE_PREFIX}photo{self.key:0>21}"[:32]


def _m(kind: UtilityType, x: float, y: float, measurement: str, ref: str, note: str = "") -> Marker:
    return Marker(type=kind, x=x, y=y, measurement=measurement, reference_point=ref, note=note)


SAMPLE_WALLS: tuple[SampleWall, ...] = (
    SampleWall(
        key="kitchen-sink",
        room="Kitchen",
        label="Wall behind sink",
        author="M. Alvarez (plumber)",
        observed_date=date(2026, 3, 4),
        coverage=Coverage.FULL,
        markers=(
            _m(
                UtilityType.PIPE,
                0.42,
                0.55,
                '1/2" copper supply, 18 in above floor',
                "Left of sink drain",
            ),
            _m(UtilityType.PIPE, 0.50, 0.70, '2" PVC drain, centered on sink', "Sink centerline"),
            _m(
                UtilityType.WIRE,
                0.78,
                0.30,
                "12/2 NM to disposal outlet, 44 in above floor",
                "Right of window trim",
            ),
        ),
        notes="Opened for disposal install. Drain vent runs up and left toward the window.",
    ),
    SampleWall(
        key="kitchen-stove",
        room="Kitchen",
        label="Wall behind stove",
        author="D. Chen (electrician)",
        observed_date=date(2025, 11, 12),
        coverage=Coverage.PARTIAL,
        coverage_note=(
            "Only the lower 3 ft was opened for the range outlet. Upper section not inspected."
        ),
        uncovered_region=Region(x=0.0, y=0.0, width=1.0, height=0.5),
        markers=(
            _m(
                UtilityType.WIRE,
                0.35,
                0.80,
                "6/3 range circuit, 12 in above floor",
                "Left stud bay",
            ),
            _m(
                UtilityType.FRAMING,
                0.52,
                0.75,
                "Stud at 16 in o.c., 48 in from corner",
                "From left corner",
            ),
        ),
    ),
    SampleWall(
        key="bath-vanity",
        room="Bathroom",
        label="Wall behind vanity",
        author="M. Alvarez (plumber)",
        observed_date=date(2026, 1, 20),
        coverage=Coverage.FULL,
        markers=(
            _m(UtilityType.PIPE, 0.40, 0.60, 'Hot 1/2" PEX, 20 in above floor', "Left of drain"),
            _m(UtilityType.PIPE, 0.60, 0.60, 'Cold 1/2" PEX, 20 in above floor', "Right of drain"),
            _m(UtilityType.PIPE, 0.50, 0.78, '1-1/2" drain, 14 in above floor', "Vanity center"),
            _m(
                UtilityType.WIRE,
                0.82,
                0.35,
                "GFCI outlet feed, 40 in above floor",
                "Right of mirror",
            ),
        ),
    ),
    SampleWall(
        key="living-tv",
        room="Living Room",
        label="TV wall",
        author="Homeowner",
        observed_date=date(2025, 8, 2),
        coverage=Coverage.PARTIAL,
        coverage_note=(
            "Opened one bay to fish the HDMI cable. Everything outside that bay is unknown."
        ),
        uncovered_region=Region(x=0.0, y=0.0, width=0.62, height=1.0),
        markers=(
            _m(UtilityType.FRAMING, 0.66, 0.50, "Stud, 64 in from left corner", "From left corner"),
            _m(UtilityType.FRAMING, 0.90, 0.50, "Stud, 80 in from left corner", "From left corner"),
            _m(
                UtilityType.WIRE,
                0.78,
                0.40,
                "Low-voltage HDMI run, no line voltage seen",
                "Between studs",
            ),
        ),
    ),
    SampleWall(
        key="bedroom-closet",
        room="Bedroom",
        label="Closet wall",
        author="Homeowner",
        observed_date=date(2025, 5, 15),
        coverage=Coverage.NONE,
        coverage_note=(
            "Never opened. Previous owner mentioned old knob-and-tube in this area; unverified."
        ),
    ),
    SampleWall(
        key="basement-panel",
        room="Basement",
        label="Wall left of electrical panel",
        author="D. Chen (electrician)",
        observed_date=date(2026, 2, 9),
        coverage=Coverage.FULL,
        markers=(
            _m(UtilityType.WIRE, 0.30, 0.25, "Service conduit, 2 in EMT", "Left of panel, top"),
            _m(
                UtilityType.WIRE,
                0.30,
                0.55,
                "Branch circuits bundle, 36 in above floor",
                "Left of panel",
            ),
            _m(UtilityType.PIPE, 0.72, 0.65, '3/4" gas line, 30 in above floor', "Right of panel"),
            _m(UtilityType.FRAMING, 0.55, 0.50, "Stud at 16 in o.c.", "Panel centerline"),
        ),
        notes="Keep 36 in clearance in front of the panel.",
    ),
)


class SeedService:
    def __init__(
        self, walls: WallRepository, photos: PhotoRepository, storage: PhotoStorage
    ) -> None:
        self._walls = walls
        self._photos = photos
        self._storage = storage

    def seed_sample_home(self) -> list[str]:
        """Create or update every sample wall. Returns the wall IDs touched."""
        ids: list[str] = []
        for sample in SAMPLE_WALLS:
            photo_id = self._ensure_photo(sample) if sample.coverage is not Coverage.NONE else None
            data = WallCreate(
                room=sample.room,
                label=sample.label,
                author=sample.author,
                observed_date=sample.observed_date,
                coverage=sample.coverage,
                coverage_note=sample.coverage_note,
                uncovered_region=sample.uncovered_region,
                photo_id=photo_id,
                markers=list(sample.markers),
                notes=sample.notes,
            )
            wall = self._walls.upsert(sample.wall_id, data)
            ids.append(wall.id)
        return ids

    def _ensure_photo(self, sample: SampleWall) -> str:
        if self._photos.get(sample.photo_id) is not None:
            return sample.photo_id
        raw = self._load_asset(sample) or self._render_placeholder(sample)
        processed = self._storage.save(sample.photo_id, raw)
        self._photos.create(
            photo_id=sample.photo_id,
            content_type=JPEG_CONTENT_TYPE,
            width=processed.width,
            height=processed.height,
            size_bytes=len(processed.data),
        )
        return sample.photo_id

    @staticmethod
    def _load_asset(sample: SampleWall) -> bytes | None:
        path = SAMPLE_ASSETS_DIR / f"{sample.key}.jpg"
        return path.read_bytes() if path.exists() else None

    @staticmethod
    def _render_placeholder(sample: SampleWall) -> bytes:
        """Draw a neutral 'open wall' with studs so markers have something to sit on."""
        width, height = 1200, 900
        image = Image.new("RGB", (width, height), (214, 205, 190))
        draw = ImageDraw.Draw(image)
        stud_color = (160, 128, 90)
        for x in range(60, width, 192):
            draw.rectangle([x, 0, x + 38, height], fill=stud_color)
        draw.rectangle([0, height - 60, width, height], fill=(120, 95, 70))
        draw.text((24, 20), f"{sample.room} · {sample.label}", fill=(60, 50, 40))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()
