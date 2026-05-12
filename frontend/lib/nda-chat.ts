/**
 * Client helpers for the /api/chat endpoint.
 *
 * The backend returns `{ reply, updates }` per turn; `applyUpdates` merges
 * the partial update into the current NDA form state so the live preview
 * reflects what the AI has captured.
 */

import { apiFetch } from "./api";
import type { NdaFormData, PartyInfo } from "./nda-types";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type NdaPartyPatch = {
  company?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  noticeAddress?: string | null;
};

export type NdaUpdates = {
  party1?: NdaPartyPatch | null;
  party2?: NdaPartyPatch | null;
  purpose?: string | null;
  effectiveDate?: string | null;
  mndaTerm?: { kind: "years" | "until-terminated"; years?: number | null } | null;
  termOfConfidentiality?:
    | { kind: "years" | "perpetuity"; years?: number | null }
    | null;
  governingLawState?: string | null;
  jurisdiction?: string | null;
  modifications?: string | null;
};

export type ChatResponse = {
  reply: string;
  updates: NdaUpdates;
};

export function sendChat(args: {
  messages: ChatMessage[];
  currentData: NdaFormData;
  documentId: string;
}): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", { method: "POST", body: args });
}

function mergeParty(
  current: PartyInfo,
  patch: NdaPartyPatch | null | undefined,
): PartyInfo {
  if (!patch) return current;
  return {
    company: patch.company ?? current.company,
    signatoryName: patch.signatoryName ?? current.signatoryName,
    signatoryTitle: patch.signatoryTitle ?? current.signatoryTitle,
    noticeAddress: patch.noticeAddress ?? current.noticeAddress,
  };
}

function mergeDuration<C extends { kind: "years"; years: number } | { kind: A }, A extends string>(
  current: C,
  patch: { kind: "years" | A; years?: number | null } | null | undefined,
): C {
  if (!patch) return current;
  if (patch.kind === "years") {
    const fallback =
      current.kind === "years"
        ? (current as { kind: "years"; years: number }).years
        : 1;
    const years = Math.max(1, patch.years ?? fallback);
    return { kind: "years", years } as C;
  }
  return { kind: patch.kind } as C;
}

export function applyUpdates(
  data: NdaFormData,
  updates: NdaUpdates,
): NdaFormData {
  return {
    party1: mergeParty(data.party1, updates.party1),
    party2: mergeParty(data.party2, updates.party2),
    purpose: updates.purpose ?? data.purpose,
    effectiveDate: updates.effectiveDate ?? data.effectiveDate,
    mndaTerm: mergeDuration(data.mndaTerm, updates.mndaTerm),
    termOfConfidentiality: mergeDuration(
      data.termOfConfidentiality,
      updates.termOfConfidentiality,
    ),
    governingLawState: updates.governingLawState ?? data.governingLawState,
    jurisdiction: updates.jurisdiction ?? data.jurisdiction,
    modifications: updates.modifications ?? data.modifications,
  };
}
