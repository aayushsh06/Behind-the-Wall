# Production image: builds the React frontend, then serves it and the API from one
# uvicorn process. SQLite and photos live under $BTW_DATA_DIR, which must be a
# persistent volume or records are lost on every redeploy.

FROM node:22-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BTW_DATA_DIR=/data \
    BTW_SESSION_COOKIE_SECURE=true \
    PORT=8000
WORKDIR /app/backend
COPY backend/pyproject.toml ./
COPY backend/app ./app
COPY backend/assets ./assets
# Editable install keeps app/ in place so paths to assets/ and frontend/dist resolve.
RUN pip install --no-cache-dir -e .
COPY --from=web /app/frontend/dist /app/frontend/dist
RUN mkdir -p /data
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
