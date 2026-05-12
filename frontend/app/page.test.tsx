import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const downloadMock = vi.fn().mockResolvedValue(undefined);
const routerReplace = vi.fn();
const routerPush = vi.fn();
const stableRouter = { push: routerPush, replace: routerReplace };

vi.mock("@/lib/pdf", () => ({
  downloadElementAsPdf: (...args: unknown[]) => downloadMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import Home from "./page";
import { saveSession, clearSession } from "@/lib/auth";

function jsonResponse(body: object, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function textResponse(body: string, init?: ResponseInit) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain" },
    ...init,
  });
}

function mockApi() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/standard-terms")) {
      return textResponse("# Standard Terms\n\n1. Hello.\n");
    }
    if (url.includes("/api/saved-documents")) {
      // Autosave upsert returns a fresh row id.
      return jsonResponse({
        id: 1,
        documentId: "mutual-nda",
        title: "Mutual NDA",
        updatedAt: new Date().toISOString(),
        fields: {},
      });
    }
    return jsonResponse({ reply: "ok", selectedDocumentId: null });
  }) as unknown as typeof fetch;
}

async function pickMutualNda() {
  const user = userEvent.setup();
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    jsonResponse({
      reply: "Great, drafting the Mutual NDA.",
      selectedDocumentId: "mutual-nda",
    }),
  );
  await waitFor(() =>
    expect(screen.getByText("Pick a document")).toBeInTheDocument(),
  );
  await user.type(screen.getByLabelText(/Message/i), "I want a Mutual NDA");
  await user.click(screen.getByRole("button", { name: /Send/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Download Mutual NDA PDF/i }),
    ).toBeInTheDocument(),
  );
}

describe("<Home /> (page integration)", () => {
  beforeEach(() => {
    downloadMock.mockClear();
    routerReplace.mockClear();
    routerPush.mockClear();
    clearSession();
    saveSession(
      { id: 1, name: "Test User", email: "test@example.com" },
      "test-token",
    );
    mockApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in document-selector mode and lists supported documents", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText("Pick a document")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Mutual NDA — Bilateral/i)).toBeInTheDocument();
    expect(screen.getByText(/CSA — Standard terms/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Download/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects to /login when no user or token is in storage", async () => {
    clearSession();
    render(<Home />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/login"));
  });

  it("shows the signed-in name, navigation, and Sign out action", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText(/Signed in as/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /My documents/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign out/i }),
    ).toBeInTheDocument();
  });

  it("renders the draft-only disclaimer banner", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText(/Draft only\./)).toBeInTheDocument(),
    );
  });

  it("navigates to /documents when the My documents nav button is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /My documents/i }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /My documents/i }));
    expect(routerPush).toHaveBeenCalledWith("/documents");
  });

  it("clears the session and redirects on Sign out", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Sign out/i }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(window.localStorage.getItem("prelegal:user")).toBeNull();
    expect(window.localStorage.getItem("prelegal:token")).toBeNull();
    expect(routerReplace).toHaveBeenCalledWith("/login");
  });

  it("transitions to the NDA creator after the selector picks Mutual NDA", async () => {
    render(<Home />);
    await pickMutualNda();
    expect(screen.getByText(/Chat to draft your NDA/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download Mutual NDA PDF/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Pick a different document/i }),
    ).toBeInTheDocument();
  });

  it("falls back to party1/party2 in the NDA filename when company names are blank", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await pickMutualNda();
    await user.click(
      screen.getByRole("button", { name: /Download Mutual NDA PDF/i }),
    );
    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [, filename] = downloadMock.mock.calls[0];
    expect(filename).toBe("mutual-nda-party1-party2.pdf");
  });

  it("includes the captured disclaimer block in the preview DOM", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await pickMutualNda();
    await user.click(
      screen.getByRole("button", { name: /Download Mutual NDA PDF/i }),
    );
    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [element] = downloadMock.mock.calls[0];
    expect(element).toBeInstanceOf(HTMLElement);
    expect(
      (element as HTMLElement).textContent ?? "",
    ).toMatch(/DRAFT — SUBJECT TO LEGAL REVIEW/);
  });

  it("returns to the selector when 'Pick a different document' is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await pickMutualNda();
    await user.click(
      screen.getByRole("button", { name: /Pick a different document/i }),
    );
    expect(screen.getByText("Pick a document")).toBeInTheDocument();
  });
});
