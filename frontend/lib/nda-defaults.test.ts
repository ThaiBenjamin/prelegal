import { describe, it, expect } from "vitest";
import { defaultFormData, todayIso } from "./nda-defaults";

describe("todayIso", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("defaultFormData", () => {
  const emptyParty = {
    company: "",
    signatoryName: "",
    signatoryTitle: "",
    noticeAddress: "",
  };

  it("seeds both parties with empty signatory fields and not as a shared reference", () => {
    expect(defaultFormData.party1).toEqual(emptyParty);
    expect(defaultFormData.party2).toEqual(emptyParty);
    expect(defaultFormData.party1).not.toBe(defaultFormData.party2);
  });

  it("uses the standard Common Paper purpose phrasing", () => {
    expect(defaultFormData.purpose.toLowerCase()).toContain(
      "evaluating whether to enter into a business relationship",
    );
  });

  it("defaults MNDA term to 1 year", () => {
    expect(defaultFormData.mndaTerm).toEqual({ kind: "years", years: 1 });
  });

  it("defaults term of confidentiality to 1 year", () => {
    expect(defaultFormData.termOfConfidentiality).toEqual({
      kind: "years",
      years: 1,
    });
  });

  it("leaves jurisdictional fields blank for the user to fill", () => {
    expect(defaultFormData.governingLawState).toBe("");
    expect(defaultFormData.jurisdiction).toBe("");
    expect(defaultFormData.modifications).toBe("");
  });
});
