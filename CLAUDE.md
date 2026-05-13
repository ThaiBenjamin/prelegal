# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation covers PL-4 (V1 foundation) + PL-5 (AI chat for the
Mutual NDA) + PL-6 (all 11 supported document types) + PL-7 (real sign-up /
sign-in, document persistence, "draft" disclaimers, brand polish). Users
register with email + password, chat with a document-selector that recommends
the right template (or the closest match for unsupported requests), then chat
with an LLM that fills the chosen document's fields conversationally and lets
them download a PDF. Drafts auto-save as the user chats and can be reopened
from a "My documents" page. The SQLite database (users + saved documents) is
still reset on every container restart — accounts and drafts only persist for
the lifetime of a single container, by design.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Environment variables

- `OPENROUTER_API_KEY` (required for `/api/chat`) — loaded from `.env`
  in local dev via `python-dotenv`; injected by `docker-compose`'s
  `env_file: .env` in Docker.
- `JWT_SECRET` (optional) — signing key for auth JWTs. If unset, the
  backend generates an ephemeral 32-byte secret at process start, which
  means tokens are invalidated across restarts. Consistent with the
  ephemeral-DB design.
- `PRELEGAL_DB_PATH` (optional) — overrides the SQLite location.
  Docker sets `/tmp/prelegal.db`; Windows local dev defaults to
  `backend/data/prelegal.db`.
- `PRELEGAL_STATIC_DIR` (optional) — overrides where the FastAPI app
  looks for `frontend/out/` when mounting the static export.

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

## Testing

- Backend: `cd backend && uv run pytest` (33 tests across health,
  chat, documents, auth, saved-documents).
- Frontend: `cd frontend && npm test` (111 tests across 16 files).
- Frontend lint + type-check: `npm run lint` and `npx tsc --noEmit`.
- Frontend static build: `npm run build` produces `frontend/out/`.
- End-to-end: `scripts/start-windows.ps1` (or `start-{mac,linux}.sh`)
  builds the frontend on the host and runs the Docker stack on
  `:8000`. `scripts/stop-*` tears it down.

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

**Added in PL-5 (AI chat for the Mutual NDA)**
- `backend/app/routes/chat.py` — `POST /api/chat` wraps a LiteLLM →
  OpenRouter → Cerebras call (`openrouter/openai/gpt-oss-120b`,
  `response_format=ChatResponse`) and returns `{reply, updates}` per turn.
- `python-dotenv` autoloads `.env` from the project root (local dev);
  docker-compose passes `OPENROUTER_API_KEY` via `env_file: .env`.
- `frontend/components/nda-chat.tsx` + `lib/nda-chat.ts` — chat UI plus
  `applyUpdates()` that merges the partial response into `NdaFormData`.
  The old form (`nda-form.tsx`) is gone; the live preview + Download PDF
  flow is unchanged.

**Added in PL-6 (all 11 supported documents + UX polish)**
- `backend/app/documents.py` + `frontend/lib/documents.ts` — parallel
  catalog of all 11 supported documents (Mutual NDA, CSA, Design Partner
  Agreement, SLA, PSA, DPA, Software License Agreement, Partnership
  Agreement, Pilot Agreement, BAA, AI Addendum) with their cover-page
  field schemas (name/label/kind/placeholder).
- `backend/app/routes/documents.py` — `GET /api/documents` lists the
  catalog; `GET /api/documents/{id}/standard-terms` returns the template
  markdown (read from `templates/`).
- `backend/app/routes/chat.py` — `/api/chat` now dispatches by
  `documentId`: `null` → document selector (`SelectorResponse`),
  `mutual-nda` → existing rich `NdaUpdates` schema, anything else → a
  generic per-document response model built dynamically with
  `pydantic.create_model` so the LLM's structured output is constrained
  to that document's fields. System prompts now also require a follow-up
  question while any field is unfilled.
- `frontend/components/doc-selector-chat.tsx` — chat-first selector that
  greets the user with the supported docs and recommends the closest
  match for unsupported requests; `app/page.tsx` is now a state machine
  (selector → creator) with a "Pick a different document" header action.
- `frontend/components/generic-chat.tsx` + `generic-preview.tsx` +
  `lib/generic-chat.ts` + `lib/standard-terms-md.tsx` — generic chat,
  generic cover-page preview (auto-rendered from `Document.fields`),
  and a small markdown renderer for the standard terms. Used for every
  document except the Mutual NDA (which keeps its bespoke `NdaPreview`).
- `frontend/components/nda-chat.tsx` + `doc-selector-chat.tsx` +
  `generic-chat.tsx` — all three chat surfaces now refocus the textarea
  after each turn so the user can answer the next question without
  grabbing the mouse.
- `frontend/components/nda-preview.tsx` — Effective Date and MNDA Term
  are inline-editable when an `onChange` handler is provided, giving
  the user a manual override of the chat-driven values.

**Added in PL-7 (real accounts, document history, polish, disclaimer)**
- `backend/app/db.py` — schema now drops + recreates both `users` and a
  new `saved_documents` table. `users` gained `password_hash` and a
  `UNIQUE` constraint on `email`. `saved_documents` stores per-user
  drafts: `(id, user_id FK, document_id, title, fields_json, updated_at)`.
- `backend/app/auth.py` — bcrypt hashing, HS256 JWTs (7-day TTL,
  `JWT_SECRET` from env with an ephemeral fallback), and a
  `current_user_id` FastAPI dependency that validates
  `Authorization: Bearer <token>`.
- `backend/app/routes/auth.py` — `POST /api/auth/signup`,
  `POST /api/auth/signin`, `GET /api/auth/me`. Returns `{token, user}`.
- `backend/app/routes/saved_documents.py` — `GET /api/saved-documents`,
  `POST /api/saved-documents` (upsert by optional id),
  `GET /api/saved-documents/{id}`, `DELETE /api/saved-documents/{id}`.
  All require auth and filter by `user_id`.
- `frontend/lib/auth.ts` — replaced the name-only localStorage stub with
  `saveSession / clearSession / loadUser / loadToken / getAuthHeader`.
  Persists `{id, name, email}` plus the JWT.
- `frontend/lib/api.ts` — single fetch wrapper that attaches the bearer
  token and surfaces FastAPI's `{detail}` error messages.
- `frontend/lib/saved-documents.ts` — `useAutosaveDocument` hook with an
  800ms debounce upsert; tracks the row id in a ref so subsequent saves
  are `UPDATE`s. Also exports `buildSavedDocumentTitle`, list, get, and
  delete helpers.
- `frontend/app/login/page.tsx` — full rewrite with sign-in / sign-up
  tabs, email + password fields, and a brand-styled card on a navy
  gradient background.
- `frontend/app/documents/page.tsx` — new "My documents" page listing
  the user's saved drafts; `Open` routes back to `/` with
  `?openDoc=<id>` so the creator rehydrates from saved fields.
- `frontend/app/page.tsx` — navy header with a wordmark and nav links,
  disclaimer banner under the header, autosave wired into both
  creators, and `?openDoc` support that pulls the row, picks the right
  doc, and seeds form state.
- `frontend/components/disclaimer-banner.tsx` — app-shell banner with
  "Draft only" copy; rendered under the header on every signed-in page.
- `frontend/components/document-disclaimer.tsx` — `[data-nda-block]`
  block at the top of every preview's cover page so the "DRAFT —
  SUBJECT TO LEGAL REVIEW" warning is captured into page 1 of the PDF.
- `frontend/app/globals.css` — brand palette wired into the shadcn
  token system: `--primary` = blue (`#209dd7`), `--secondary` = purple
  (`#753991`), `--accent` = yellow (`#ecad0a`). Adds `--brand-*` CSS
  vars for direct use in the header and the disclaimer banner.

**Working product surface**
- Land on `/`, get redirected to `/login` if no token is in localStorage.
- `/login` — sign in (email + password) or sign up (name + email +
  password). On success the JWT is stored and the user is sent to `/`.
- `/` — document selector by default; pick a document via chat, the
  creator opens with the chat on the left and the live preview on the
  right. Every chat turn debounces a save to `/api/saved-documents`.
- `/documents` — list of the user's saved drafts; `Open` rehydrates the
  creator with the saved field values.
- "Draft only" banner under the header on every signed-in page; a
  "DRAFT — SUBJECT TO LEGAL REVIEW" block inside every preview that
  travels with the downloaded PDF.

**Not yet built** (intentional — out of scope for PL-7)
- Persistence across server restarts (the DB is still wiped on every
  container start per the ticket).
- Conversation transcript persistence (only field state is saved;
  reopening a saved document starts a fresh chat thread).
- Sharing the chat-shell scaffolding across `nda-chat`,
  `doc-selector-chat`, and `generic-chat` (still duplicated; remains a
  follow-up refactor).

