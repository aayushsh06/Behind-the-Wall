"""Maps photo coordinates to real-world wall positions.

The user marks where the wall's top-left and bottom-right corners appear in the photo
and enters the wall's real width and height. Positions are then computed by linear
interpolation, which assumes a roughly frontal photo (no perspective correction).
"""

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import LengthUnit, Point

MIN_SPAN = 0.02  # corners closer than this in normalized units would make the math unstable


class WallCalibration(BaseModel):
    top_left: Point
    bottom_right: Point
    width: float = Field(gt=0, description="Real wall width in `unit`")
    height: float = Field(gt=0, description="Real wall height in `unit`")
    unit: LengthUnit = LengthUnit.INCH

    @model_validator(mode="after")
    def _check_corners(self) -> "WallCalibration":
        if self.bottom_right.x - self.top_left.x < MIN_SPAN:
            raise ValueError("bottom_right must be to the right of top_left")
        if self.bottom_right.y - self.top_left.y < MIN_SPAN:
            raise ValueError("bottom_right must be below top_left")
        return self
