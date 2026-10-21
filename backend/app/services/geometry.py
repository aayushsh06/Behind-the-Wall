"""Convert normalized photo coordinates into real wall positions.

Origin is the bottom-left corner of the wall: positions read as "from the left edge"
and "above the floor", which is how trades measure. All math is linear interpolation
between the calibrated corners, so accuracy depends on a roughly frontal photo.
"""

from dataclasses import dataclass
from math import hypot

from app.schemas import LengthUnit, Marker, MarkerKind, WallCalibration


@dataclass(frozen=True)
class PhysicalPoint:
    from_left: float
    from_floor: float
    unit: LengthUnit


@dataclass(frozen=True)
class PhysicalLine:
    start: PhysicalPoint
    end: PhysicalPoint
    length: float
    unit: LengthUnit


def physical_point(x: float, y: float, calibration: WallCalibration) -> PhysicalPoint:
    tl, br = calibration.top_left, calibration.bottom_right
    fx = (x - tl.x) / (br.x - tl.x)
    fy = (br.y - y) / (br.y - tl.y)
    return PhysicalPoint(
        from_left=fx * calibration.width,
        from_floor=fy * calibration.height,
        unit=calibration.unit,
    )


def physical_line(
    x1: float, y1: float, x2: float, y2: float, calibration: WallCalibration
) -> PhysicalLine:
    start = physical_point(x1, y1, calibration)
    end = physical_point(x2, y2, calibration)
    length = hypot(end.from_left - start.from_left, end.from_floor - start.from_floor)
    return PhysicalLine(start=start, end=end, length=length, unit=calibration.unit)


# ---- formatting ------------------------------------------------------------------


def format_length(value: float, unit: LengthUnit) -> str:
    """Round to a sensible precision and attach the unit (feet and inches for inches)."""
    if unit is LengthUnit.INCH:
        total = round(value * 2) / 2  # half-inch precision
        feet, inches = divmod(total, 12)
        inch_text = f"{inches:g}"
        if feet >= 1:
            return f"{int(feet)} ft {inch_text} in"
        return f"{inch_text} in"
    return f"{round(value):d} cm"


def describe_point(point: PhysicalPoint) -> str:
    return (
        f"{format_length(point.from_left, point.unit)} from left, "
        f"{format_length(point.from_floor, point.unit)} above floor"
    )


def describe_line(line: PhysicalLine) -> str:
    return (
        f"{format_length(line.length, line.unit)} long, "
        f"from ({describe_point(line.start)}) to ({describe_point(line.end)})"
    )


def describe_marker(marker: Marker, calibration: WallCalibration | None) -> str | None:
    """Human-readable computed position, or None when the wall is not calibrated."""
    if calibration is None:
        return None
    if marker.kind is MarkerKind.LINE and marker.x2 is not None and marker.y2 is not None:
        return describe_line(physical_line(marker.x, marker.y, marker.x2, marker.y2, calibration))
    return describe_point(physical_point(marker.x, marker.y, calibration))


def describe_wall_size(calibration: WallCalibration) -> str:
    return (
        f"{format_length(calibration.width, calibration.unit)} wide × "
        f"{format_length(calibration.height, calibration.unit)} high"
    )
