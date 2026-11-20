"""Who can do what. Rules live in app/api/access.py.

Homeowners are read-only. A tradesperson records walls into a homeowner's account by
email and edits the walls they recorded. Another tradesperson can edit a home's walls
only after the homeowner approves their access request.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import OUTBOX, TEST_HOMEOWNER, confirm_email, last_email, wall_payload
from tests.helpers import upload, wall_ids

HOME = TEST_HOMEOWNER["email"]


@pytest.fixture
def wall(client: TestClient, uploaded_photo: dict) -> dict:
    response = client.post("/api/walls", json=wall_payload(uploaded_photo["id"], room="Kitchen"))
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def electrician(account) -> TestClient:
    return account("eli@example.com", "tradesperson", "Eli Electric")


# ---- homeowners are read-only ------------------------------------------------------


def test_wall_lands_in_homeowner_account(
    client: TestClient, homeowner_client: TestClient, wall: dict
) -> None:
    assert wall["owner"]["email"] == HOME
    assert wall["created_by"]["email"] == "plumber@example.com"
    assert (wall["can_edit"], wall["can_delete"]) == (True, True)

    seen = homeowner_client.get(f"/api/walls/{wall['id']}").json()
    assert (seen["can_edit"], seen["can_delete"]) == (False, False)
    for suffix in ("", "/thumbnail", "/meta"):
        assert homeowner_client.get(f"/api/photos/{wall['photo_id']}{suffix}").status_code == 200


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("post", "/api/walls", "new"),
        ("put", "/api/walls/{id}", "edit"),
        ("delete", "/api/walls/{id}", None),
    ],
)
def test_homeowner_cannot_record_edit_or_delete(
    homeowner_client: TestClient, wall: dict, method: str, path: str, body: str | None
) -> None:
    payload = wall_payload(None, label="Changed") if body else None
    response = homeowner_client.request(method, path.format(id=wall["id"]), json=payload)
    assert response.status_code == 403


def test_homeowner_cannot_upload_photos(homeowner_client: TestClient, jpeg_bytes: bytes) -> None:
    files = {"file": ("w.jpg", jpeg_bytes, "image/jpeg")}
    assert homeowner_client.post("/api/photos", files=files).status_code == 403


def test_other_homeowner_cannot_reach_wall(account, wall: dict) -> None:
    neighbor = account("neighbor@example.com", "homeowner")
    assert wall["id"] not in wall_ids(neighbor)
    for suffix in ("", "/export.pdf", "/export.html", "/export.json"):
        assert neighbor.get(f"/api/walls/{wall['id']}{suffix}").status_code == 404
    assert neighbor.get(f"/api/photos/{wall['photo_id']}").status_code == 404


# ---- tradespeople -----------------------------------------------------------------


def test_tradesperson_sees_only_their_walls_until_granted(
    client: TestClient, electrician: TestClient, wall: dict, jpeg_bytes: bytes
) -> None:
    theirs = electrician.post(
        "/api/walls", json=wall_payload(upload(electrician, jpeg_bytes), room="Garage")
    ).json()
    assert theirs["id"] in wall_ids(electrician)
    assert wall["id"] not in wall_ids(electrician)
    assert theirs["id"] not in wall_ids(client)
    assert electrician.get(f"/api/walls/{wall['id']}").status_code == 404
    assert electrician.put(f"/api/walls/{wall['id']}", json=wall_payload(None)).status_code == 404


def test_edits_bump_the_revision(client: TestClient, wall: dict) -> None:
    saved = client.put(
        f"/api/walls/{wall['id']}", json=wall_payload(wall["photo_id"], notes="Rechecked")
    ).json()
    assert saved["revision"] == wall["revision"] + 1
    assert saved["last_edited_by"]["email"] == "plumber@example.com"
    assert saved["owner"]["email"] == HOME  # editing never moves the wall


def test_tradesperson_must_name_a_homeowner(client: TestClient, account) -> None:
    account("other-trade@example.com", "tradesperson")
    no_email = wall_payload(None)
    del no_email["homeowner_email"]
    assert client.post("/api/walls", json=no_email).status_code == 422
    trade_email = client.post(
        "/api/walls", json=wall_payload(None, homeowner_email="other-trade@example.com")
    )
    assert trade_email.status_code == 422
    assert "tradesperson account" in trade_email.json()["detail"]


# ---- edit-access requests -----------------------------------------------------------


def _request(trade: TestClient, email: str = HOME) -> dict:
    response = trade.post("/api/access-requests", json={"homeowner_email": email, "message": "Hi"})
    assert response.status_code == 201, response.text
    return response.json()


def _decide(owner: TestClient, grant_id: str, decision: str) -> int:
    response = owner.post(f"/api/access-requests/{grant_id}/decision", json={"decision": decision})
    return response.status_code


def test_approved_tradesperson_can_view_and_edit_but_not_delete(
    homeowner_client: TestClient, electrician: TestClient, wall: dict
) -> None:
    grant = _request(electrician)
    assert grant["status"] == "pending"
    listed = homeowner_client.get("/api/access-requests").json()
    assert any(
        g["id"] == grant["id"] and g["tradesperson"]["name"] == "Eli Electric" for g in listed
    )
    assert wall["id"] not in wall_ids(electrician)

    assert _decide(homeowner_client, grant["id"], "approve") == 200
    assert wall["id"] in wall_ids(electrician)
    seen = electrician.get(f"/api/walls/{wall['id']}").json()
    assert (seen["can_edit"], seen["can_delete"]) == (True, False)
    assert electrician.get(f"/api/photos/{wall['photo_id']}").status_code == 200

    edited = electrician.put(
        f"/api/walls/{wall['id']}", json=wall_payload(wall["photo_id"], label="Corrected")
    )
    assert edited.status_code == 200
    assert edited.json()["last_edited_by"]["name"] == "Eli Electric"
    assert electrician.delete(f"/api/walls/{wall['id']}").status_code == 403

    # Revoking removes access again; a new request starts over as pending.
    assert _decide(homeowner_client, grant["id"], "revoke") == 200
    assert electrician.get(f"/api/walls/{wall['id']}").status_code == 404
    assert _request(electrician)["status"] == "pending"
    assert _decide(homeowner_client, grant["id"], "decline") == 200
    assert electrician.get(f"/api/walls/{wall['id']}").status_code == 404


def test_access_request_rules(
    client: TestClient, homeowner_client: TestClient, account, electrician: TestClient
) -> None:
    unknown = electrician.post("/api/access-requests", json={"homeowner_email": "x@nowhere.io"})
    assert unknown.status_code == 422
    assert (
        homeowner_client.post("/api/access-requests", json={"homeowner_email": HOME}).status_code
        == 403
    )

    grant = _request(electrician)
    neighbor = account("neighbor@example.com", "homeowner")
    assert _decide(neighbor, grant["id"], "approve") == 404  # not their request
    assert _decide(client, grant["id"], "approve") == 403  # tradespeople can't decide
    if grant["status"] == "pending":
        assert _decide(homeowner_client, grant["id"], "revoke") == 409  # not approved yet


# ---- invitations -------------------------------------------------------------------


def test_lookup_reports_status_without_names(client: TestClient, homeowner_client) -> None:
    def status(email: str) -> str:
        response = client.get("/api/homeowners/lookup", params={"email": email})
        assert "name" not in response.json()
        return response.json()["status"]

    assert status(HOME.upper()) == "registered"
    assert status("plumber@example.com") == "not_a_homeowner"
    assert status("brand-new@example.com") == "not_registered"
    assert homeowner_client.get("/api/homeowners/lookup", params={"email": HOME}).status_code == 403


def test_invited_homeowner_receives_waiting_walls_on_sign_up(
    client: TestClient, uploaded_photo: dict, anon_client: TestClient
) -> None:
    email = "invitee@example.com"
    refused = client.post(
        "/api/walls", json=wall_payload(uploaded_photo["id"], homeowner_email=email)
    )
    assert refused.status_code == 422
    assert "Invite the homeowner" in refused.json()["detail"]

    wall = client.post(
        "/api/walls",
        json=wall_payload(uploaded_photo["id"], homeowner_email=email, invite=True, room="Attic"),
    ).json()
    assert wall["owner"] is None
    assert wall["pending_owner_email"] == email
    summary = next(w for w in client.get("/api/walls").json() if w["id"] == wall["id"])
    assert summary["pending_owner_email"] == email

    invite = client.post("/api/invites", json={"email": email.upper()})
    assert invite.status_code == 200
    body = invite.json()
    assert body["emailed"] is True
    assert "/register?" in body["invite_url"] and "invitee%40example.com" in body["invite_url"]
    assert body["invite_url"] in last_email(email)[2]

    signed_up = anon_client.post(
        "/api/auth/register",
        json={"name": "New Owner", "email": email, "password": "long-enough", "role": "homeowner"},
    )
    assert signed_up.status_code == 201
    # Nothing moves until they prove they own the email address.
    assert anon_client.get(f"/api/walls/{wall['id']}").status_code == 403
    assert client.get(f"/api/walls/{wall['id']}").json()["pending_owner_email"] == email
    assert client.get("/api/homeowners/lookup", params={"email": email}).json()["status"] == (
        "unconfirmed"
    )
    unconfirmed = client.post("/api/invites", json={"email": email})
    assert unconfirmed.status_code == 409 and "hasn't confirmed" in unconfirmed.json()["detail"]

    assert confirm_email(anon_client, email)["walls_received"] == 1
    claimed = anon_client.get(f"/api/walls/{wall['id']}").json()
    assert claimed["owner"]["email"] == email
    assert claimed["pending_owner_email"] is None
    assert anon_client.get(f"/api/photos/{wall['photo_id']}").status_code == 200
    assert client.post("/api/invites", json={"email": email}).status_code == 409


def test_invites_only_for_people_sent_a_wall(client: TestClient) -> None:
    response = client.post("/api/invites", json={"email": "stranger@example.com"})
    assert response.status_code == 422


def test_invite_emails_are_throttled(client: TestClient, uploaded_photo: dict) -> None:
    email = "mailme@example.com"
    client.post(
        "/api/walls", json=wall_payload(uploaded_photo["id"], homeowner_email=email, invite=True)
    )
    before = len(OUTBOX)
    first = client.post("/api/invites", json={"email": email}).json()
    second = client.post("/api/invites", json={"email": email}).json()
    assert first["emailed"] is True and second["emailed"] is False
    assert len(OUTBOX) == before + 1
    to, subject, body = OUTBOX[-1]
    assert to == email and "Test Plumber" in subject and first["invite_url"] in body


def test_walls_for_an_unconfirmed_homeowner_are_held(
    client: TestClient, uploaded_photo: dict, anon_client: TestClient
) -> None:
    email = "squatter-target@example.com"
    anon_client.post(
        "/api/auth/register",
        json={"name": "Someone", "email": email, "password": "long-enough", "role": "homeowner"},
    )
    # No invite needed (they signed up), but the wall waits for them to confirm.
    wall = client.post(
        "/api/walls", json=wall_payload(uploaded_photo["id"], homeowner_email=email)
    ).json()
    assert wall["owner"] is None and wall["pending_owner_email"] == email
    refused = client.post("/api/access-requests", json={"homeowner_email": email})
    assert refused.status_code == 422
