import base64

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_HOMEOWNER, TEST_USER, wall_payload


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
    assert f".pin-{utility_type} {{ fill: {color}; }}" in html.text
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


def _seed() -> list[str]:
    """Load the sample home into TEST_HOMEOWNER's account, recorded by TEST_USER."""
    from app.api.deps import get_photo_storage
    from app.core.config import get_settings
    from app.core.database import SessionLocal
    from app.repositories import PhotoRepository, UserRepository, WallRepository
    from app.services.seed_service import SeedService

    with SessionLocal() as session:
        users = UserRepository(session)
        owner = users.get_by_email(TEST_HOMEOWNER["email"])
        trade = users.get_by_email(TEST_USER["email"])
        seed = SeedService(
            WallRepository(session),
            PhotoRepository(session),
            get_photo_storage(get_settings(), session),
        )
        return seed.seed_sample_home(owner.id, trade.id)


def test_seed_is_idempotent(client: TestClient) -> None:
    from app.services.seed_service import SAMPLE_WALLS

    first = _seed()
    second = _seed()
    assert first == second
    assert len(first) == len(SAMPLE_WALLS) == 11

    walls = {w["id"]: w for w in client.get("/api/walls").json()}
    coverages = sorted(walls[i]["coverage"] for i in first)
    assert coverages == ["full"] * 8 + ["none"] + ["partial"] * 2
    with_photo = [walls[i] for i in first if walls[i]["photo_id"]]
    assert len(with_photo) == 10
    # Every room has more than one wall.
    rooms = [walls[i]["room"] for i in first]
    assert all(rooms.count(room) >= 2 for room in rooms)
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
    first = _seed()
    wall = client.get(f"/api/walls/{first[0]}").json()
    from app.core.database import SessionLocal
    from app.models import PhotoFile

    with SessionLocal() as session:
        session.get(PhotoFile, wall["photo_id"]).data = b"corrupted"
        session.commit()

    _seed()
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


def test_sample_runs_use_snapped_routes_with_stable_ids() -> None:
    from app.services.sample_paths import SNAPPED_RUNS
    from app.services.seed_service import SAMPLE_WALLS, sample_markers

    paths = 0
    for wall in SAMPLE_WALLS:
        markers = sample_markers(wall)
        assert [m.id for m in markers] == [f"{wall.key}-{i}" for i in range(len(markers))]
        for index, marker in enumerate(markers):
            if (wall.key, index) in SNAPPED_RUNS:
                assert marker.kind == "path" and len(marker.points) >= 2
                assert (marker.x, marker.y) == (marker.points[0].x, marker.points[0].y)
                paths += 1
            if marker.type == "framing":
                assert marker.kind == "line"  # studs really are straight
    assert paths == len(SNAPPED_RUNS) > 5
