.PHONY: dev dev-lan serve test lint build

dev:            ## Run backend + frontend with live reload
	./scripts/dev.sh

dev-lan:        ## Same, reachable from phones on the LAN
	./scripts/dev.sh --lan

serve:          ## Build frontend and serve everything from FastAPI
	./scripts/serve.sh

test:           ## Backend tests + frontend typecheck
	cd backend && .venv/bin/pytest -q
	cd frontend && npm run typecheck

lint:           ## Lint both services
	cd backend && .venv/bin/ruff check .
	cd frontend && npm run lint

build:          ## Production frontend build
	cd frontend && npm run build
