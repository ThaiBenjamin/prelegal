"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NdaChat } from "@/components/nda-chat";
import { NdaPreview } from "@/components/nda-preview";
import { DocSelectorChat } from "@/components/doc-selector-chat";
import { GenericChat } from "@/components/generic-chat";
import { GenericPreview } from "@/components/generic-preview";
import { defaultFormData } from "@/lib/nda-defaults";
import type { NdaFormData } from "@/lib/nda-types";
import { downloadElementAsPdf } from "@/lib/pdf";
import { clearUser, loadUser, type User } from "@/lib/auth";
import { DOCUMENTS, getDocument, type Document } from "@/lib/documents";
import { defaultDocFormData, type DocFormData } from "@/lib/generic-chat";

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

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    const u = loadUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setAuthChecked(true);
    // Run once on mount; useRouter() returns a stable reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = () => {
    clearUser();
    router.replace("/login");
  };

  if (!authChecked || !user) return null;

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {selectedDoc ? `${selectedDoc.name} Creator` : "Prelegal"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedDoc
                ? "Chat with the assistant, watch the agreement build itself, and download a PDF."
                : "Pick a document to draft. Chat with us about what you need."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.name}</span>
            </span>
            {selectedDoc && (
              <Button
                variant="outline"
                onClick={() => setSelectedDoc(null)}
              >
                Pick a different document
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {selectedDoc ? (
          selectedDoc.id === "mutual-nda" ? (
            <NdaCreator doc={selectedDoc} />
          ) : (
            // Key by id so navigating between generic docs gives each a
            // fresh state tree instead of leaking the previous doc's data.
            <GenericCreator key={selectedDoc.id} doc={selectedDoc} />
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

function NdaCreator({ doc }: { doc: Document }) {
  const [data, setData] = useState<NdaFormData>(defaultFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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
      chat={<NdaChat data={data} onChange={setData} />}
      preview={
        <NdaPreview ref={previewRef} data={data} onChange={setData} />
      }
    />
  );
}

function GenericCreator({ doc }: { doc: Document }) {
  const [data, setData] = useState<DocFormData>(() => defaultDocFormData(doc));
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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
  chat,
  preview,
}: {
  doc: Document;
  isGenerating: boolean;
  onDownload: () => void;
  chat: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={onDownload} disabled={isGenerating}>
          {isGenerating ? "Generating…" : `Download ${doc.shortName} PDF`}
        </Button>
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
