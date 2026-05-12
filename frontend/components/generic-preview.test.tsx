import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { GenericPreview } from "./generic-preview";
import { defaultDocFormData, type DocFormData } from "@/lib/generic-chat";
import { getDocument } from "@/lib/documents";

const PILOT = getDocument("pilot-agreement")!;

function textResponse(body: string, init?: ResponseInit) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain" },
    ...init,
  });
}

function Harness() {
  const [data, setData] = useState<DocFormData>(defaultDocFormData(PILOT));
  return <GenericPreview doc={PILOT} data={data} onChange={setData} />;
}

describe("<GenericPreview />", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      textResponse(
        "# Pilot Agreement\n\n1. **Overview** Pilot terms.\n    1. Scope.\n",
      ),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the cover page with one editor per field", () => {
    render(<Harness />);
    expect(screen.getByText("Pilot Agreement")).toBeInTheDocument();
    for (const f of PILOT.fields) {
      expect(screen.getByLabelText(f.label)).toBeInTheDocument();
    }
  });

  it("emits both cover and terms page sections marked for PDF capture", () => {
    const { container } = render(<Harness />);
    expect(
      container.querySelector('[data-nda-page="cover"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-nda-page="terms"]'),
    ).toBeInTheDocument();
  });

  it("propagates field edits to the parent's onChange", async () => {
    const onChange = vi.fn();
    function Local() {
      const [data, setData] = useState<DocFormData>(defaultDocFormData(PILOT));
      return (
        <GenericPreview
          doc={PILOT}
          data={data}
          onChange={(next) => {
            setData(next);
            onChange(next);
          }}
        />
      );
    }
    const user = userEvent.setup();
    render(<Local />);
    const provider = screen.getByLabelText("Provider") as HTMLInputElement;
    await user.type(provider, "Acme");
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as DocFormData;
    expect(last.provider).toBe("Acme");
  });

  it("loads the standard terms markdown for the selected document", async () => {
    render(<Harness />);
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url]) => url === "/api/documents/pilot-agreement/standard-terms",
        ),
      ).toBe(true),
    );
  });
});
