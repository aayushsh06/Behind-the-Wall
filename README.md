# Behind the Wall

A small prototype for recording what is inside a home's walls (pipes, wires, framing)
so that a tradesperson can capture a wall, a homeowner can find it later, and the
homeowner can hand the record to someone else.

## Layout

```
backend/   FastAPI service: wall records, photos, single-wall export
frontend/  React + TypeScript (Vite) mobile-first client
scripts/   Developer tooling (run both services with one command)
```

## Quick start

```
./scripts/dev.sh
```

This installs dependencies on first run, starts the API on http://localhost:8000
and the web app on http://localhost:5173, and stops both on Ctrl+C.

See `backend/README.md` and `frontend/README.md` for per-service details.
