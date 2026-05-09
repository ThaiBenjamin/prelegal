# Manual test checklist — Mutual NDA creator

These cover the flows that the automated suite cannot exercise: real
browser layout, html2canvas-based capture, jsPDF rendering, and the
actual download UX.

## Setup

```bash
cd frontend
npm install         # if you haven't yet
npm run dev         # http://localhost:3000
```

Run each block in **Chrome**, **Firefox**, and **Safari** (or at least
Chrome + one other) — html2canvas-pro behaves slightly differently per
engine. Keep DevTools console open; flag any errors or warnings that
weren't already there on a clean load.

---

## 1. First load

- [ ] Page loads with no console errors.
- [ ] Header reads "Mutual NDA Creator".
- [ ] Two columns visible: form on the left, document preview on the right.
- [ ] Preview shows two visually-distinct page-sized panels (cover page +
      Standard Terms) separated by a small gap.
- [ ] Effective Date field is pre-filled with today's date.
- [ ] MNDA Term radio is on **Expires N year(s)** with `1` in the input.
- [ ] Term of Confidentiality radio is on **N year(s) ...** with `1` in the input.

## 2. Form ↔ preview live binding

- [ ] Type "Acme, Inc." into Party 1 → Company. The Party 1 signature
      block in the preview updates as you type.
- [ ] Type a Party 1 signatory name, title, notice address. Each lands
      in the right slot of the preview.
- [ ] Repeat for Party 2 — values land in the Party 2 block, not Party 1.
- [ ] Edit the Purpose textarea — preview updates after each keystroke.
- [ ] Pick a different Effective Date — preview shows it as e.g.
      "May 9, 2026" (not the raw `2026-05-09`).
- [ ] Type Governing Law = "Delaware" — appears in the cover page AND
      twice in section 9 of the Standard Terms.
- [ ] Type Jurisdiction = "New Castle, Delaware" — appears in cover
      page and section 9 of the Standard Terms.
- [ ] Add some Modifications text — a new "MNDA Modifications" block
      appears in the cover page preview. Clear the textarea — the
      block disappears.

## 3. MNDA Term + Term of Confidentiality switching

- [ ] Click "Continues until terminated" — preview MNDA Term reads
      "Continues until terminated in accordance with the terms of this
      MNDA.". The years input is now disabled (greyed out, can't type).
- [ ] Click "Expires" — years input re-enables; preview reverts to
      "Expires 1 year from the Effective Date."
- [ ] Change the years input to 3 — preview reads "Expires 3 years
      from the Effective Date."
- [ ] Type a single-digit year (`5`) into the years input directly.
      Preview updates.
- [ ] Try entering `0` or non-numeric — input clamps to `1` and
      preview reflects "1 year".
- [ ] Click "In perpetuity" under Term of Confidentiality — preview
      reads "In perpetuity.".
- [ ] Click back to years — preview reads "1 year(s) ... but in the
      case of trade secrets ...".

## 4. Filename derivation

- [ ] Fill both Party 1 + Party 2 Company fields with simple ASCII
      ("Acme, Inc.", "Globex Corp."). Click **Download PDF** — file
      saves as `mutual-nda-acme-inc-globex-corp.pdf`.
- [ ] Leave both Company fields blank — file saves as
      `mutual-nda-party1-party2.pdf`.
- [ ] Use a unicode/emoji company name (e.g. "Café 🚀 Ltd."). The slug
      drops the unicode, leaving readable ASCII.
- [ ] Use a single-word lowercase company name. Slug is just that word.

## 5. PDF output — content fidelity

Open the downloaded PDF in a viewer (Chrome, Acrobat, Preview).

- [ ] Page 1 starts with **Mutual Non-Disclosure Agreement** centered.
- [ ] Page 1 contains the cover-page Purpose, Effective Date, MNDA
      Term, Term of Confidentiality, Governing Law & Jurisdiction blocks.
- [ ] Modifications block appears on page 1 ONLY when the form had
      modifications text.
- [ ] Both signature blocks (Party 1 + Party 2) render side-by-side
      with all entered values present.
- [ ] **Standard Terms** title sits at the top of its own page —
      never on the same page as cover content.
- [ ] All 11 numbered Standard Terms appear in order (1 through 11).
- [ ] CC BY 4.0 footer appears at the end.

## 6. PDF output — page breaks (the bug we fixed)

- [ ] **No paragraph is split mid-sentence across a page boundary.**
      Inspect every page boundary; each should fall in the gap *between*
      paragraphs, not through one.
- [ ] In particular, section 8 (Disclaimer) renders as a single,
      complete block — verify it's not cut between "AS IS" and
      "PARTICULAR PURPOSE".
- [ ] Section 11 (General) is the longest paragraph; verify it sits
      whole on whichever page it lands, not split.

## 7. Edge cases

- [ ] Fill Modifications with a very long string (~500 words). The
      Modifications block in the PDF either stays whole on a page, or
      (if it exceeds one page) tiles cleanly across pages with the
      page top margin intact and no content clipped at the bottom.
- [ ] Fill Notice Address with a multi-line address (use Shift+Enter
      for line breaks). PDF preserves the line breaks.
- [ ] Set Effective Date to far past (`1990-01-01`) and far future
      (`2099-12-31`) — preview and PDF both render the formatted date.
- [ ] Click **Download PDF** twice in quick succession — second click
      is gated by the "Generating…" button label until the first
      completes; no overlap or duplicate downloads.
- [ ] Trigger an error path: open DevTools, throw a network error
      somewhere, and verify the failure path shows an alert ("Could
      not generate PDF…") rather than silently failing.

## 8. Responsive

- [ ] Resize the browser to <1024px wide. Form and preview stack
      vertically (preview below form). Both still scrollable.
- [ ] At desktop width, preview is sticky on scroll while the form
      scrolls independently.

## 9. Accessibility (smoke check)

- [ ] Tab through the form — every input is reachable in a sensible order.
- [ ] Each input has a visible label associated with it (no orphan
      placeholders).
- [ ] The Download PDF button is reachable via Tab and triggers on
      Enter/Space.
- [ ] Radio groups: arrow keys navigate between options; Space selects.

## 10. Visual polish

- [ ] On-screen preview uses a serif font (Times-like), 11pt-ish, with
      the same look as the PDF.
- [ ] No layout glitch when toggling MNDA Term / Term of
      Confidentiality (no jumping, no flicker).
- [ ] Form card titles ("Party 1", "Party 2", "Agreement details") are
      visually distinct from the preview's signature-block label
      "Party 1" / "Party 2".
