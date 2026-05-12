# syntax=docker/dockerfile:1.7

# ----- Stage 1: build the Next.js static export -----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies with a clean, reproducible lockfile install.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and produce ./out via `output: 'export'`.
COPY frontend/ ./
RUN npm run build


# ----- Stage 2: backend runtime that also serves the static frontend -----
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/backend/.venv \
    PATH="/app/backend/.venv/bin:${PATH}"

# Install uv (Python package manager).
RUN pip install --no-cache-dir uv==0.11.13

# Install backend dependencies in a virtualenv (deterministic via uv.lock).
COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /app/backend
RUN uv sync --frozen --no-dev

# Copy backend application code.
COPY backend/app ./app

# Copy templates and catalog (read-only assets the product will use).
COPY templates /app/templates
COPY catalog.json /app/catalog.json

# Copy the built frontend from stage 1.
COPY --from=frontend-builder /app/frontend/out /app/frontend/out

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
