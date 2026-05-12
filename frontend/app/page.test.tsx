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
import { saveUser, clearUser } from "@/lib/auth";

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
  // Default mock: any call returns a benign chat reply with no selection.
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/standard-terms")) {
      return textResponse("# Standard Terms\n\n1. Hello.\n");
    }
    return jsonResponse({ reply: "ok", selectedDocumentId: null });
  }) as unknown as typeof fetch;
}

async function pickMutualNda() {
  const user = userEvent.setup();
  // Once the selector is visible, send a message that the (mocked) selector
  // resolves to mutual-nda.
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
      screen.getByText("Mutual Non-Disclosure Agreement Creator"),
    ).toBeInTheDocument(),
  );
}

describe("<Home /> (page integration)", () => {
  beforeEach(() => {
    downloadMock.mockClear();
    routerReplace.mockClear();
    clearUser();
    saveUser({ name: "Test User" });
    mockApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in document-selector mode and lists supported documents", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Prelegal" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Pick a document")).toBeInTheDocument();
    // Selector greeting bullet-lists supported docs.
    expect(screen.getByText(/Mutual NDA — Bilateral/i)).toBeInTheDocument();
    expect(screen.getByText(/CSA — Standard terms/i)).toBeInTheDocument();
    // No download button before a document is picked.
    expect(
      screen.queryByRole("button", { name: /Download/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects to /login when no user is in storage", async () => {
    clearUser();
    render(<Home />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/login"));
  });

  it("shows the signed-in name and a Sign out action", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText(/Signed in as/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign out/i }),
    ).toBeInTheDocument();
  });

  it("clears the user and redirects on Sign out", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Sign out/i }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(window.localStorage.getItem("prelegal:user")).toBeNull();
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

    const button = screen.getByRole("button", {
      name: /Download Mutual NDA PDF/i,
    });
    await user.click(button);

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [, filename] = downloadMock.mock.calls[0];
    expect(filename).toBe("mutual-nda-party1-party2.pdf");
  });

  it("passes the preview DOM element to the download helper", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await pickMutualNda();

    const button = screen.getByRole("button", {
      name: /Download Mutual NDA PDF/i,
    });
    await user.click(button);

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [element] = downloadMock.mock.calls[0];
    expect(element).toBeInstanceOf(HTMLElement);
    expect(
      (element as HTMLElement).querySelector("[data-nda-page]"),
    ).not.toBeNull();
  });

  it("returns to the selector when 'Pick a different document' is clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await pickMutualNda();

    await user.click(
      screen.getByRole("button", { name: /Pick a different document/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Prelegal" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pick a document")).toBeInTheDocument();
  });
});
