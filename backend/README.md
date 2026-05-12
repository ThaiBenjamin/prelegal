# Backend

FastAPI service that initializes a fresh SQLite database on startup and
serves the statically exported Next.js frontend.

## Local development

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running:

- `http://localhost:8000/api/health` returns `{"status": "ok"}`.
- If a built frontend exists at `../frontend/out`, it is served at `/`.

## Tests

```bash
uv run pytest
```

## Environment variables

- `PRELEGAL_DB_PATH` — path to the SQLite file (default: `/tmp/prelegal.db`
  on POSIX, `backend/data/prelegal.db` on Windows).
- `PRELEGAL_STATIC_DIR` — override location of the built frontend.
