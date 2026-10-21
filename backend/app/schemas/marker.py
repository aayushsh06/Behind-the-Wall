"""An observed item (pipe, wire, framing) placed on a wall photo."""

from pydantic import BaseModel, Field

from app.core.ids import new_id
from app.schemas.common import UtilityType


class Marker(BaseModel):
    id: str = Field(default_factory=new_id)
    type: UtilityType
    # Normalized coordinates relative to the photo so they render on any screen size.
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    measurement: str = Field(min_length=1, max_length=200)
    reference_point: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=1000)
