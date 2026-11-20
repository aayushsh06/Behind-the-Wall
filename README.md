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

## Deploy

```
./scripts/serve.sh        # builds the frontend, serves app + API from one uvicorn on :8000
```

FastAPI serves the built frontend when `frontend/dist` exists. Data lives in
`backend/data/` (SQLite file plus JPEG photos); back that directory up to keep records.

For hosting, the `Dockerfile` builds the same single-process image. Run it with a
persistent volume mounted at `/data` (SQLite and photos), served over HTTPS:

```
docker build -t behind-the-wall .
docker run -p 8000:8000 -v btw-data:/data behind-the-wall
```

`render.yaml` deploys that image to Render with a 1 GB persistent disk
(Dashboard → New → Blueprint → this repository). Any host that runs a container with a
persistent volume works (Fly.io, Railway, a VPS); serverless hosts such as Vercel do not,
because SQLite and photos need a disk that survives restarts.

| Variable | Production value | Purpose |
|---|---|---|
| `BTW_DATA_DIR` | `/data` | where the database and photos are stored |
| `BTW_SESSION_COOKIE_SECURE` | `true` | send the sign-in cookie only over HTTPS |
| `BTW_DEMO_ACCOUNTS` | `false` for real use | create the two public demo logins on startup |
| `PORT` | set by the host | port uvicorn listens on |
| `BTW_PUBLIC_URL` | your site's address | base of invitation links |
| `BTW_SMTP_HOST`, `BTW_SMTP_PORT`, `BTW_SMTP_USERNAME`, `BTW_SMTP_PASSWORD`, `BTW_SMTP_FROM` | optional | email invitations; without them the tradesperson sends the link |

## Deploy to Vercel (free)

The site runs on Vercel's free Hobby plan with a free Neon Postgres database. Whoever
owns the GitHub repository sets it up once from the Vercel dashboard; after that every
push to `main` deploys automatically.

How it works:

- `vercel.json` builds the frontend into static files and sends `/api/*` to
  `api/index.py`, which runs the FastAPI backend as a serverless Python function
  (packages in the root `requirements.txt`).
- Serverless functions have no lasting disk, so records **and photos** are stored in
  Postgres (photos as bytes in `photo_files`). The app reads `DATABASE_URL` (or
  `POSTGRES_URL`), which the Neon integration sets automatically; if the integration
  adds a prefix (e.g. `BEHINDTHEWALL_DATABASE_URL`), that is picked up too.
- Phones shrink photos before uploading, which keeps requests under Vercel's 4.5 MB limit.
- Tables and the demo accounts are created on the first request.

One-time setup (repository owner):

1. At [vercel.com/new](https://vercel.com/new), sign in with GitHub and **Import** this
   repository. Use your personal (Hobby) account. Leave the root directory as the repo
   root; the framework preset can stay "Other", because `vercel.json` supplies the build
   settings. Click **Deploy**. The first deploy works but has no database yet.
2. In the new project: **Storage → Create Database → Neon → Free plan**, and connect it
   to the project for all environments. This adds `DATABASE_URL`.
3. **Settings → Environment Variables**: add `BTW_SESSION_COOKIE_SECURE` = `true`.
   Later, add `BTW_DEMO_ACCOUNTS` = `false` once real people use the site.
4. **Deployments → ⋯ → Redeploy** so the database and settings take effect.
5. Open the site and sign in with `homeowner@example.com` / `demo1234`.

Locally nothing changes: without `DATABASE_URL` the app uses SQLite in `backend/data/`.

## Email

Email is optional. Without it, a tradesperson sends an invitation from their own email app
or by copying the link. To have the server email invitations, use SMTP; the project is set
up for [Brevo](https://www.brevo.com/free-smtp-server/), whose free plan sends 300 emails a
day and lets you send from a single verified address without owning a domain.

1. Create a free Brevo account.
2. **Senders, Domains & Dedicated IPs → Senders**: add and verify the address emails should
   come from (Brevo emails it a confirmation link).
3. **Settings → SMTP & API → SMTP**: note the *Login* and generate an *SMTP key*.
4. Local development: copy `backend/.env.example` to `backend/.env` (git-ignored) and fill in
   `BTW_SMTP_USERNAME`, `BTW_SMTP_PASSWORD` (the SMTP key) and `BTW_SMTP_FROM`.
   On Render: set the same three, plus `BTW_PUBLIC_URL`, in the service's Environment tab.
5. Check it: `cd backend && .venv/bin/python -m app.send_test_email you@example.com`

Free-plan mail may carry Brevo branding, and new Brevo accounts can need a short review
before sending is enabled. For better deliverability later, verify your own domain in Brevo
(SPF/DKIM) and send from it.

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
| Find a wall | Homeowner: walls grouped by room. Tradesperson: clients, then rooms. Search | R1 |
| See what is unknown | Coverage banner + hatched "not inspected" region | R2 |
| Read a record | Wall detail: numbered pins, items table, author, date | R3 |
| Record a wall | Tradesperson, on a phone or tablet: photo → wall size → details (homeowner email, invite if new) → mark items: pick the type, then trace runs freehand (they snap to the wire or pipe in the photo) or tap single points. On a desktop, recording and editing show a QR code to continue on the phone | R4 |
| Compute positions | Drag two corner handles onto the wall and enter its size; every item's position is computed from the photo | R3, R4 |
| Hand off | Wall goes to the homeowner's account; homeowner opens it as a PDF; share sheet sends the PDF or JSON | R5 |
| Keep records | Stored server-side in SQLite + disk | R6 |

See `backend/README.md` and `frontend/README.md` for per-service details.

Every record endpoint requires a signed-in user (session cookie). Rules live in
`backend/app/api/access.py`:

| | Homeowner | Tradesperson |
|---|---|---|
| Records walls | no (read-only account) | yes, into a homeowner's account chosen by email |
| Sees | every wall in their account, by room, as the app view and as a PDF | walls they recorded, plus every wall in homes whose owner approved their access request, grouped by client |
| Edits | no | walls they recorded, and walls in homes that approved them |
| Deletes | no | only walls they recorded |
| Edit access | approves, declines, or removes requests on the Account page | requests access by the homeowner's email |

**PDFs.** `GET /api/walls/{id}/export.pdf` renders the annotated photo, items, and record
details. It is rebuilt from the latest save on every request, and each save increments the
wall's revision, so the homeowner's PDF updates as soon as a tradesperson saves an edit.

**Invitations.** If a tradesperson sends a wall to an email with no account, they confirm an
invite; the wall waits for that email and moves into the homeowner's account when they sign
up with it. The tradesperson then sends an invitation: emailed by the server when SMTP is
configured, otherwise from their own email app or by copying the link.

Records saved before accounts owned walls have no owner and are visible to no one.

Markers distinguish Water, Gas, Pipe, Wire, Framing, and Other in capture, viewing,
and exports. Pipe remains available for unspecified pipes and existing records;
those records are not automatically classified as water or gas.
