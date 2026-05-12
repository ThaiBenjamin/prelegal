import { describe, it, expect } from "vitest";
import { buildSavedDocumentTitle } from "./saved-documents";
import { getDocument } from "./documents";

describe("buildSavedDocumentTitle", () => {
  it("falls back to the short name when no party fields are populated", () => {
    const doc = getDocument("csa")!;
    expect(
      buildSavedDocumentTitle(doc, { provider: "", customer: "" }),
    ).toBe(doc.shortName);
  });

  it("joins two party names with an ampersand", () => {
    const doc = getDocument("csa")!;
    expect(
      buildSavedDocumentTitle(doc, {
        provider: "Acme",
        customer: "Globex",
      }),
    ).toBe("CSA — Acme & Globex");
  });

  it("reads the .company field for NDA-style nested party data", () => {
    const doc = getDocument("mutual-nda")!;
    expect(
      buildSavedDocumentTitle(doc, {
        party1: { company: "Acme" },
        party2: { company: "Globex" },
      }),
    ).toBe("Mutual NDA — Acme & Globex");
  });

  it("dedupes a single party so the title reads naturally", () => {
    const doc = getDocument("csa")!;
    expect(
      buildSavedDocumentTitle(doc, { provider: "Acme", customer: "Acme" }),
    ).toBe("CSA — Acme");
  });
});
