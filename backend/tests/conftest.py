"""Test fixtures: each session gets a fresh SQLite database and photo directory."""

import os
import sys
from collections.abc import Callable, Iterator
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture(scope="session")
def data_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    # The engine is created when app.core.database is first imported. If a test module
    # imported app code at the top, it would already point at the real backend/data
    # database; refuse to run rather than write test accounts into it.
    if "app.core.database" in sys.modules:
        pytest.exit(
            "app.core.database was imported before the test data directory was set. "
            "Import app modules inside test functions, not at the top of test files.",
            returncode=2,
        )
    path = tmp_path_factory.mktemp("btw-data")
    os.environ["BTW_DATA_DIR"] = str(path)
    # Tests create the accounts they need; the demo logins are covered in test_auth.py.
    os.environ["BTW_DEMO_ACCOUNTS"] = "false"
    return path


# The tradesperson who records walls in most tests, and the homeowner they record for.
TEST_USER = {
    "name": "Test Plumber",
    "email": "plumber@example.com",
    "password": "correct-horse",
    "role": "tradesperson",
}
TEST_HOMEOWNER = {
    "name": "Test Homeowner",
    "email": "home@example.com",
    "password": "correct-horse",
    "role": "homeowner",
}


@pytest.fixture(scope="session")
def client(data_dir: Path) -> Iterator[TestClient]:
    """A client signed in as the TEST_USER tradesperson; its cookie jar carries the session."""
    # Import after the env var is set so settings and engine pick up the temp dir.
    from app.main import app

    with TestClient(app) as test_client:
        with TestClient(app) as owner:
            response = owner.post("/api/auth/register", json=TEST_HOMEOWNER)
            assert response.status_code == 201, response.text
        response = test_client.post("/api/auth/register", json=TEST_USER)
        assert response.status_code == 201, response.text
        yield test_client


@pytest.fixture
def homeowner_client(client: TestClient) -> Iterator[TestClient]:
    """A client signed in as TEST_HOMEOWNER (read-only)."""
    with TestClient(client.app) as test_client:
        credentials = {"email": TEST_HOMEOWNER["email"], "password": TEST_HOMEOWNER["password"]}
        assert test_client.post("/api/auth/login", json=credentials).status_code == 200
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
        "homeowner_email": TEST_HOMEOWNER["email"],
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


PASSWORD = "another-secret"


@pytest.fixture
def account(client: TestClient) -> Iterator[Callable[..., TestClient]]:
    """Factory for extra signed-in accounts on the same app (registered once per run)."""
    opened: list[TestClient] = []

    def sign_in(email: str, role: str, name: str | None = None) -> TestClient:
        test_client = TestClient(client.app)
        test_client.__enter__()
        opened.append(test_client)
        credentials = {"email": email, "password": PASSWORD}
        if test_client.post("/api/auth/login", json=credentials).status_code == 401:
            body = {**credentials, "role": role, "name": name or email.split("@")[0].title()}
            response = test_client.post("/api/auth/register", json=body)
            assert response.status_code == 201, response.text
        return test_client

    yield sign_in
    for test_client in opened:
        test_client.__exit__(None, None, None)
