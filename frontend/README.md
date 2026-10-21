# Behind the Wall web app

Mobile-first React + TypeScript client built with Vite and Tailwind.

```
src/
  app/          providers, router, app shell and navigation
  api/          typed fetch client, one module per backend resource
  domain/       shared types and display metadata (utility types, coverage)
  hooks/        TanStack Query hooks wrapping the api modules
  components/   reusable UI primitives and the shared photo canvas
  features/     screen-level code grouped by flow: find, capture, handoff, settings
  lib/          small framework-free helpers
```

## Run

```
npm install
npm run dev
```

The dev server proxies `/api` to the backend at `http://localhost:8000`. Use
`./scripts/dev.sh` from the repo root to start both together.

## Checks

```
npm run typecheck
npm run lint
npm run build
```
