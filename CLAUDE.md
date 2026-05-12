# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation covers PL-4 (V1 foundation) + PL-5 (AI chat for the
Mutual NDA). Users sign in with a fake (localStorage) login, then chat with an
LLM that fills the NDA fields conversationally and lets them download a PDF.
None of the other 11 documents, real authentication, or document persistence
have been built yet.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically built (`next build` with `output: "export"`) and
served at `/` by FastAPI via `StaticFiles`. The static export is produced on
the host (not inside Docker) and the image only ships the Python backend plus
`frontend/out/`; Node.js 20+ on the host is therefore a prerequisite.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

**Shipped (PL-4 V1 foundation)**
- `backend/` — uv + FastAPI app. Lifespan drops and recreates a SQLite `users`
  table on every start. `PRELEGAL_DB_PATH` overrides the DB location.
  `GET /api/health` returns `{"status":"ok"}`.
- `frontend/` — Next.js 16, all client components. `next.config.ts` uses
  `output: "export"` + `trailingSlash: true` so the build produces a static
  `out/` that FastAPI mounts at `/`. New `/login` page + `lib/auth.ts`
  localStorage helper.
- `Dockerfile` — single-stage Python image. Installs `uv`, syncs deps from
  `backend/uv.lock`, copies `app/` + `templates/` + `catalog.json` + the
  prebuilt `frontend/out/`. Launches `uvicorn` on `:8000`.
- `docker-compose.yml` — single `prelegal` service.
- `scripts/start-{mac,linux,windows}` + `stop-*` — start scripts host-build
  the frontend (`npm ci` + `npm run build`) then `docker compose up -d --build`.
  Windows variants check `$LASTEXITCODE` and fail loudly.
- `.gitattributes` pins LF on `*.sh`, CRLF on `*.ps1`.

**Added in PL-5 (AI chat)**
- `backend/app/routes/chat.py` — `POST /api/chat` wraps a LiteLLM →
  OpenRouter → Cerebras call (`openrouter/openai/gpt-oss-120b`,
  `response_format=ChatResponse`) and returns `{reply, updates}` per turn.
- `python-dotenv` autoloads `.env` from the project root (local dev);
  docker-compose passes `OPENROUTER_API_KEY` via `env_file: .env`.
- `frontend/components/nda-chat.tsx` + `lib/nda-chat.ts` — chat UI plus
  `applyUpdates()` that merges the partial response into `NdaFormData`.
  The old form (`nda-form.tsx`) is gone; the live preview + Download PDF
  flow is unchanged.

**Working product surface**
- Land on `/`, get redirected to `/login` if no name is in localStorage.
- Enter a name → land on the Mutual NDA creator: chat on the left,
  live preview on the right, "Download PDF" in the header. The
  assistant greets the user, asks for the NDA fields conversationally,
  and the preview updates as it captures answers.

**Not yet built** (intentional — out of scope for PL-5)
- The other 11 templates from `catalog.json`.
- Real authentication (the `users` table exists as a seam; no endpoint writes
  to it yet).
- Document and conversation persistence.

