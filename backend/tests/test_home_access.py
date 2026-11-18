"""Home isolation must hold for every route, not just the wall list."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.conftest import wall_payload


@pytest.fixture
def accounts(client):
    with ExitStack() as stack:
        result = []
        for role in ("homeowner", "homeowner", "tradesperson", "tradesperson"):
            actor = stack.enter_context(TestClient(client.app))
            response = actor.post(
                "/api/auth/register",
                json={
                    "name": role,
                    "email": f"{uuid4().hex}@example.com",
                    "password": "test-password",
                    "role": role,
                },
            )
            assert response.status_code == 201, response.text
            result.append(actor)
        yield result


def home_of(actor):
    return actor.get("/api/homes").json()[0]["id"]


def invite(owner, home_id, permission="viewer"):
    response = owner.post(f"/api/homes/{home_id}/invitations", json={"permission": permission})
    assert response.status_code == 201, response.text
    return response.json()


def join(actor, invitation):
    return actor.post("/api/homes/accept-invitation", json={"token": invitation["token"]})


def test_homeowners_get_private_homes_and_contractors_need_invitations(accounts):
    owner, stranger, contractor, _ = accounts
    assert home_of(owner) != home_of(stranger)
    assert contractor.get("/api/homes").json() == []
    assert contractor.post("/api/homes", json={"name": "Uninvited"}).status_code == 403
    assert contractor.post("/api/walls", json=wall_payload()).status_code == 400
    assert owner.post("/api/homes", json={"name": "  "}).status_code == 422


@pytest.mark.parametrize("route", ["wall", "html", "json", "photo", "thumbnail", "meta", "list"])
def test_other_accounts_cannot_read_records_or_photo_bytes(accounts, jpeg_bytes, route):
    owner, stranger, _, _ = accounts
    photo = owner.post("/api/photos", files={"file": ("x.jpg", jpeg_bytes)}).json()
    wall = owner.post("/api/walls", json=wall_payload(photo["id"])).json()
    paths = {
        "wall": f"/api/walls/{wall['id']}",
        "html": f"/api/walls/{wall['id']}/export.html",
        "json": f"/api/walls/{wall['id']}/export.json",
        "photo": f"/api/photos/{photo['id']}",
        "thumbnail": f"/api/photos/{photo['id']}/thumbnail",
        "meta": f"/api/photos/{photo['id']}/meta",
        "list": f"/api/walls?home_id={home_of(owner)}",
    }
    assert stranger.get(paths[route]).status_code == 404
    assert stranger.get("/api/walls").json() == []
    assert stranger.put(f"/api/walls/{wall['id']}", json=wall_payload()).status_code == 404
    assert stranger.delete(f"/api/walls/{wall['id']}").status_code == 404


@pytest.mark.parametrize("permission", ["viewer", "editor"])
def test_grants_enforce_write_permissions_and_removal(accounts, jpeg_bytes, permission):
    owner, _, contractor, _ = accounts
    home_id = home_of(owner)
    photo = owner.post("/api/photos", files={"file": ("x.jpg", jpeg_bytes)}).json()
    wall = owner.post("/api/walls", json=wall_payload(photo["id"])).json()
    invitation = invite(owner, home_id, permission)
    accepted = join(contractor, invitation)
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["permission"] == permission
    assert join(contractor, invitation).status_code == 200  # safe retry
    assert contractor.get(f"/api/walls/{wall['id']}").status_code == 200
    assert contractor.get(f"/api/walls/{wall['id']}/export.html").status_code == 200
    assert contractor.get(f"/api/photos/{photo['id']}").status_code == 200
    expected = 403 if permission == "viewer" else 201
    added = contractor.post("/api/walls", json=wall_payload())
    assert added.status_code == expected, added.text
    assert contractor.put(
        f"/api/walls/{wall['id']}", json=wall_payload(photo["id"])
    ).status_code == (403 if permission == "viewer" else 200)
    assert (
        contractor.post("/api/photos", files={"file": ("x.jpg", jpeg_bytes)}).status_code
        == expected
    )
    assert contractor.post("/api/seed/sample-home").status_code == (
        403 if permission == "viewer" else 200
    )
    assert contractor.delete(f"/api/walls/{wall['id']}").status_code == (
        403 if permission == "viewer" else 204
    )
    assert contractor.get(f"/api/homes/{home_id}/members").status_code == 403
    assert contractor.post(f"/api/homes/{home_id}/invitations", json={}).status_code == 403
    contractor_id = contractor.get("/api/auth/me").json()["id"]
    assert owner.delete(f"/api/homes/{home_id}/members/{contractor_id}").status_code == 204
    assert contractor.get("/api/homes").json() == []
    assert contractor.get(f"/api/photos/{photo['id']}").status_code == 404
    assert join(contractor, invitation).status_code == 409  # used links cannot undo removal


def test_photos_cannot_be_attached_to_another_home(accounts, jpeg_bytes):
    owner, stranger, _, _ = accounts
    photo = owner.post("/api/photos", files={"file": ("x.jpg", jpeg_bytes)}).json()
    assert stranger.post("/api/walls", json=wall_payload(photo["id"])).status_code == 422
    second = owner.post("/api/homes", json={"name": "Second home"}).json()
    assert owner.get("/api/walls").status_code == 400  # cannot guess among multiple homes
    assert (
        owner.post(f"/api/walls?home_id={second['id']}", json=wall_payload(photo["id"])).status_code
        == 422
    )


def test_invitation_is_single_use_revocable_expiring_and_stored_hashed(accounts):
    from app.core.database import SessionLocal
    from app.models import HomeInvitation

    owner, stranger, contractor, other = accounts
    home_id = home_of(owner)
    invitation = invite(owner, home_id)
    assert stranger.get(f"/api/homes/{home_id}/members").status_code == 404
    assert (
        stranger.delete(f"/api/homes/{home_id}/invitations/{invitation['id']}").status_code == 404
    )
    with SessionLocal() as session:
        row = session.get(HomeInvitation, invitation["id"])
        assert row.token_hash != invitation["token"]
        row.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()
    assert join(contractor, invitation).status_code == 404
    pending = invite(owner, home_id)
    assert "token" not in owner.get(f"/api/homes/{home_id}/invitations").json()[0]
    assert owner.delete(f"/api/homes/{home_id}/invitations/{pending['id']}").status_code == 204
    assert join(contractor, pending).status_code == 404
    one_use = invite(owner, home_id)
    assert join(contractor, one_use).status_code == 200
    assert join(other, one_use).status_code == 409
    assert join(owner, invite(owner, home_id)).status_code == 400


def test_concurrent_acceptance_grants_access_to_only_one_account(accounts):
    owner, _, first, second = accounts
    home_id = home_of(owner)
    invitation = invite(owner, home_id)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda actor: join(actor, invitation), (first, second)))
    assert sorted(response.status_code for response in responses) == [200, 409]
    assert len(owner.get(f"/api/homes/{home_id}/members").json()) == 1


def test_loading_samples_is_private_and_does_not_reset_another_home(accounts):
    owner, stranger, _, _ = accounts
    first_ids = owner.post("/api/seed/sample-home").json()["wall_ids"]
    other_ids = stranger.post("/api/seed/sample-home").json()["wall_ids"]
    assert set(first_ids).isdisjoint(other_ids)
    edited = owner.get(f"/api/walls/{first_ids[0]}").json()
    edited["notes"] = "Keep this edit"
    assert owner.put(f"/api/walls/{first_ids[0]}", json=edited).status_code == 200
    stranger.post("/api/seed/sample-home")
    assert owner.get(f"/api/walls/{first_ids[0]}").json()["notes"] == "Keep this edit"


def test_legacy_records_are_preserved_without_assigning_an_unknown_owner(accounts):
    from app.core.database import SessionLocal
    from app.models import Wall
    from app.repositories import WallRepository
    from app.schemas import WallCreate

    with SessionLocal() as session:
        legacy = WallRepository(session).create(WallCreate(**wall_payload()))
        legacy_id = legacy.id
    for actor in accounts:
        assert actor.get(f"/api/walls/{legacy_id}").status_code == 404
    with SessionLocal() as session:
        assert session.scalar(select(Wall.id).where(Wall.id == legacy_id)) == legacy_id
