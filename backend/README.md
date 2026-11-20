# Behind the Wall API

FastAPI service that stores wall records and photos on the local disk (SQLite +
JPEG files under `data/`) and produces single-wall handoff exports.

```
app/
  core/           settings, database session, id helpers
  models/         SQLAlchemy tables (walls, photos, users, sessions)
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
| POST | `/api/auth/register` | create an account and sign in |
| POST | `/api/auth/login` / `/api/auth/logout` | start or end a session (cookie) |
| GET | `/api/auth/me` | the signed-in user |
| GET | `/api/walls` | list wall summaries |
| POST | `/api/walls` | create a wall |
| GET/PUT/DELETE | `/api/walls/{id}` | read, replace, delete a wall |
| POST | `/api/photos` | upload a photo (multipart `file`) |
| GET | `/api/photos/{id}` | full-size JPEG |
| GET | `/api/photos/{id}/thumbnail` | thumbnail JPEG |
| GET | `/api/walls/{id}/export.pdf` | annotated PDF of the wall (latest revision) |
| GET | `/api/walls/{id}/export.html` | self-contained handoff page |
| GET | `/api/walls/{id}/export.json` | record plus photo for re-import |
| GET/POST | `/api/access-requests` | list, or (tradesperson) request edit access by homeowner email |
| POST | `/api/access-requests/{id}/decision` | (homeowner) approve, decline, or revoke |
| GET | `/api/homeowners/lookup?email=` | (tradesperson) whether an email can receive walls |
| POST | `/api/invites` | (tradesperson) invite an email that has a wall waiting |

Everything except `/api/health` and `/api/auth/*` returns 401 without a session.
Passwords are hashed with scrypt; demo accounts are created on startup
(`app/services/demo_accounts.py`, disable with `BTW_DEMO_ACCOUNTS=false`).

## Sample home photos

`assets/sample/` holds the photos behind the six-wall sample home. The seed in
`app/services/seed_service.py` maps each wall to an asset file (optionally a crop of
it) and places markers and calibration corners on real features in that photo. The demo homeowner gets the sample home on first start, recorded by the demo tradesperson.
Supported formats are anything Pillow can open, including JPEG, PNG, and AVIF.

## Test

```
.venv/bin/pytest
```
