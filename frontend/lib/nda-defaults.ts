import type { NdaFormData } from "./nda-types";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const defaultFormData: NdaFormData = {
  party1: {
    company: "",
    signatoryName: "",
    signatoryTitle: "",
    noticeAddress: "",
  },
  party2: {
    company: "",
    signatoryName: "",
    signatoryTitle: "",
    noticeAddress: "",
  },
  purpose:
    "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: todayIso(),
  mndaTerm: { kind: "years", years: 1 },
  termOfConfidentiality: { kind: "years", years: 1 },
  governingLawState: "",
  jurisdiction: "",
  modifications: "",
};
