# Behind the Wall API

FastAPI service that stores wall records and photos on the local disk (SQLite +
JPEG files under `data/`) and produces single-wall handoff exports.

```
app/
  core/           settings, database session, id helpers
  models/         SQLAlchemy tables (walls, photos)
  schemas/        Pydantic request/response shapes
  repositories/   persistence operations, one class per table
  services/       photo processing, export rendering, sample-home seed
  api/            routers and dependency wiring
  templates/      Jinja2 template for the HTML export
tests/            pytest suite using an isolated temp data dir
```

## Run

```
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

Docs at http://localhost:8000/docs. Settings are read from `BTW_*` environment
variables (see `app/core/config.py`).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/walls` | list wall summaries |
| POST | `/api/walls` | create a wall |
| GET/PUT/DELETE | `/api/walls/{id}` | read, replace, delete a wall |
| POST | `/api/photos` | upload a photo (multipart `file`) |
| GET | `/api/photos/{id}` | full-size JPEG |
| GET | `/api/photos/{id}/thumbnail` | thumbnail JPEG |
| GET | `/api/walls/{id}/export.html` | self-contained handoff page |
| GET | `/api/walls/{id}/export.json` | record plus photo for re-import |
| POST | `/api/seed/sample-home` | load the six-wall sample home |

## Test

```
.venv/bin/pytest
```
