"""Shared helpers for tests that sign in several accounts on one app."""

from fastapi.testclient import TestClient


def upload(client: TestClient, jpeg_bytes: bytes) -> str:
    response = client.post("/api/photos", files={"file": ("w.jpg", jpeg_bytes, "image/jpeg")})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def wall_ids(client: TestClient) -> set[str]:
    return {w["id"] for w in client.get("/api/walls").json()}
