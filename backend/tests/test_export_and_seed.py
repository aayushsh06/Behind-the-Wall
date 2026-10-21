import base64

from fastapi.testclient import TestClient

from tests.conftest import wall_payload


def test_html_export_is_self_contained(client: TestClient, uploaded_photo: dict) -> None:
    wall = client.post("/api/walls", json=wall_payload(uploaded_photo["id"])).json()
    response = client.get(f"/api/walls/{wall['id']}/export.html")
    assert response.status_code == 200
    html = response.text
    assert "data:image/jpeg;base64," in html
    assert "Wall behind sink" in html
    assert "Test Plumber" in html
    assert "18 in above floor" in html
    assert "Entire wall documented" in html
    assert (
        'inline; filename="behind-the-wall-kitchen-wall-behind-sink.html"'
        in response.headers["content-disposition"]
    )

    download = client.get(f"/api/walls/{wall['id']}/export.html?download=true")
    assert download.headers["content-disposition"].startswith("attachment;")


def test_json_export_round_trips_photo(client: TestClient, uploaded_photo: dict) -> None:
    wall = client.post("/api/walls", json=wall_payload(uploaded_photo["id"])).json()
    payload = client.get(f"/api/walls/{wall['id']}/export.json").json()
    assert payload["format"] == "behind-the-wall/wall"
    assert payload["wall"]["id"] == wall["id"]
    original = client.get(f"/api/photos/{uploaded_photo['id']}").content
    assert base64.b64decode(payload["photo"]["data_base64"]) == original


def test_seed_is_idempotent(client: TestClient) -> None:
    first = client.post("/api/seed/sample-home").json()["wall_ids"]
    second = client.post("/api/seed/sample-home").json()["wall_ids"]
    assert first == second
    assert len(first) == 6

    walls = {w["id"]: w for w in client.get("/api/walls").json()}
    coverages = sorted(walls[i]["coverage"] for i in first)
    assert coverages == ["full", "full", "full", "none", "partial", "partial"]
    with_photo = [walls[i] for i in first if walls[i]["photo_id"]]
    assert len(with_photo) == 5
    for wall_id in first:
        wall = client.get(f"/api/walls/{wall_id}").json()
        if wall["photo_id"]:
            assert wall["calibration"] is not None, wall["label"]
            assert (
                any(m["kind"] == "line" for m in wall["markers"]) or wall["label"] == "Closet wall"
            )
    thumb = client.get(f"/api/photos/{with_photo[0]['photo_id']}/thumbnail")
    assert thumb.status_code == 200


def test_html_export_shows_computed_positions_and_lines(
    client: TestClient, uploaded_photo: dict
) -> None:
    calibration = {
        "top_left": {"x": 0.0, "y": 0.0},
        "bottom_right": {"x": 1.0, "y": 1.0},
        "width": 120,
        "height": 96,
        "unit": "in",
    }
    markers = [
        {"type": "pipe", "kind": "point", "x": 0.5, "y": 0.5, "measurement": ""},
        {
            "type": "wire",
            "kind": "line",
            "x": 0.0,
            "y": 0.75,
            "x2": 1.0,
            "y2": 0.75,
            "measurement": "",
        },
    ]
    wall = client.post(
        "/api/walls",
        json=wall_payload(uploaded_photo["id"], calibration=calibration, markers=markers),
    ).json()
    html = client.get(f"/api/walls/{wall['id']}/export.html").text
    assert "Wall 10 ft 0 in wide" in html
    assert "5 ft 0 in from left, 4 ft 0 in above floor" in html
    assert "Horizontal run, 10 ft 0 in long" in html
    assert 'class="seg"' in html
