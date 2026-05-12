/**
 * App-shell banner shown on every signed-in page.
 *
 * Tells the user that the drafts they create here are not legal advice.
 * A second, PDF-captured copy lives in the document previews so the
 * warning travels with downloaded files.
 */

export function DisclaimerBanner() {
  return (
    <div
      role="alert"
      className="border-b border-[color:var(--brand-yellow)]/40 bg-[color:var(--brand-yellow)]/15 text-[color:var(--brand-navy)]"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-6 py-2 text-sm">
        <span aria-hidden="true" className="mt-0.5 text-base">⚠</span>
        <p>
          <span className="font-semibold">Draft only.</span> Documents
          created here are AI-generated and are not legal advice. Have a
          licensed attorney review before signing.
        </p>
      </div>
    </div>
  );
}
