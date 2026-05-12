import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { GenericChat } from "./generic-chat";
import { defaultDocFormData, type DocFormData } from "@/lib/generic-chat";
import { getDocument } from "@/lib/documents";

const CSA = getDocument("csa")!;

function jsonResponse(body: object, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function Harness({ onChange }: { onChange?: (next: DocFormData) => void }) {
  const [data, setData] = useState<DocFormData>(defaultDocFormData(CSA));
  return (
    <GenericChat
      doc={CSA}
      data={data}
      onChange={(next) => {
        setData(next);
        onChange?.(next);
      }}
    />
  );
}

describe("<GenericChat />", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("greets the user with the selected doc's first field", () => {
    render(<Harness />);
    expect(screen.getByText(/I'll help you fill out a CSA/i)).toBeInTheDocument();
    expect(screen.getByText(/what is the Provider/i)).toBeInTheDocument();
  });

  it("merges only known field updates into form state", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        reply: "Got it. Who is the Customer?",
        updates: {
          provider: "Acme, Inc.",
          notARealField: "ignored",
        },
      }),
    );
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.type(screen.getByLabelText(/Message/i), "Provider is Acme.");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(screen.getByText(/Who is the Customer/i)).toBeInTheDocument();
    });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as DocFormData;
    expect(last.provider).toBe("Acme, Inc.");
    expect("notARealField" in last).toBe(false);
  });

  it("posts the document id with the request", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ reply: "ok", updates: {} }),
    );
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/Message/i), "hi");
    await user.click(screen.getByRole("button", { name: /Send/i }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.documentId).toBe("csa");
  });

  it("returns focus to the textarea after the assistant replies", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ reply: "Anything else?", updates: {} }),
    );
    const user = userEvent.setup();
    render(<Harness />);
    const composer = screen.getByLabelText(/Message/i);
    await user.type(composer, "first answer");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(screen.getByText(/Anything else\?/i)).toBeInTheDocument(),
    );
    expect(document.activeElement).toBe(composer);
  });
});
