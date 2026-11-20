"""Test fixtures: each session gets a fresh SQLite database and photo directory."""

import os
import re
from collections.abc import Callable, Iterator
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


# Every email the app sends during the test run: (to, subject, body).
OUTBOX: list[tuple[str, str, str]] = []
_TOKEN = re.compile(r"/verify-email\?token=([A-Za-z0-9_-]+)")


def last_email(to: str) -> tuple[str, str, str]:
    return next(m for m in reversed(OUTBOX) if m[0] == to.lower())


def confirm_email(client: TestClient, email: str) -> dict:
    """Click the link in the latest confirmation email sent to ``email``."""
    match = _TOKEN.search(last_email(email)[2])
    assert match, "no confirmation link in the email"
    response = client.post("/api/auth/verify-email", json={"token": match.group(1)})
    assert response.status_code == 200, response.text
    return response.json()


def register_confirmed(client: TestClient, payload: dict) -> None:
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201, response.text
    confirm_email(client, payload["email"])


@pytest.fixture(scope="session")
def client(data_dir: Path) -> Iterator[TestClient]:
    """A client signed in as the TEST_USER tradesperson; its cookie jar carries the session."""
    # Import after the env var is set so settings and engine pick up the temp dir.
    from app.api.deps import get_mailer
    from app.main import app
    from app.services.mailer import Mailer

    class OutboxMailer(Mailer):
        """Stands in for SMTP: 'sends' by appending to OUTBOX."""

        def __init__(self) -> None:
            pass

        configured = True

        def send(self, to: str, subject: str, body: str) -> None:
            OUTBOX.append((to.lower(), subject, body))

    app.dependency_overrides[get_mailer] = OutboxMailer
    with TestClient(app) as test_client:
        with TestClient(app) as owner:
            register_confirmed(owner, TEST_HOMEOWNER)
        register_confirmed(test_client, TEST_USER)
        yield test_client
    app.dependency_overrides.pop(get_mailer, None)


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
            register_confirmed(test_client, body)
        return test_client

    yield sign_in
    for test_client in opened:
        test_client.__exit__(None, None, None)
