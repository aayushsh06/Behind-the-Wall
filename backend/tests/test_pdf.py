"""The PDF is the record homeowners read; it reflects every saved edit."""

from fastapi.testclient import TestClient

from tests.conftest import wall_payload


def _calibrated(photo_id: str, **overrides) -> dict:
    payload = wall_payload(
        photo_id,
        coverage="partial",
        uncovered_region={"x": 0, "y": 0.5, "width": 1, "height": 0.5},
        calibration={
            "top_left": {"x": 0.1, "y": 0.1},
            "bottom_right": {"x": 0.9, "y": 0.9},
            "width": 120,
            "height": 96,
            "unit": "in",
        },
        notes="Opened for a leak.\nReplaced shutoff valve.",
        **overrides,
    )
    payload["markers"].append(
        {
            "type": "wire",
            "kind": "line",
            "x": 0.2,
            "y": 0.3,
            "x2": 0.7,
            "y2": 0.3,
            "measurement": "",
            "reference_point": "",
            "note": "14/2 NM",
        }
    )
    return payload


def test_pdf_reflects_each_saved_revision(
    client: TestClient, homeowner_client: TestClient, uploaded_photo: dict
) -> None:
    wall = client.post("/api/walls", json=_calibrated(uploaded_photo["id"])).json()

    first = homeowner_client.get(f"/api/walls/{wall['id']}/export.pdf")
    assert first.status_code == 200
    assert first.headers["content-type"] == "application/pdf"
    assert first.headers["cache-control"] == "no-store"
    assert first.content.startswith(b"%PDF")
    assert "rev1.pdf" in first.headers["content-disposition"]

    client.put(f"/api/walls/{wall['id']}", json=_calibrated(uploaded_photo["id"], label="Renamed"))
    second = homeowner_client.get(f"/api/walls/{wall['id']}/export.pdf?download=true")
    assert second.headers["content-disposition"].startswith("attachment;")
    assert "renamed-rev2.pdf" in second.headers["content-disposition"]
    assert second.content != first.content


def test_pdf_for_wall_without_photo(client: TestClient) -> None:
    wall = client.post("/api/walls", json=wall_payload(None, coverage="none")).json()
    response = client.get(f"/api/walls/{wall['id']}/export.pdf")
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")
