import base64

import pytest
from fastapi.testclient import TestClient

from tests.conftest import wall_payload


@pytest.mark.parametrize(
    ("utility_type", "label", "color"),
    [("water", "Water", "#0284c7"), ("gas", "Gas", "#c2410c"), ("pipe", "Pipe", "#1f6feb")],
)
@pytest.mark.parametrize("kind", ["point", "line"])
def test_pipe_categories_survive_edit_and_export(
    client: TestClient, uploaded_photo: dict, utility_type: str, label: str, color: str, kind: str
) -> None:
    # Existing generic pipes can be opened and explicitly reclassified, or kept as pipes.
    created = client.post("/api/walls", json=wall_payload(uploaded_photo["id"]))
    assert created.status_code == 201, created.text
    wall = created.json()
    marker = wall["markers"][0]
    assert marker["type"] == "pipe"
    marker.update(type=utility_type, kind=kind)
    if kind == "line":
        marker.update(x2=0.8, y2=0.6)

    updated = client.put(
        f"/api/walls/{wall['id']}",
        json=wall_payload(uploaded_photo["id"], markers=[marker]),
    )
    assert updated.status_code == 200, updated.text
    saved = client.get(f"/api/walls/{wall['id']}").json()["markers"][0]
    assert saved["id"] == marker["id"]
    assert saved["type"] == utility_type
    assert saved["kind"] == kind

    html = client.get(f"/api/walls/{wall['id']}/export.html")
    assert html.status_code == 200, html.text
    assert f"<td>{label}" in html.text
    assert f'.pin-{utility_type} {{ fill: {color}; }}' in html.text
    assert f'class="pin-{utility_type}"' in html.text
    if kind == "line":
        assert f'class="seg" stroke="{color}"' in html.text
    exported = client.get(f"/api/walls/{wall['id']}/export.json").json()["wall"]["markers"][0]
    assert exported == saved


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
            assert any(m["kind"] == "line" for m in wall["markers"]), wall["label"]
            meta = client.get(f"/api/photos/{wall['photo_id']}/meta").json()
            assert meta["width"] > 200 and meta["height"] > 200, wall["label"]
    thumb = client.get(f"/api/photos/{with_photo[0]['photo_id']}/thumbnail")
    assert thumb.status_code == 200


def test_seed_refreshes_replaced_photo(client: TestClient) -> None:
    """Loading the sample home again rewrites photo bytes, so swapped assets take effect."""
    from app.api.deps import get_photo_storage
    from app.core.config import get_settings

    first = client.post("/api/seed/sample-home").json()["wall_ids"]
    wall = client.get(f"/api/walls/{first[0]}").json()
    storage = get_photo_storage(get_settings())
    storage.path_for(wall["photo_id"]).write_bytes(b"corrupted")

    client.post("/api/seed/sample-home")
    photo = client.get(f"/api/photos/{wall['photo_id']}")
    assert photo.status_code == 200
    assert photo.content[:2] == b"\xff\xd8"  # JPEG magic bytes


def test_sample_crops_produce_distinct_photos() -> None:
    from app.services.seed_service import SAMPLE_WALLS, load_sample_image

    by_key = {w.key: w for w in SAMPLE_WALLS}
    assert by_key["kitchen-stove"].photo and by_key["bath-vanity"].photo
    stove = load_sample_image(by_key["kitchen-stove"].photo)
    vanity = load_sample_image(by_key["bath-vanity"].photo)
    assert stove != vanity


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
