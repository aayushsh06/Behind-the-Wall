import pytest

from app.schemas import LengthUnit, Marker, Point, UtilityType, WallCalibration
from app.services.geometry import (
    describe_marker,
    describe_wall_size,
    format_length,
    physical_line,
    physical_point,
)


@pytest.fixture
def calibration() -> WallCalibration:
    # Wall occupies the middle 80% of the photo horizontally and 0.1..0.9 vertically.
    return WallCalibration(
        top_left=Point(x=0.1, y=0.1),
        bottom_right=Point(x=0.9, y=0.9),
        width=120,
        height=96,
        unit=LengthUnit.INCH,
    )


def test_corners_map_to_wall_extents(calibration: WallCalibration) -> None:
    bottom_left = physical_point(0.1, 0.9, calibration)
    assert (bottom_left.from_left, bottom_left.from_floor) == (0, 0)
    top_right = physical_point(0.9, 0.1, calibration)
    assert (top_right.from_left, top_right.from_floor) == pytest.approx((120, 96))


def test_center_maps_to_half(calibration: WallCalibration) -> None:
    center = physical_point(0.5, 0.5, calibration)
    assert (center.from_left, center.from_floor) == pytest.approx((60, 48))


def test_line_length_uses_real_units(calibration: WallCalibration) -> None:
    line = physical_line(0.1, 0.9, 0.9, 0.9, calibration)
    assert line.length == pytest.approx(120)
    diagonal = physical_line(0.1, 0.9, 0.9, 0.1, calibration)
    assert diagonal.length == pytest.approx((120**2 + 96**2) ** 0.5)


def test_format_length_inches_and_cm() -> None:
    assert format_length(54, LengthUnit.INCH) == "4 ft 6 in"
    assert format_length(7.3, LengthUnit.INCH) == "7.5 in"
    assert format_length(0.2, LengthUnit.INCH) == "0 in"
    assert format_length(91.4, LengthUnit.CENTIMETER) == "91 cm"


def test_describe_marker(calibration: WallCalibration) -> None:
    point = Marker(type=UtilityType.PIPE, x=0.5, y=0.5)
    assert describe_marker(point, calibration) == "5 ft 0 in from left, 4 ft 0 in above floor"
    line = Marker(type=UtilityType.WIRE, kind="line", x=0.1, y=0.9, x2=0.9, y2=0.9)
    assert describe_marker(line, calibration).startswith("10 ft 0 in long, from (0 in from left")
    assert describe_marker(point, None) is None


def test_describe_wall_size(calibration: WallCalibration) -> None:
    assert describe_wall_size(calibration) == "10 ft 0 in wide × 8 ft 0 in high"


def test_calibration_rejects_inverted_corners() -> None:
    with pytest.raises(ValueError):
        WallCalibration(
            top_left=Point(x=0.9, y=0.1), bottom_right=Point(x=0.1, y=0.9), width=1, height=1
        )


def test_line_marker_requires_second_point() -> None:
    with pytest.raises(ValueError):
        Marker(type=UtilityType.WIRE, kind="line", x=0.1, y=0.1)
    point = Marker(type=UtilityType.WIRE, kind="point", x=0.1, y=0.1, x2=0.5, y2=0.5)
    assert point.x2 is None and point.y2 is None
