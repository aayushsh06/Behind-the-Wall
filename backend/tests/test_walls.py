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
