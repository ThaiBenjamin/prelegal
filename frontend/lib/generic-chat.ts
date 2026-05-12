/**
 * Client helpers for the generic (non-NDA) document chat.
 *
 * The backend returns `{ reply, updates }` per turn where `updates` is a
 * flat object of `{ fieldName: string | null }` matching the document's
 * field schema. `applyDocUpdates` merges those into the local form state.
 */

import type { Document } from "./documents";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type DocFormData = Record<string, string>;

export type DocUpdates = Record<string, string | null>;

export type DocChatResponse = {
  reply: string;
  updates: DocUpdates;
};

export type SelectorResponse = {
  reply: string;
  selectedDocumentId: string | null;
};

async function postChat<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const data = (await res.json()) as { detail?: unknown };
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      // keep default
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export function sendDocChat(args: {
  messages: ChatMessage[];
  currentData: DocFormData;
  documentId: string;
}): Promise<DocChatResponse> {
  return postChat<DocChatResponse>(args);
}

export function sendSelectorChat(args: {
  messages: ChatMessage[];
}): Promise<SelectorResponse> {
  return postChat<SelectorResponse>({
    messages: args.messages,
    currentData: {},
    documentId: null,
  });
}

export function defaultDocFormData(doc: Document): DocFormData {
  const data: DocFormData = {};
  for (const f of doc.fields) {
    if (f.kind === "date") {
      data[f.name] = new Date().toISOString().slice(0, 10);
    } else {
      data[f.name] = "";
    }
  }
  return data;
}

export function applyDocUpdates(
  data: DocFormData,
  updates: DocUpdates,
): DocFormData {
  const next = { ...data };
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) continue;
    if (!(key in next)) continue; // ignore stray fields the model invents
    next[key] = value;
  }
  return next;
}

export async function fetchStandardTerms(documentId: string): Promise<string> {
  const res = await fetch(`/api/documents/${documentId}/standard-terms`);
  if (!res.ok) {
    throw new Error(
      `Could not load standard terms (${res.status}): ${await res.text()}`,
    );
  }
  return await res.text();
}
