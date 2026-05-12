# Manual test checklist — Mutual NDA creator (AI chat)

Automated tests cover the chat plumbing, the field merge, and the PDF
download. These manual checks cover what they can't: a real LLM
round-trip, real browser rendering, html2canvas capture, and jsPDF
output.

## Setup

```bash
# from repo root
./scripts/start-mac.sh         # (or start-linux.sh / start-windows.ps1)
# open http://localhost:8000
```

Make sure `OPENROUTER_API_KEY` is set in `.env` at the repo root — the
backend reads it via `python-dotenv` and docker-compose passes it
through `env_file`.

Test in **Chrome** and at least one of **Firefox** or **Safari**.

---

## 1. First load

- [ ] Page loads with no console errors.
- [ ] Header reads "Mutual NDA Creator".
- [ ] Left column shows a chat panel with one assistant greeting:
      "Hi! I'll help you put together a Mutual NDA. To start, who are
      the two companies entering this agreement?"
- [ ] Right column shows the document preview (cover page + Standard
      Terms) with empty/blank fields.

## 2. Chat → preview live binding (happy path)

Answer the assistant's questions in plain English. After each user
message:

- [ ] Send button briefly says "Sending..." and disables. A "Thinking..."
      bubble appears, then is replaced by the assistant's reply.
- [ ] The assistant's reply renders in the chat scroll area.
- [ ] When the assistant writes a field, the preview on the right
      updates accordingly (Party 1 / Party 2 names, Purpose, Effective
      Date, MNDA Term, Term of Confidentiality, Governing Law,
      Jurisdiction).
- [ ] After both parties' details, purpose, term, and governing law
      are filled, the preview reads as a complete agreement.

## 3. Field-specific extraction

Verify the assistant correctly handles each field type by giving it
plain-English answers:

- [ ] Company names with punctuation: "Acme, Inc." and "Globex Corp."
      → land in the right Party slots.
- [ ] Purpose given conversationally ("we're evaluating a possible
      cloud-services partnership") → preview shows it as the Purpose.
- [ ] An effective date like "May 15, 2026" or "next Monday" → preview
      shows the formatted human date (e.g., "May 15, 2026").
- [ ] "Make the MNDA expire in 3 years" → preview MNDA Term reads
      "Expires 3 years from the Effective Date."
- [ ] "Actually, let it run until either party terminates" → preview
      MNDA Term switches to "Continues until terminated...".
- [ ] "Keep confidentiality in perpetuity" → preview Term of
      Confidentiality reads "In perpetuity.".
- [ ] "Governed by Delaware law, courts in New Castle" → both
      Governing Law and Jurisdiction populate on the cover page and in
      section 9 of the Standard Terms.

## 4. Corrections

- [ ] Mid-conversation, say "Actually the Party 1 company is Initech,
      not Acme". The preview Party 1 Company updates to "Initech".
- [ ] Ask to clear modifications: the preview's MNDA Modifications
      block disappears.

## 5. Conversation lifecycle

- [ ] Long press Enter (Shift+Enter) inserts a newline rather than
      submitting.
- [ ] The composer auto-scrolls the conversation to the bottom when
      new messages arrive.
- [ ] Refresh the page — chat history resets to just the greeting
      (in-memory only).

## 6. Error path

- [ ] Stop the backend container (`docker compose stop`). Send a
      message → an error bubble appears in the chat
      ("Error: Request failed: ..."). The preview is unchanged.
- [ ] Unset `OPENROUTER_API_KEY`, restart, send a message → error
      bubble reads "Error: OPENROUTER_API_KEY is not configured on the
      server.".
- [ ] Restore the key, the next user message succeeds.

## 7. PDF output

Once the document is fully filled via chat:

- [ ] Click **Download PDF**. File saves with a slugged filename
      derived from the party companies (e.g.
      `mutual-nda-acme-inc-globex-corp.pdf`).
- [ ] Open the PDF: page 1 is the cover page, page 2+ is Standard
      Terms; numbered terms 1-11 all present.
- [ ] No paragraph split mid-sentence across page boundaries.

## 8. Sign out

- [ ] "Sign out" clears localStorage and redirects to `/login`.
- [ ] Logging back in lands on a fresh chat (greeting only).
