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
under `frontend/`). Open http://localhost:5173 and tap **Load sample home** to get the
six-wall test home.

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
| Find a wall | Wall list grouped by room with search | R1 |
| See what is unknown | Coverage banner + hatched "not inspected" region | R2 |
| Read a record | Wall detail: numbered pins, items table, author, date | R3 |
| Record a wall | Photo → details → tap-to-place items | R4 |
| Hand off | Share sheet exports one wall as self-contained HTML or JSON | R5 |
| Keep records | Stored server-side in SQLite + disk | R6 |

See `backend/README.md` and `frontend/README.md` for per-service details.
