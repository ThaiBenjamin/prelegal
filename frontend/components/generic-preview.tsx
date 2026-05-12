"use client";

import { useEffect, useState, type Ref } from "react";
import type { Document, FieldSpec } from "@/lib/documents";
import type { DocFormData } from "@/lib/generic-chat";
import { fetchStandardTerms } from "@/lib/generic-chat";
import { renderStandardTermsMarkdown } from "@/lib/standard-terms-md";
import { NDA_BLOCK_ATTR, NDA_PAGE_ATTR } from "@/lib/nda-selectors";
import { formatHumanDate } from "@/lib/nda-format";
import { DocumentDisclaimer } from "@/components/document-disclaimer";

type Props = {
  doc: Document;
  data: DocFormData;
  onChange: (next: DocFormData) => void;
  ref?: Ref<HTMLDivElement>;
};

const PAGE_STYLE: React.CSSProperties = {
  width: "8.5in",
  minHeight: "11in",
  padding: "0.75in",
  fontFamily: '"Times New Roman", Times, serif',
  fontSize: "11pt",
  lineHeight: 1.5,
  color: "#000",
  backgroundColor: "#fff",
};

function Block({ children }: { children: React.ReactNode }) {
  const props = { [NDA_BLOCK_ATTR]: "" };
  return (
    <div {...props} className="mb-3">
      {children}
    </div>
  );
}

function Page({
  kind,
  children,
}: {
  kind: "cover" | "terms";
  children: React.ReactNode;
}) {
  const props = { [NDA_PAGE_ATTR]: kind };
  return (
    <section {...props} style={PAGE_STYLE}>
      {children}
    </section>
  );
}

function FieldEditor({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  onChange: (next: string) => void;
}) {
  const baseInput =
    "w-full border-b border-dotted border-gray-400 bg-transparent font-serif text-[11pt] focus:outline-none focus:border-solid focus:border-[#209dd7]";
  if (spec.kind === "longtext") {
    return (
      <textarea
        aria-label={spec.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={spec.placeholder}
        rows={3}
        className={`${baseInput} resize-y leading-snug`}
      />
    );
  }
  if (spec.kind === "date") {
    return (
      <div className="flex items-baseline gap-3">
        <input
          type="date"
          aria-label={spec.label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput.replace("w-full", "w-auto")}
        />
        {value && (
          <span className="text-xs text-gray-500">
            ({formatHumanDate(value)})
          </span>
        )}
      </div>
    );
  }
  return (
    <input
      type="text"
      aria-label={spec.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={spec.placeholder}
      className={baseInput}
    />
  );
}

export function GenericPreview({ doc, data, onChange, ref }: Props) {
  const [terms, setTerms] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  // GenericCreator keys this component by doc.id, so we mount fresh per
  // document and only need to fetch once.
  useEffect(() => {
    let cancelled = false;
    fetchStandardTerms(doc.id)
      .then((md) => {
        if (!cancelled) setTerms(md);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTermsError(
            err instanceof Error ? err.message : "Could not load standard terms.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (name: string, next: string) =>
    onChange({ ...data, [name]: next });

  return (
    <div
      ref={ref}
      data-nda-document
      className="mx-auto flex flex-col gap-6 bg-white text-black"
    >
      <Page kind="cover">
        <DocumentDisclaimer />
        <Block>
          <h1 className="mb-3 text-center text-2xl font-bold">{doc.name}</h1>
          <p className="text-sm">
            This {doc.shortName} consists of: (1) this Cover Page and (2)
            the Standard Terms that follow. The Cover Page captures the
            specifics; the Standard Terms govern the relationship between
            the parties.
          </p>
        </Block>

        {doc.fields.map((spec) => (
          <Block key={spec.name}>
            <h2 className="mb-1 text-base font-bold text-black">
              {spec.label}
            </h2>
            <FieldEditor
              spec={spec}
              value={data[spec.name] ?? ""}
              onChange={(next) => setField(spec.name, next)}
            />
          </Block>
        ))}

        <Block>
          <p className="mt-4 text-sm">
            By signing this Cover Page, each party agrees to enter into this
            agreement as of the Effective Date.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <SignatureBlock label="Party 1" />
            <SignatureBlock label="Party 2" />
          </div>
        </Block>
      </Page>

      <Page kind="terms">
        {termsError && (
          <Block>
            <p className="text-sm text-red-700">{termsError}</p>
          </Block>
        )}
        {terms && (
          <Block>{renderStandardTermsMarkdown(terms)}</Block>
        )}
        {!terms && !termsError && (
          <Block>
            <p className="text-sm text-gray-500">Loading standard terms...</p>
          </Block>
        )}
      </Page>
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div className="border border-black p-3">
      <div className="mb-2 text-sm font-bold uppercase tracking-wide">
        {label}
      </div>
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-semibold">Print Name:</span>{" "}
          <span className="text-gray-500">_______________________</span>
        </div>
        <div>
          <span className="font-semibold">Title:</span>{" "}
          <span className="text-gray-500">_______________________</span>
        </div>
        <div>
          <span className="font-semibold">Signature:</span>{" "}
          <span className="text-gray-500">_______________________</span>
        </div>
        <div>
          <span className="font-semibold">Date:</span>{" "}
          <span className="text-gray-500">_______________________</span>
        </div>
      </div>
    </div>
  );
}
