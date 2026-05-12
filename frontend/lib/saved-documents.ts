/**
 * Client API for /api/saved-documents and a debounced autosave hook.
 *
 * Every chat turn updates the form state, which triggers a debounced
 * upsert. The first save creates a row; subsequent saves update it
 * (the hook holds the row id in a ref so the user can keep editing
 * the same document without spawning duplicates).
 */

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import type { Document } from "./documents";

export type SavedDocumentSummary = {
  id: number;
  documentId: string;
  title: string;
  updatedAt: string;
};

export type SavedDocument = SavedDocumentSummary & {
  fields: Record<string, unknown>;
};

export function listSavedDocuments(): Promise<SavedDocumentSummary[]> {
  return apiFetch<SavedDocumentSummary[]>("/api/saved-documents");
}

export function upsertSavedDocument(args: {
  id?: number | null;
  documentId: string;
  title: string;
  fields: Record<string, unknown>;
}): Promise<SavedDocument> {
  return apiFetch<SavedDocument>("/api/saved-documents", {
    method: "POST",
    body: {
      id: args.id ?? null,
      documentId: args.documentId,
      title: args.title,
      fields: args.fields,
    },
  });
}

export function getSavedDocument(id: number): Promise<SavedDocument> {
  return apiFetch<SavedDocument>(`/api/saved-documents/${id}`);
}

export function deleteSavedDocument(id: number): Promise<void> {
  return apiFetch<void>(`/api/saved-documents/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Title builder
// ---------------------------------------------------------------------------

const PARTY_KEYS = [
  "party1",
  "party2",
  "provider",
  "customer",
  "company",
  "partner",
];

function readPartyName(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const company = (value as { company?: unknown }).company;
    if (typeof company === "string") return company.trim();
  }
  return "";
}

export function buildSavedDocumentTitle(
  doc: Document,
  data: Record<string, unknown>,
): string {
  const names: string[] = [];
  for (const key of PARTY_KEYS) {
    const name = readPartyName(data[key]);
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= 2) break;
  }
  if (names.length === 0) return doc.shortName;
  return `${doc.shortName} — ${names.join(" & ")}`;
}

// ---------------------------------------------------------------------------
// Autosave hook
// ---------------------------------------------------------------------------

const AUTOSAVE_DEBOUNCE_MS = 800;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosaveDocument<T extends Record<string, unknown>>(args: {
  doc: Document;
  data: T;
  initialSavedId: number | null;
  enabled: boolean;
}): { savedId: number | null; status: AutosaveStatus; errorMessage: string | null } {
  const { doc, data, initialSavedId, enabled } = args;
  // The consumer remounts (via `key`) when switching between saved documents,
  // so the initial value here is the one that sticks for this hook instance.
  const savedIdRef = useRef<number | null>(initialSavedId);
  const [savedId, setSavedId] = useState<number | null>(initialSavedId);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const handle = window.setTimeout(async () => {
      setStatus("saving");
      try {
        const result = await upsertSavedDocument({
          id: savedIdRef.current,
          documentId: doc.id,
          title: buildSavedDocumentTitle(doc, data),
          fields: data,
        });
        savedIdRef.current = result.id;
        setSavedId(result.id);
        setStatus("saved");
        setErrorMessage(null);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Could not save document.",
        );
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [doc, data, enabled]);

  return { savedId, status, errorMessage };
}
