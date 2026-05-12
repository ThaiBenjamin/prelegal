# syntax=docker/dockerfile:1.7
#
# Backend-only image. The frontend is built on the host (`npm run build`
# inside frontend/) so node/npm do not need to run inside Docker; this
# keeps the image small and avoids the memory pressure that npm ci on
# the React/Next.js dep tree puts on WSL2 backends.
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/backend/.venv \
    PATH="/app/backend/.venv/bin:${PATH}"

RUN pip install --no-cache-dir uv==0.11.13

COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /app/backend
RUN uv sync --frozen --no-dev

COPY backend/app ./app
COPY templates /app/templates
COPY catalog.json /app/catalog.json

# Static export produced by `npm run build` on the host.
COPY frontend/out /app/frontend/out

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
