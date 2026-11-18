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

Every record endpoint requires a signed-in user (session cookie). Homeowners receive
a private home at registration and can create more from **Manage homes**. Contractors
join a home through a single-use invitation link with view or edit access. Viewers can
read and export records; editors can also upload photos and create, edit, or delete
walls. Only the owner manages invitations and members. Links expire after seven days,
and owners can revoke pending invitations or remove a member at any time.

Home selection scopes wall lists, photo uploads, and sample data. Direct wall, photo,
thumbnail, metadata, and export URLs also check membership on the server. Each home's
sample records have separate IDs, so reloading them cannot reset another home's data.
The demo accounts share only the sample home through an explicit edit grant.

### Upgrading existing data

The schema update preserves existing records and adds nullable `home_id` columns.
Known sample records are assigned to the demo home when demo accounts are enabled.
Other older walls and photos had no recorded owner, so they are retained with a null
home ID and hidden from accounts. Before using real legacy data, an administrator must
verify its owner and assign each wall and its photo to that owner's home in the database.
Do not assign all legacy records to the first person who signs in.

Home membership does not recall previously downloaded exports. Deploy with persistent
storage for `backend/data/`, HTTPS, `BTW_SESSION_COOKIE_SECURE=true`, and
`BTW_DEMO_ACCOUNTS=false` when using private data instead of the demonstration accounts.

Markers distinguish Water, Gas, Pipe, Wire, Framing, and Other in capture, viewing,
and exports. Pipe remains available for unspecified pipes and existing records;
those records are not automatically classified as water or gas.
