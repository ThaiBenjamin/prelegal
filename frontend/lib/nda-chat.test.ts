import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { applyUpdates, sendChat } from "./nda-chat";
import { defaultFormData } from "./nda-defaults";

describe("applyUpdates", () => {
  it("merges party patches field-by-field, leaving unspecified fields alone", () => {
    const next = applyUpdates(defaultFormData, {
      party1: { company: "Acme, Inc.", signatoryName: "Jane Doe" },
    });
    expect(next.party1.company).toBe("Acme, Inc.");
    expect(next.party1.signatoryName).toBe("Jane Doe");
    expect(next.party1.signatoryTitle).toBe(defaultFormData.party1.signatoryTitle);
    expect(next.party2).toEqual(defaultFormData.party2);
  });

  it("replaces scalar fields when provided and leaves them untouched when null", () => {
    const next = applyUpdates(defaultFormData, {
      governingLawState: "Delaware",
      jurisdiction: null,
    });
    expect(next.governingLawState).toBe("Delaware");
    expect(next.jurisdiction).toBe(defaultFormData.jurisdiction);
  });

  it("swaps mndaTerm to until-terminated and drops years", () => {
    const start = { ...defaultFormData, mndaTerm: { kind: "years" as const, years: 5 } };
    const next = applyUpdates(start, {
      mndaTerm: { kind: "until-terminated" },
    });
    expect(next.mndaTerm).toEqual({ kind: "until-terminated" });
  });

  it("swaps mndaTerm to years, clamping to at least 1", () => {
    const next = applyUpdates(defaultFormData, {
      mndaTerm: { kind: "years", years: 0 },
    });
    expect(next.mndaTerm).toEqual({ kind: "years", years: 1 });
  });

  it("swaps termOfConfidentiality to perpetuity", () => {
    const next = applyUpdates(defaultFormData, {
      termOfConfidentiality: { kind: "perpetuity" },
    });
    expect(next.termOfConfidentiality).toEqual({ kind: "perpetuity" });
  });

  it("preserves prior years when patch.kind=years omits years", () => {
    const start = {
      ...defaultFormData,
      termOfConfidentiality: { kind: "years" as const, years: 7 },
    };
    const next = applyUpdates(start, {
      termOfConfidentiality: { kind: "years" },
    });
    expect(next.termOfConfidentiality).toEqual({ kind: "years", years: 7 });
  });

  it("is a no-op when updates is empty", () => {
    expect(applyUpdates(defaultFormData, {})).toEqual(defaultFormData);
  });
});

describe("sendChat", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs to /api/chat with the messages and current data", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ reply: "hi", updates: {} }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await sendChat({
      messages: [{ role: "user", content: "hello" }],
      currentData: defaultFormData,
    });

    expect(result.reply).toBe("hi");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(url).toBe("/api/chat");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(body.currentData).toEqual(defaultFormData);
  });

  it("throws with the server's `detail` message on a non-OK response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ detail: "rate limited" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(
      sendChat({ messages: [], currentData: defaultFormData }),
    ).rejects.toThrow("rate limited");
  });

  it("falls back to a generic message when the error body has no detail", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("oops", { status: 500 }),
    );
    await expect(
      sendChat({ messages: [], currentData: defaultFormData }),
    ).rejects.toThrow(/500/);
  });
});
