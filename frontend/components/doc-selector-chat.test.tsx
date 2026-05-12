import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocSelectorChat } from "./doc-selector-chat";

function jsonResponse(body: object, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("<DocSelectorChat />", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("greets with the supported documents on mount", () => {
    render(<DocSelectorChat onSelect={vi.fn()} />);
    expect(
      screen.getByText(/What kind of legal document/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mutual NDA — Bilateral/i)).toBeInTheDocument();
    expect(screen.getByText(/CSA — Standard terms/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Addendum — Supplements/i)).toBeInTheDocument();
  });

  it("does not call onSelect when the backend leaves selectedDocumentId null", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        reply: "Could you say a bit more about what you're trying to do?",
        selectedDocumentId: null,
      }),
    );
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<DocSelectorChat onSelect={onSelect} />);

    await user.type(screen.getByLabelText(/Message/i), "I need a contract");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(screen.getByText(/say a bit more/i)).toBeInTheDocument(),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onSelect with the document id when the backend confirms a choice", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        reply: "Great, drafting a Pilot Agreement.",
        selectedDocumentId: "pilot-agreement",
      }),
    );
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<DocSelectorChat onSelect={onSelect} />);

    await user.type(screen.getByLabelText(/Message/i), "pilot");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith("pilot-agreement"),
    );
  });

  it("posts {documentId: null} so the backend uses the selector flow", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ reply: "ok", selectedDocumentId: null }),
    );
    const user = userEvent.setup();
    render(<DocSelectorChat onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText(/Message/i), "hi");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalled(),
    );
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.documentId).toBeNull();
  });
});
