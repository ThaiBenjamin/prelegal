"""FastAPI entrypoint: initializes the DB, mounts API routes, serves the static frontend."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import init_db
from .routes import auth, chat, documents, health, saved_documents


def _load_env() -> None:
    """Load secrets from the project-root .env, if present.

    Local dev relies on this; in Docker the variables are injected via
    docker-compose env_file so .env is absent from the image (no-op then).
    """
    candidate = Path(__file__).resolve().parent.parent.parent / ".env"
    if candidate.is_file():
        load_dotenv(candidate)


_load_env()


def _resolve_static_dir() -> Path | None:
    """Find the built frontend on disk.

    In Docker we copy the export to /app/frontend/out. For local backend
    runs without a build, the directory may be absent; in that case we
    skip the mount and only API routes are served.
    """
    override = os.environ.get("PRELEGAL_STATIC_DIR")
    if override:
        path = Path(override)
        return path if path.is_dir() else None

    candidates = [
        Path("/app/frontend/out"),
        Path(__file__).resolve().parent.parent.parent / "frontend" / "out",
    ]
    for path in candidates:
        if path.is_dir():
            return path
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(saved_documents.router, prefix="/api")

_static_dir = _resolve_static_dir()
if _static_dir is not None:
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="frontend")
