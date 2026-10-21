"""Serve the built frontend from FastAPI so one process can host the whole app.

Only active when the Vite build output exists. API routes keep priority; any other
path returns index.html so client-side routing works on refresh.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_spa(app: FastAPI, dist_dir: Path) -> None:
    index = dist_dir / "index.html"
    if not index.is_file():
        return

    assets = dist_dir / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa_fallback(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        candidate = dist_dir / path
        if path and candidate.is_file() and candidate.resolve().is_relative_to(dist_dir.resolve()):
            return FileResponse(candidate)
        return FileResponse(index)
