"""Request and response shapes for wall records."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.calibration import WallCalibration
from app.schemas.common import Coverage, Region
from app.schemas.marker import Marker


class WallBase(BaseModel):
    room: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=120)
    author: str = Field(min_length=1, max_length=120)
    observed_date: date
    coverage: Coverage
    coverage_note: str = Field(default="", max_length=1000)
    uncovered_region: Region | None = None
    photo_id: str | None = None
    calibration: WallCalibration | None = None
    markers: list[Marker] = Field(default_factory=list)
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def _check_coverage_consistency(self) -> "WallBase":
        if self.coverage is Coverage.NONE and self.markers:
            raise ValueError("A wall with no coverage cannot have markers")
        if self.coverage is not Coverage.PARTIAL:
            self.uncovered_region = None
        if self.photo_id is None and self.markers:
            raise ValueError("Markers require a photo to be placed on")
        if self.photo_id is None:
            self.calibration = None
        return self


class WallCreate(WallBase):
    pass


class WallUpdate(WallBase):
    pass


class WallRead(WallBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    schema_version: int
    created_at: datetime
    updated_at: datetime


class WallSummary(BaseModel):
    """Lightweight shape for list views; omits markers and notes."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    room: str
    label: str
    author: str
    observed_date: date
    coverage: Coverage
    photo_id: str | None
    marker_count: int
    updated_at: datetime
