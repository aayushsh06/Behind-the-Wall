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


def test_photo_revalidates_with_etag(client: TestClient, uploaded_photo: dict) -> None:
    url = f"/api/photos/{uploaded_photo['id']}"
    first = client.get(url)
    etag = first.headers["etag"]
    assert first.headers["cache-control"] == "no-cache"

    cached = client.get(url, headers={"If-None-Match": etag})
    assert cached.status_code == 304
    assert cached.content == b""


def test_rewritten_photo_gets_new_etag(client: TestClient, uploaded_photo: dict) -> None:
    from io import BytesIO

    from PIL import Image

    from app.api.deps import get_photo_storage
    from app.core.config import get_settings

    url = f"/api/photos/{uploaded_photo['id']}"
    old_etag = client.get(url).headers["etag"]

    replacement = BytesIO()
    Image.new("RGB", (800, 600), (10, 20, 30)).save(replacement, format="JPEG")
    storage = get_photo_storage(get_settings())
    storage.save(uploaded_photo["id"], replacement.getvalue())  # new bytes, same id

    refreshed = client.get(url, headers={"If-None-Match": old_etag})
    assert refreshed.status_code == 200
    assert refreshed.headers["etag"] != old_etag
