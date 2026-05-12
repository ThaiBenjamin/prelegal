"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NdaChat } from "@/components/nda-chat";
import { NdaPreview } from "@/components/nda-preview";
import { DocSelectorChat } from "@/components/doc-selector-chat";
import { GenericChat } from "@/components/generic-chat";
import { GenericPreview } from "@/components/generic-preview";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { defaultFormData } from "@/lib/nda-defaults";
import type { NdaFormData } from "@/lib/nda-types";
import { downloadElementAsPdf } from "@/lib/pdf";
import { clearSession, loadToken, loadUser, type User } from "@/lib/auth";
import { DOCUMENTS, getDocument, type Document } from "@/lib/documents";
import { defaultDocFormData, type DocFormData } from "@/lib/generic-chat";
import {
  getSavedDocument,
  useAutosaveDocument,
} from "@/lib/saved-documents";

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildNdaFilename(data: NdaFormData): string {
  const a = slug(data.party1.company) || "party1";
  const b = slug(data.party2.company) || "party2";
  return `mutual-nda-${a}-${b}.pdf`;
}

function buildDocFilename(doc: Document, data: DocFormData): string {
  const partyKeys = ["provider", "company", "partner", "customer"];
  const parties: string[] = [];
  for (const key of partyKeys) {
    if (data[key]) parties.push(slug(data[key]));
  }
  const suffix = parties.slice(0, 2).filter(Boolean).join("-") || "document";
  return `${doc.id}-${suffix}.pdf`;
}

function readOpenDocFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("openDoc");
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type ResumeState = {
  doc: Document;
  ndaData: NdaFormData | null;
  docData: DocFormData | null;
  savedId: number;
};

export default function Home() {
  const router = useRouter();
  const [user] = useState<User | null>(() => loadUser());
  const [token] = useState<string | null>(() => loadToken());
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [openDocError, setOpenDocError] = useState<string | null>(null);
  const authReady = user !== null && token !== null;

  useEffect(() => {
    if (!authReady) {
      router.replace("/login");
    }
  }, [authReady, router]);

  useEffect(() => {
    if (!authReady) return;
    const openDocId = readOpenDocFromUrl();
    if (!openDocId) return;
    let cancelled = false;
    void (async () => {
      try {
        const saved = await getSavedDocument(openDocId);
        if (cancelled) return;
        const doc = getDocument(saved.documentId);
        if (!doc) {
          setOpenDocError(
            `Saved document references unknown type "${saved.documentId}".`,
          );
          return;
        }
        if (doc.id === "mutual-nda") {
          setResume({
            doc,
            ndaData: {
              ...defaultFormData,
              ...(saved.fields as Partial<NdaFormData>),
            } as NdaFormData,
            docData: null,
            savedId: saved.id,
          });
        } else {
          const base = defaultDocFormData(doc);
          setResume({
            doc,
            ndaData: null,
            docData: { ...base, ...(saved.fields as DocFormData) },
            savedId: saved.id,
          });
        }
        setSelectedDoc(doc);
        // Strip ?openDoc from the URL so a refresh starts clean.
        window.history.replaceState(null, "", "/");
      } catch (err) {
        if (cancelled) return;
        setOpenDocError(
          err instanceof Error ? err.message : "Could not load saved document.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const handleSignOut = () => {
    clearSession();
    router.replace("/login");
  };

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[color:var(--brand-navy)] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setSelectedDoc(null);
                setResume(null);
              }}
              className="flex items-center gap-2 text-xl font-bold tracking-tight"
            >
              <span aria-hidden="true" className="text-[color:var(--brand-yellow)]">
                §
              </span>
              Prelegal
            </button>
            <nav className="flex items-center gap-4 text-sm">
              <span className="font-medium text-white">Draft new</span>
              <button
                type="button"
                onClick={() => router.push("/documents")}
                className="text-white/70 hover:text-white"
              >
                My documents
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/70">
              Signed in as{" "}
              <span className="font-medium text-white">{user.name}</span>
            </span>
            {selectedDoc && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDoc(null);
                  setResume(null);
                }}
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Pick a different document
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <DisclaimerBanner />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {openDocError && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {openDocError}
          </p>
        )}
        {selectedDoc ? (
          selectedDoc.id === "mutual-nda" ? (
            <NdaCreator
              key={resume?.savedId ?? "new-nda"}
              doc={selectedDoc}
              initialData={resume?.ndaData ?? null}
              initialSavedId={
                resume?.doc.id === "mutual-nda" ? resume.savedId : null
              }
            />
          ) : (
            <GenericCreator
              key={`${selectedDoc.id}-${resume?.savedId ?? "new"}`}
              doc={selectedDoc}
              initialData={resume?.docData ?? null}
              initialSavedId={
                resume?.doc.id === selectedDoc.id ? resume.savedId : null
              }
            />
          )
        ) : (
          <DocSelectorChat
            onSelect={(id) => {
              const doc = getDocument(id) ?? DOCUMENTS[0];
              setSelectedDoc(doc);
            }}
          />
        )}
      </main>
    </div>
  );
}

function AutosaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : "Save failed";
  const color =
    status === "error" ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`text-xs ${color}`} aria-live="polite">
      {label}
    </span>
  );
}

function NdaCreator({
  doc,
  initialData,
  initialSavedId,
}: {
  doc: Document;
  initialData: NdaFormData | null;
  initialSavedId: number | null;
}) {
  const [data, setData] = useState<NdaFormData>(initialData ?? defaultFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { status } = useAutosaveDocument({
    doc,
    data: data as unknown as Record<string, unknown>,
    initialSavedId,
    enabled: true,
  });

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      await downloadElementAsPdf(previewRef.current, buildNdaFilename(data));
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF. See console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <CreatorLayout
      doc={doc}
      isGenerating={isGenerating}
      onDownload={handleDownload}
      autosaveStatus={status}
      chat={<NdaChat data={data} onChange={setData} />}
      preview={
        <NdaPreview ref={previewRef} data={data} onChange={setData} />
      }
    />
  );
}

function GenericCreator({
  doc,
  initialData,
  initialSavedId,
}: {
  doc: Document;
  initialData: DocFormData | null;
  initialSavedId: number | null;
}) {
  const [data, setData] = useState<DocFormData>(
    () => initialData ?? defaultDocFormData(doc),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { status } = useAutosaveDocument({
    doc,
    data,
    initialSavedId,
    enabled: true,
  });

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      await downloadElementAsPdf(
        previewRef.current,
        buildDocFilename(doc, data),
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF. See console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <CreatorLayout
      doc={doc}
      isGenerating={isGenerating}
      onDownload={handleDownload}
      autosaveStatus={status}
      chat={<GenericChat doc={doc} data={data} onChange={setData} />}
      preview={
        <GenericPreview
          ref={previewRef}
          doc={doc}
          data={data}
          onChange={setData}
        />
      }
    />
  );
}

function CreatorLayout({
  doc,
  isGenerating,
  onDownload,
  autosaveStatus,
  chat,
  preview,
}: {
  doc: Document;
  isGenerating: boolean;
  onDownload: () => void;
  autosaveStatus: "idle" | "saving" | "saved" | "error";
  chat: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[color:var(--brand-navy)]">
            {doc.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat with the assistant, watch the agreement build itself, and download a PDF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AutosaveBadge status={autosaveStatus} />
          <Button onClick={onDownload} disabled={isGenerating}>
            {isGenerating ? "Generating…" : `Download ${doc.shortName} PDF`}
          </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label={`${doc.shortName} chat`} className="space-y-4">
          {chat}
        </section>
        <section
          aria-label={`${doc.shortName} preview`}
          className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto"
        >
          <div className="overflow-auto rounded-lg border bg-white p-4 shadow-sm">
            {preview}
          </div>
        </section>
      </div>
    </>
  );
}
