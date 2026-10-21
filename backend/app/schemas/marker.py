"""An observed item (pipe, wire, framing) placed on a wall photo.

A marker is either a point (x, y) or a line segment from (x, y) to (x2, y2). Line
endpoints are stored as separate optional fields so older point-only records stay valid.
"""

from enum import StrEnum

from pydantic import BaseModel, Field, model_validator

from app.core.ids import new_id
from app.schemas.common import UtilityType


class MarkerKind(StrEnum):
    POINT = "point"
    LINE = "line"


class Marker(BaseModel):
    id: str = Field(default_factory=new_id)
    type: UtilityType
    kind: MarkerKind = MarkerKind.POINT
    # Normalized coordinates relative to the photo so they render on any screen size.
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    x2: float | None = Field(default=None, ge=0, le=1)
    y2: float | None = Field(default=None, ge=0, le=1)
    measurement: str = Field(default="", max_length=200)
    reference_point: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def _check_geometry(self) -> "Marker":
        if self.kind is MarkerKind.LINE:
            if self.x2 is None or self.y2 is None:
                raise ValueError("A line marker needs x2 and y2")
        else:
            self.x2 = None
            self.y2 = None
        return self
