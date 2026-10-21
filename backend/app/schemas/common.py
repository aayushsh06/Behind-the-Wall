"""Shared enums and value objects used across wall schemas."""

from enum import StrEnum

from pydantic import BaseModel, Field


class UtilityType(StrEnum):
    PIPE = "pipe"
    WIRE = "wire"
    FRAMING = "framing"
    OTHER = "other"


class Coverage(StrEnum):
    """How much of the physical wall the record describes."""

    FULL = "full"
    PARTIAL = "partial"
    NONE = "none"


class LengthUnit(StrEnum):
    INCH = "in"
    CENTIMETER = "cm"


class Point(BaseModel):
    """A position in normalized photo coordinates (0..1)."""

    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class Region(BaseModel):
    """Axis-aligned rectangle in normalized photo coordinates (0..1)."""

    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)
