from fastapi.testclient import TestClient


def test_upload_resizes_and_serves_photo(client: TestClient, uploaded_photo: dict) -> None:
    assert uploaded_photo["width"] == 1600
    assert uploaded_photo["height"] == 1067
    assert uploaded_photo["content_type"] == "image/jpeg"

    full = client.get(f"/api/photos/{uploaded_photo['id']}")
    assert full.status_code == 200
    assert full.headers["content-type"] == "image/jpeg"
    assert len(full.content) == uploaded_photo["size_bytes"]

    thumb = client.get(f"/api/photos/{uploaded_photo['id']}/thumbnail")
    assert thumb.status_code == 200
    assert len(thumb.content) < len(full.content)


def test_upload_rejects_non_image(client: TestClient) -> None:
    response = client.post("/api/photos", files={"file": ("x.jpg", b"not an image", "image/jpeg")})
    assert response.status_code == 422


def test_missing_photo_returns_404(client: TestClient) -> None:
    assert client.get("/api/photos/doesnotexist").status_code == 404
