# Behind the Wall

A prototype for recording what is inside a home's walls (pipes, wires, framing) so a
tradesperson can capture a wall while it is open, a homeowner can find it later, and
the homeowner can hand that single record to someone else.

## Layout

```
backend/   FastAPI + SQLite: wall records, photo storage, single-wall export
frontend/  React + TypeScript (Vite, Tailwind): mobile-first client
scripts/   dev.sh (both services, live reload) and serve.sh (single-process deploy)
```

## Quick start

```
./scripts/dev.sh          # API on :8000, web on :5173, Ctrl+C stops both
./scripts/dev.sh --lan    # also reachable from a phone on the same Wi-Fi
```

Dependencies install on first run (Python venv under `backend/.venv`, `node_modules`
under `frontend/`). Open http://localhost:5173 and sign in with a demo account (the sign-in
page can fill these in):

| Account | Email | Password |
|---|---|---|
| Demo Homeowner | `homeowner@example.com` | `demo1234` |
| Demo Tradesperson | `tradesperson@example.com` | `demo1234` |

Both are created on startup; on an empty database the six-wall sample home is loaded with
them. Set `BTW_DEMO_ACCOUNTS=false` to skip this. If ports are taken, run
`API_PORT=8010 WEB_PORT=5180 ./scripts/dev.sh`.

## Deploy shape

```
./scripts/serve.sh        # builds the frontend, serves app + API from one uvicorn on :8000
```

FastAPI serves the built frontend when `frontend/dist` exists. Data lives in
`backend/data/` (SQLite file plus JPEG photos); back that directory up to keep records.

## Checks

```
make test    # backend pytest + frontend typecheck
make lint    # ruff + oxlint
make build   # production frontend build
```

## Flows

| Flow | Screen | Requirement |
|---|---|---|
| Sign in | Welcome page, create account (homeowner or tradesperson), sign in | |
| Find a wall | Wall list grouped by room with search | R1 |
| See what is unknown | Coverage banner + hatched "not inspected" region | R2 |
| Read a record | Wall detail: numbered pins, items table, author, date | R3 |
| Record a wall | Photo → wall size → details → tap-to-place items (points or line runs) | R4 |
| Compute positions | Drag two corner handles onto the wall and enter its size; every item's position is computed from the photo | R3, R4 |
| Hand off | Share sheet exports one wall as self-contained HTML or JSON | R5 |
| Keep records | Stored server-side in SQLite + disk | R6 |

See `backend/README.md` and `frontend/README.md` for per-service details.

Every record endpoint requires a signed-in user (session cookie). The role labels the
account only; every signed-in user sees and can edit the same walls.

Markers distinguish Water, Gas, Pipe, Wire, Framing, and Other in capture, viewing,
and exports. Pipe remains available for unspecified pipes and existing records;
those records are not automatically classified as water or gas.
