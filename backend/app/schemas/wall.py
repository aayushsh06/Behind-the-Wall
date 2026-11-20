"""Request and response shapes for wall records."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.auth import Role
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


class WallCreateRequest(WallCreate):
    """What a tradesperson sends to create a wall for a homeowner.

    ``homeowner_email`` names the account the wall goes into. When no homeowner has
    signed up with that email, ``invite`` must be true: the wall then waits for them
    and moves into their account when they sign up.
    """

    homeowner_email: str = Field(min_length=3, max_length=254)
    invite: bool = False

    @field_validator("homeowner_email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    def to_create(self) -> WallCreate:
        return WallCreate.model_validate(self.model_dump(exclude={"homeowner_email", "invite"}))


class AccountBrief(BaseModel):
    """Who a wall belongs to or was recorded by, as shown to the other party."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: Role


class WallUpdate(WallBase):
    pass


class WallRead(WallBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    schema_version: int
    revision: int = 1
    owner: AccountBrief | None = None
    # Set while the wall waits for an invited homeowner to sign up.
    pending_owner_email: str | None = None
    created_by: AccountBrief | None = None
    last_edited_by: AccountBrief | None = None
    # What the signed-in account may do with this wall (filled in per request).
    can_edit: bool = False
    can_delete: bool = False
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
    revision: int = 1
    owner: AccountBrief | None = None
    pending_owner_email: str | None = None
    created_by: AccountBrief | None = None
    updated_at: datetime
