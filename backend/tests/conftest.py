"""Test fixtures: each session gets a fresh SQLite database and photo directory."""

import os
from collections.abc import Iterator
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture(scope="session")
def data_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("btw-data")
    os.environ["BTW_DATA_DIR"] = str(path)
    # Tests create the accounts they need; the demo logins are covered in test_auth.py.
    os.environ["BTW_DEMO_ACCOUNTS"] = "false"
    return path


TEST_USER = {
    "name": "Test Plumber",
    "email": "plumber@example.com",
    "password": "correct-horse",
    "role": "tradesperson",
}


@pytest.fixture(scope="session")
def client(data_dir: Path) -> Iterator[TestClient]:
    """A client signed in as TEST_USER; its cookie jar carries the session."""
    # Import after the env var is set so settings and engine pick up the temp dir.
    from app.main import app

    with TestClient(app) as test_client:
        response = test_client.post("/api/auth/register", json=TEST_USER)
        assert response.status_code == 201, response.text
        yield test_client


@pytest.fixture
def anon_client(client: TestClient) -> Iterator[TestClient]:
    """A second client on the same app with no session cookie."""
    with TestClient(client.app) as test_client:
        yield test_client


@pytest.fixture
def jpeg_bytes() -> bytes:
    image = Image.new("RGB", (2400, 1600), (200, 180, 160))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def uploaded_photo(client: TestClient, jpeg_bytes: bytes) -> dict:
    response = client.post("/api/photos", files={"file": ("wall.jpg", jpeg_bytes, "image/jpeg")})
    assert response.status_code == 201, response.text
    return response.json()


def wall_payload(photo_id: str | None = None, **overrides) -> dict:
    payload = {
        "room": "Kitchen",
        "label": "Wall behind sink",
        "author": "Test Plumber",
        "observed_date": "2026-03-04",
        "coverage": "full",
        "photo_id": photo_id,
        "markers": [],
        "notes": "",
    }
    if photo_id:
        payload["markers"] = [
            {
                "type": "pipe",
                "x": 0.4,
                "y": 0.6,
                "measurement": "18 in above floor",
                "reference_point": "Left of drain",
            }
        ]
    payload.update(overrides)
    return payload
