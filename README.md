# prelegal

A platform for drafting common legal agreements.

## Status

This project is currently **in progress** and is expected to be completed by **2026-05-16**.

This commit lays down the V1 foundation: a FastAPI backend, a Next.js
frontend (statically exported and served by FastAPI), a SQLite
database that is recreated from scratch on every container start, and
a fake login (no real authentication yet). The product feature set is
unchanged — the Mutual NDA creator from the prototype is what you
land on after signing in.

## Run with Docker

You need:

- Docker (and Docker Compose v2) installed **with the daemon running**
  (on Windows/macOS, launch Docker Desktop first).
- Node.js 20+ and `npm` on the host. The start scripts build the
  static Next.js export on the host (`frontend/out/`) and Docker only
  runs the FastAPI backend.

Then, from the project root:

### macOS

```bash
./scripts/start-mac.sh
./scripts/stop-mac.sh
```

### Linux

```bash
./scripts/start-linux.sh
./scripts/stop-linux.sh
```

### Windows (PowerShell)

```powershell
./scripts/start-windows.ps1
./scripts/stop-windows.ps1
```

The start scripts build the image and run it in the background. The
app is then available at:

- UI: <http://localhost:8000>
- API health: <http://localhost:8000/api/health>

The SQLite database lives inside the container at `/tmp/prelegal.db`
and is dropped + recreated every time the container starts.

## Layout

```
backend/      FastAPI app, SQLite init, tests (uv project)
frontend/     Next.js 16 app, statically exported into out/
scripts/      Per-OS start/stop wrappers around docker compose
templates/    Common Paper agreement templates
catalog.json  Catalog of supported templates
Dockerfile    Multi-stage build: node static export → python runtime
```

## Local development without Docker

Backend:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest
```

Frontend:

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000 (Next.js dev server)
npm run build    # produces frontend/out/ for the backend to serve
npm run test
```
