"use client";

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
            <RadioGroup
              value={data.mndaTerm.kind}
              onValueChange={(v) =>
                update(
                  "mndaTerm",
                  v === "years"
                    ? { kind: "years", years: data.mndaTerm.kind === "years" ? data.mndaTerm.years : 1 }
                    : { kind: "until-terminated" },
                )
              }
              className="grid gap-2"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="years" id="term-years" />
                <Label htmlFor="term-years" className="flex items-center gap-2 font-normal">
                  Expires
                  <Input
                    type="number"
                    min={1}
                    className="h-8 w-20"
                    value={data.mndaTerm.kind === "years" ? data.mndaTerm.years : 1}
                    disabled={data.mndaTerm.kind !== "years"}
                    onChange={(e) => {
                      if (data.mndaTerm.kind !== "years") return;
                      update("mndaTerm", {
                        kind: "years",
                        years: Math.max(1, Number(e.target.value) || 1),
                      });
                    }}
                  />
                  year(s) from effective date
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="until-terminated" id="term-until" />
                <Label htmlFor="term-until" className="font-normal">
                  Continues until terminated
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label>Term of confidentiality</Label>
            <RadioGroup
              value={data.termOfConfidentiality.kind}
              onValueChange={(v) =>
                update(
                  "termOfConfidentiality",
                  v === "years"
                    ? {
                        kind: "years",
                        years:
                          data.termOfConfidentiality.kind === "years"
                            ? data.termOfConfidentiality.years
                            : 1,
                      }
                    : { kind: "perpetuity" },
                )
              }
              className="grid gap-2"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="years" id="conf-years" />
                <Label htmlFor="conf-years" className="flex items-center gap-2 font-normal">
                  <Input
                    type="number"
                    min={1}
                    className="h-8 w-20"
                    value={
                      data.termOfConfidentiality.kind === "years"
                        ? data.termOfConfidentiality.years
                        : 1
                    }
                    disabled={data.termOfConfidentiality.kind !== "years"}
                    onChange={(e) => {
                      if (data.termOfConfidentiality.kind !== "years") return;
                      update("termOfConfidentiality", {
                        kind: "years",
                        years: Math.max(1, Number(e.target.value) || 1),
                      });
                    }}
                  />
                  year(s) from effective date (trade secrets continue)
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="perpetuity" id="conf-perp" />
                <Label htmlFor="conf-perp" className="font-normal">
                  In perpetuity
                </Label>
              </div>
            </RadioGroup>
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
