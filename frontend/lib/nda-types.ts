export type PartyInfo = {
  company: string;
  signatoryName: string;
  signatoryTitle: string;
  noticeAddress: string;
};

export type DurationOption =
  | { kind: "years"; years: number }
  | { kind: "until-terminated" }
  | { kind: "perpetuity" };

export type NdaFormData = {
  party1: PartyInfo;
  party2: PartyInfo;
  purpose: string;
  effectiveDate: string;
  mndaTerm: Extract<DurationOption, { kind: "years" } | { kind: "until-terminated" }>;
  termOfConfidentiality: Extract<DurationOption, { kind: "years" } | { kind: "perpetuity" }>;
  governingLawState: string;
  jurisdiction: string;
  modifications: string;
};
