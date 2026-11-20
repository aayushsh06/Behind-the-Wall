"""An observed item (pipe, wire, framing) placed on a wall photo.

A marker is a point (x, y), a straight line from (x, y) to (x2, y2), or a freehand path
(``points``) drawn over the photo and snapped to the wire or pipe in it. A path also
stores its first and last points in x/y and x2/y2, so anything that only understands
straight lines still draws it end to end. Older point-only records stay valid.
"""

from enum import StrEnum

from pydantic import BaseModel, Field, model_validator

from app.core.ids import new_id
from app.schemas.common import Point, UtilityType

MAX_PATH_POINTS = 200


class MarkerKind(StrEnum):
    POINT = "point"
    LINE = "line"
    PATH = "path"


class Marker(BaseModel):
    id: str = Field(default_factory=new_id)
    type: UtilityType
    kind: MarkerKind = MarkerKind.POINT
    # Normalized coordinates relative to the photo so they render on any screen size.
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    x2: float | None = Field(default=None, ge=0, le=1)
    y2: float | None = Field(default=None, ge=0, le=1)
    # Freehand paths only: the snapped route, in drawing order.
    points: list[Point] | None = Field(default=None, max_length=MAX_PATH_POINTS)
    measurement: str = Field(default="", max_length=200)
    reference_point: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def _check_geometry(self) -> "Marker":
        if self.kind is MarkerKind.PATH:
            if not self.points or len(self.points) < 2:
                raise ValueError("A path marker needs at least two points")
            first, last = self.points[0], self.points[-1]
            self.x, self.y, self.x2, self.y2 = first.x, first.y, last.x, last.y
            return self
        self.points = None
        if self.kind is MarkerKind.LINE:
            if self.x2 is None or self.y2 is None:
                raise ValueError("A line marker needs x2 and y2")
        else:
            self.x2 = None
            self.y2 = None
        return self
