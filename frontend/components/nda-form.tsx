"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { NdaFormData, PartyInfo } from "@/lib/nda-types";

type Props = {
  data: NdaFormData;
  onChange: (next: NdaFormData) => void;
};

type WithYears = { kind: "years"; years: number };
type Choice<A extends string> = WithYears | { kind: A };

function isWithYears<A extends string>(c: Choice<A>): c is WithYears {
  return c.kind === "years";
}

function YearsOrAlternativeRadio<A extends string>({
  value,
  onChange,
  alternativeKind,
  alternativeLabel,
  yearsPrefix,
  yearsSuffix,
  idPrefix,
}: {
  value: Choice<A>;
  onChange: (next: Choice<A>) => void;
  alternativeKind: A;
  alternativeLabel: string;
  yearsPrefix?: ReactNode;
  yearsSuffix: ReactNode;
  idPrefix: string;
}) {
  const [storedYears, setStoredYears] = useState(
    isWithYears(value) ? value.years : 1,
  );

  const yearsId = `${idPrefix}-years`;
  const altId = `${idPrefix}-alt`;
  const isYears = isWithYears(value);
  const displayYears = isWithYears(value) ? value.years : storedYears;

  return (
    <RadioGroup
      value={value.kind}
      onValueChange={(v) =>
        onChange(
          v === "years"
            ? { kind: "years", years: storedYears }
            : { kind: alternativeKind },
        )
      }
      className="grid gap-2"
    >
      <div className="flex items-center gap-3">
        <RadioGroupItem value="years" id={yearsId} />
        <Label
          htmlFor={yearsId}
          className="flex items-center gap-2 font-normal"
        >
          {yearsPrefix}
          <Input
            type="number"
            min={1}
            className="h-8 w-20"
            value={displayYears}
            disabled={!isYears}
            onChange={(e) => {
              if (!isYears) return;
              const years = Math.max(1, Number(e.target.value) || 1);
              setStoredYears(years);
              onChange({ kind: "years", years });
            }}
          />
          {yearsSuffix}
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value={alternativeKind} id={altId} />
        <Label htmlFor={altId} className="font-normal">
          {alternativeLabel}
        </Label>
      </div>
    </RadioGroup>
  );
}

function PartyFields({
  legend,
  party,
  onChange,
}: {
  legend: string;
  party: PartyInfo;
  onChange: (next: PartyInfo) => void;
}) {
  const id = legend.toLowerCase().replace(/\s+/g, "-");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{legend}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-company`}>Company</Label>
          <Input
            id={`${id}-company`}
            value={party.company}
            onChange={(e) => onChange({ ...party, company: e.target.value })}
            placeholder="Acme, Inc."
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>Signatory name</Label>
          <Input
            id={`${id}-name`}
            value={party.signatoryName}
            onChange={(e) =>
              onChange({ ...party, signatoryName: e.target.value })
            }
            placeholder="Jane Doe"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-title`}>Signatory title</Label>
          <Input
            id={`${id}-title`}
            value={party.signatoryTitle}
            onChange={(e) =>
              onChange({ ...party, signatoryTitle: e.target.value })
            }
            placeholder="Chief Executive Officer"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-address`}>Notice address</Label>
          <Textarea
            id={`${id}-address`}
            value={party.noticeAddress}
            onChange={(e) =>
              onChange({ ...party, noticeAddress: e.target.value })
            }
            placeholder="legal@acme.com or 123 Main St, City, ST 00000"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function NdaForm({ data, onChange }: Props) {
  const update = <K extends keyof NdaFormData>(
    key: K,
    value: NdaFormData[K],
  ) => onChange({ ...data, [key]: value });

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <PartyFields
          legend="Party 1"
          party={data.party1}
          onChange={(next) => update("party1", next)}
        />
        <PartyFields
          legend="Party 2"
          party={data.party2}
          onChange={(next) => update("party2", next)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agreement details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={data.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="effective-date">Effective date</Label>
            <Input
              id="effective-date"
              type="date"
              value={data.effectiveDate}
              onChange={(e) => update("effectiveDate", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>MNDA term</Label>
            <YearsOrAlternativeRadio
              value={data.mndaTerm}
              onChange={(next) => update("mndaTerm", next)}
              alternativeKind="until-terminated"
              alternativeLabel="Continues until terminated"
              yearsPrefix="Expires"
              yearsSuffix="year(s) from effective date"
              idPrefix="term"
            />
          </div>

          <div className="grid gap-2">
            <Label>Term of confidentiality</Label>
            <YearsOrAlternativeRadio
              value={data.termOfConfidentiality}
              onChange={(next) => update("termOfConfidentiality", next)}
              alternativeKind="perpetuity"
              alternativeLabel="In perpetuity"
              yearsSuffix="year(s) from effective date (trade secrets continue)"
              idPrefix="conf"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="governing-law">Governing law (state)</Label>
              <Input
                id="governing-law"
                value={data.governingLawState}
                onChange={(e) => update("governingLawState", e.target.value)}
                placeholder="Delaware"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="jurisdiction">Jurisdiction (city/county, state)</Label>
              <Input
                id="jurisdiction"
                value={data.jurisdiction}
                onChange={(e) => update("jurisdiction", e.target.value)}
                placeholder="New Castle, Delaware"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="modifications">MNDA modifications (optional)</Label>
            <Textarea
              id="modifications"
              value={data.modifications}
              onChange={(e) => update("modifications", e.target.value)}
              rows={3}
              placeholder="List any modifications to the Standard Terms, or leave blank."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
