from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from tests.conftest import OUTBOX, TEST_USER, confirm_email, last_email


def _register(**overrides) -> dict:
    payload = {"name": "Test Homeowner", "email": "owner@example.com", "password": "hunter2hunter2"}
    payload.update(overrides)
    return payload


def test_register_signs_in_and_defaults_to_homeowner(anon_client: TestClient) -> None:
    created = anon_client.post("/api/auth/register", json=_register())
    assert created.status_code == 201, created.text
    assert created.json()["role"] == "homeowner"

    me = anon_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "owner@example.com"
    assert me.json()["email_verified"] is False
    assert "password_hash" not in me.json()


def test_unconfirmed_account_cannot_reach_records_until_confirmed(anon_client: TestClient) -> None:
    email = "confirm-me@example.com"
    assert anon_client.post("/api/auth/register", json=_register(email=email)).status_code == 201
    to, subject, body = last_email(email)
    assert subject == "Confirm your email for Behind the Wall"
    assert "/verify-email?token=" in body

    blocked = anon_client.get("/api/walls")
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "Confirm your email address to continue"

    assert confirm_email(anon_client, email) == {"email": email, "walls_received": 0}
    assert anon_client.get("/api/auth/me").json()["email_verified"] is True
    assert anon_client.get("/api/walls").status_code == 200


def test_confirmation_links_are_single_use_and_replaced(anon_client: TestClient) -> None:
    email = "single-use@example.com"
    anon_client.post("/api/auth/register", json=_register(email=email))
    first_link = last_email(email)[2]
    token = first_link.split("token=")[1].split()[0]
    bad = anon_client.post("/api/auth/verify-email", json={"token": "x" * 20})
    assert bad.status_code == 400

    # Resending is throttled, then issues a new link that replaces the old one.
    assert anon_client.post("/api/auth/resend-verification").status_code == 429
    from app.core.database import SessionLocal
    from app.models import EmailVerification

    with SessionLocal() as session:  # pretend the first email went out two minutes ago
        for row in session.query(EmailVerification).all():
            row.created_at = datetime.now(UTC) - timedelta(minutes=2)
        session.commit()
    sent_before = len(OUTBOX)
    assert anon_client.post("/api/auth/resend-verification").status_code == 204
    assert len(OUTBOX) == sent_before + 1
    stale = anon_client.post("/api/auth/verify-email", json={"token": token})
    assert stale.status_code == 400
    confirm_email(anon_client, email)
    assert anon_client.post("/api/auth/resend-verification").status_code == 409


def test_unconfirmed_signup_does_not_block_the_real_owner(
    anon_client: TestClient, client: TestClient
) -> None:
    email = "real-owner@example.com"
    anon_client.post("/api/auth/register", json=_register(email=email, name="Impostor"))
    with TestClient(client.app) as owner:
        retaken = owner.post("/api/auth/register", json=_register(email=email, name="Real Owner"))
        assert retaken.status_code == 201
        confirm_email(owner, email)
        assert owner.get("/api/auth/me").json()["name"] == "Real Owner"
    # The impostor's session belonged to the replaced account and no longer works.
    assert anon_client.get("/api/auth/me").status_code == 401


def test_register_rejects_duplicate_email_case_insensitively(anon_client: TestClient) -> None:
    response = anon_client.post(
        "/api/auth/register", json={**TEST_USER, "email": TEST_USER["email"].upper()}
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "overrides",
    [{"email": "not-an-email"}, {"password": "short"}, {"name": "   "}, {"role": "admin"}],
)
def test_register_validates_fields(anon_client: TestClient, overrides: dict) -> None:
    payload = _register(**{"email": "valid@example.com", **overrides})
    assert anon_client.post("/api/auth/register", json=payload).status_code == 422


def test_login_logout_round_trip(anon_client: TestClient) -> None:
    credentials = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
    assert anon_client.post("/api/auth/login", json=credentials).status_code == 200
    assert anon_client.get("/api/walls").status_code == 200

    old_cookie = anon_client.cookies.get("btw_session")
    assert anon_client.post("/api/auth/logout").status_code == 204
    assert anon_client.get("/api/auth/me").status_code == 401

    # The server forgot the session, so replaying the old cookie does not work either.
    anon_client.cookies.set("btw_session", old_cookie)
    assert anon_client.get("/api/walls").status_code == 401


def test_login_failure_does_not_reveal_which_part_was_wrong(anon_client: TestClient) -> None:
    wrong_password = anon_client.post(
        "/api/auth/login", json={"email": TEST_USER["email"], "password": "nope-nope"}
    )
    unknown_email = anon_client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "nope-nope"}
    )
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/walls"),
        ("post", "/api/walls"),
        ("get", "/api/walls/any"),
        ("put", "/api/walls/any"),
        ("delete", "/api/walls/any"),
        ("post", "/api/photos"),
        ("get", "/api/photos/any"),
        ("get", "/api/photos/any/thumbnail"),
        ("get", "/api/photos/any/meta"),
        ("get", "/api/walls/any/export.html"),
        ("get", "/api/walls/any/export.json"),
        ("get", "/api/walls/any/export.pdf"),
        ("get", "/api/access-requests"),
        ("post", "/api/access-requests"),
        ("post", "/api/access-requests/any/decision"),
        ("get", "/api/homeowners/lookup?email=a@b.co"),
        ("post", "/api/invites"),
        ("post", "/api/auth/resend-verification"),
    ],
)
def test_record_endpoints_require_sign_in(anon_client: TestClient, method: str, path: str) -> None:
    response = anon_client.request(method, path)
    assert response.status_code == 401
    assert response.json()["detail"] == "Not signed in"


def test_health_stays_public(anon_client: TestClient) -> None:
    assert anon_client.get("/api/health").status_code == 200


def test_expired_session_is_rejected(client: TestClient, anon_client: TestClient) -> None:
    from datetime import timedelta

    from app.core.database import SessionLocal
    from app.repositories import UserRepository

    with SessionLocal() as session:
        users = UserRepository(session)
        token = users.start_session(users.get_by_email(TEST_USER["email"]), timedelta(seconds=-1))
    anon_client.cookies.set("btw_session", token)
    assert anon_client.get("/api/auth/me").status_code == 401


def test_demo_accounts_are_created_once_and_load_the_sample_home(tmp_path: Path) -> None:
    import app.models  # noqa: F401
    from app.core.config import Settings
    from app.core.database import Base
    from app.core.security import verify_password
    from app.repositories import UserRepository, Viewer, WallRepository
    from app.services.demo_accounts import DEMO_ACCOUNTS, ensure_demo_accounts

    settings = Settings(data_dir=tmp_path)
    engine = create_engine(settings.resolved_database_url)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    with Session() as session:
        created = ensure_demo_accounts(session, settings)
        assert created == [a.email for a in DEMO_ACCOUNTS]
        visible: dict[str, int] = {}
        for account in DEMO_ACCOUNTS:
            user = UserRepository(session).get_by_email(account.email)
            visible[account.role] = len(WallRepository(session).list(Viewer(user.id)))
            assert user.role == account.role
            assert user.email_verified
            assert verify_password(account.password, user.password_hash)

        # The homeowner reads the whole sample home; the tradesperson recorded all of it.
        assert visible == {"homeowner": 6, "tradesperson": 6}
        assert ensure_demo_accounts(session, settings) == []

        # A renamed demo account is put back the next time the app starts.
        user = UserRepository(session).get_by_email(DEMO_ACCOUNTS[0].email)
        user.name = "Someone Else"
        session.commit()
        ensure_demo_accounts(session, settings)
        restored = UserRepository(session).get_by_email(DEMO_ACCOUNTS[0].email)
        assert restored.name == DEMO_ACCOUNTS[0].name
