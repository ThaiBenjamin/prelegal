"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NdaForm } from "@/components/nda-form";
import { NdaPreview } from "@/components/nda-preview";
import { defaultFormData } from "@/lib/nda-defaults";
import type { NdaFormData } from "@/lib/nda-types";
import { downloadElementAsPdf } from "@/lib/pdf";

function buildFilename(data: NdaFormData): string {
  const slug = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const a = slug(data.party1.company) || "party1";
  const b = slug(data.party2.company) || "party2";
  return `mutual-nda-${a}-${b}.pdf`;
}

export default function Home() {
  const [data, setData] = useState<NdaFormData>(defaultFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      await downloadElementAsPdf(previewRef.current, buildFilename(data));
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF. See console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Mutual NDA Creator
            </h1>
            <p className="text-sm text-muted-foreground">
              Fill in the details, preview the agreement, and download a PDF.
            </p>
          </div>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-2">
        <section aria-label="NDA inputs" className="space-y-4">
          <NdaForm data={data} onChange={setData} />
        </section>

        <section
          aria-label="NDA preview"
          className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto"
        >
          <div className="overflow-auto rounded-lg border bg-white p-4 shadow-sm">
            <NdaPreview ref={previewRef} data={data} />
          </div>
        </section>
      </main>
    </div>
  );
}
