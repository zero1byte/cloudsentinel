# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# CloudSentinel image
#
#   Stage 1  frontend-build  Build the React dashboard (Node)
#   Stage 2  python-deps     Install Python dependencies into a virtualenv
#   Stage 3  runtime         API only (FastAPI, non-root)   <- used by docker compose
#   Stage 4  production      runtime + built dashboard      <- default target
#
#   docker build -t cloudsentinel .                     # full app (API + dashboard)
#   docker build --target runtime -t cloudsentinel-api . # API only
#
# Expected layout:
#   backend/requirements.txt, backend/app/main.py  (app.main:app)
#   frontend/package.json + package-lock.json      (npm run build -> dist)
#   detections/  knowledge/  sample_logs/
# ---------------------------------------------------------------------------

# ---------- Stage 1: build the React dashboard ----------
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ---------- Stage 2: python dependencies ----------
FROM python:3.12-slim AS python-deps

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt


# ---------- Stage 3: API runtime (no frontend) ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DETECTIONS_DIR=/app/detections \
    KNOWLEDGE_DIR=/app/knowledge \
    SAMPLE_LOGS_DIR=/app/sample_logs \
    PORT=8000

# libpq runtime lib for psycopg; curl for the healthcheck
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 curl \
 && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --system --gid 10001 sentinel \
 && useradd  --system --uid 10001 --gid sentinel --home-dir /app --shell /usr/sbin/nologin sentinel

WORKDIR /app

COPY --from=python-deps /opt/venv /opt/venv
COPY --chown=sentinel:sentinel backend/app ./app
COPY --chown=sentinel:sentinel detections ./detections
COPY --chown=sentinel:sentinel knowledge ./knowledge
COPY --chown=sentinel:sentinel sample_logs ./sample_logs

USER sentinel
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/healthz" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]


# ---------- Stage 4: production (API + built dashboard) ----------
# Last stage = default target for a plain `docker build .`
FROM runtime AS production

ENV FRONTEND_DIST=/app/frontend_dist
COPY --from=frontend-build --chown=sentinel:sentinel /frontend/dist ./frontend_dist