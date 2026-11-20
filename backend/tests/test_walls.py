from fastapi.testclient import TestClient

from tests.conftest import wall_payload


def test_create_read_update_delete_wall(client: TestClient, uploaded_photo: dict) -> None:
    created = client.post("/api/walls", json=wall_payload(uploaded_photo["id"]))
    assert created.status_code == 201, created.text
    wall = created.json()
    assert wall["schema_version"] == 2
    assert len(wall["markers"]) == 1
    assert wall["markers"][0]["id"]

    listed = client.get("/api/walls").json()
    summary = next(w for w in listed if w["id"] == wall["id"])
    assert summary["marker_count"] == 1
    assert "markers" not in summary

    updated = client.put(
        f"/api/walls/{wall['id']}",
        json=wall_payload(uploaded_photo["id"], label="Wall left of sink"),
    )
    assert updated.status_code == 200
    assert updated.json()["label"] == "Wall left of sink"

    assert client.delete(f"/api/walls/{wall['id']}").status_code == 204
    assert client.get(f"/api/walls/{wall['id']}").status_code == 404


def test_wall_without_photo_cannot_have_markers(client: TestClient) -> None:
    payload = wall_payload(None)
    payload["markers"] = [{"type": "wire", "x": 0.1, "y": 0.1, "measurement": "x"}]
    assert client.post("/api/walls", json=payload).status_code == 422


def test_unknown_photo_id_is_rejected(client: TestClient) -> None:
    assert client.post("/api/walls", json=wall_payload("nope")).status_code == 422


def test_partial_coverage_keeps_region_and_full_drops_it(
    client: TestClient, uploaded_photo: dict
) -> None:
    region = {"x": 0, "y": 0, "width": 1, "height": 0.5}
    partial = client.post(
        "/api/walls",
        json=wall_payload(uploaded_photo["id"], coverage="partial", uncovered_region=region),
    ).json()
    assert partial["uncovered_region"] == region

    full = client.post(
        "/api/walls",
        json=wall_payload(uploaded_photo["id"], coverage="full", uncovered_region=region),
    ).json()
    assert full["uncovered_region"] is None


def test_records_survive_new_session(client: TestClient, uploaded_photo: dict) -> None:
    """R6: fields and photo remain after the app is closed and reopened."""
    from app.main import app

    wall = client.post("/api/walls", json=wall_payload(uploaded_photo["id"])).json()

    with TestClient(app, cookies=dict(client.cookies)) as reopened:
        again = reopened.get(f"/api/walls/{wall['id']}").json()
        assert again == wall
        photo = reopened.get(f"/api/photos/{uploaded_photo['id']}")
        assert photo.status_code == 200


def test_calibration_and_line_markers_round_trip(client: TestClient, uploaded_photo: dict) -> None:
    calibration = {
        "top_left": {"x": 0.1, "y": 0.1},
        "bottom_right": {"x": 0.9, "y": 0.9},
        "width": 120,
        "height": 96,
        "unit": "in",
    }
    line = {
        "type": "wire",
        "kind": "line",
        "x": 0.1,
        "y": 0.5,
        "x2": 0.9,
        "y2": 0.5,
        "measurement": "",
    }
    payload = wall_payload(uploaded_photo["id"], calibration=calibration, markers=[line])
    created = client.post("/api/walls", json=payload)
    assert created.status_code == 201, created.text
    wall = created.json()
    assert wall["calibration"] == calibration
    assert wall["markers"][0]["kind"] == "line"
    assert wall["markers"][0]["x2"] == 0.9


def test_calibration_dropped_without_photo(client: TestClient) -> None:
    calibration = {
        "top_left": {"x": 0.1, "y": 0.1},
        "bottom_right": {"x": 0.9, "y": 0.9},
        "width": 120,
        "height": 96,
    }
    wall = client.post("/api/walls", json=wall_payload(None, calibration=calibration)).json()
    assert wall["calibration"] is None


def _path_payload(photo_id: str) -> dict:
    calibration = {
        "top_left": {"x": 0.0, "y": 0.0},
        "bottom_right": {"x": 1.0, "y": 1.0},
        "width": 100,
        "height": 100,
        "unit": "in",
    }
    # An L-shaped run: 50 in across, then 40 in down (90 in along the path).
    points = [{"x": 0.1, "y": 0.2}, {"x": 0.6, "y": 0.2}, {"x": 0.6, "y": 0.6}]
    return wall_payload(
        photo_id,
        calibration=calibration,
        markers=[
            {
                "type": "wire",
                "kind": "path",
                "x": 0,
                "y": 0,
                "points": points,
                "measurement": "",
                "reference_point": "",
            }
        ],
    )


def test_freehand_path_round_trips_and_syncs_endpoints(
    client: TestClient, uploaded_photo: dict
) -> None:
    created = client.post("/api/walls", json=_path_payload(uploaded_photo["id"]))
    assert created.status_code == 201, created.text
    marker = created.json()["markers"][0]
    assert marker["kind"] == "path"
    assert len(marker["points"]) == 3
    # First and last points double as the endpoints for line-only readers.
    assert (marker["x"], marker["y"], marker["x2"], marker["y2"]) == (0.1, 0.2, 0.6, 0.6)

    wall_id = created.json()["id"]
    html = client.get(f"/api/walls/{wall_id}/export.html").text
    assert "<polyline" in html
    # Length is measured along the path, not straight between the ends (64 in).
    assert "7 ft 6 in long" in html
    pdf = client.get(f"/api/walls/{wall_id}/export.pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")


def test_path_needs_two_points_and_points_only_on_paths(
    client: TestClient, uploaded_photo: dict
) -> None:
    one_point = _path_payload(uploaded_photo["id"])
    one_point["markers"][0]["points"] = [{"x": 0.1, "y": 0.1}]
    assert client.post("/api/walls", json=one_point).status_code == 422

    point_with_points = wall_payload(uploaded_photo["id"])
    point_with_points["markers"][0]["points"] = [{"x": 0.1, "y": 0.1}, {"x": 0.2, "y": 0.2}]
    saved = client.post("/api/walls", json=point_with_points).json()
    assert saved["markers"][0]["points"] is None
