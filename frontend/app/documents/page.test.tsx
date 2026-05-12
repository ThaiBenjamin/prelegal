import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerReplace = vi.fn();
const routerPush = vi.fn();
const stableRouter = { push: routerPush, replace: routerReplace };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import DocumentsPage from "./page";
import { saveSession, clearSession } from "@/lib/auth";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("<DocumentsPage />", () => {
  beforeEach(() => {
    clearSession();
    saveSession(
      { id: 1, name: "Alice", email: "alice@example.com" },
      "tok-test",
    );
    routerReplace.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to /login when there is no session", async () => {
    clearSession();
    render(<DocumentsPage />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/login"));
  });

  it("renders an empty state when the user has no saved documents", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch;
    render(<DocumentsPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/haven't saved any documents yet/i),
      ).toBeInTheDocument(),
    );
  });

  it("lists saved documents and navigates to the creator on Open", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse([
        {
          id: 42,
          documentId: "mutual-nda",
          title: "Acme & Globex",
          updatedAt: new Date().toISOString(),
        },
      ]),
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<DocumentsPage />);
    await waitFor(() =>
      expect(screen.getByText("Acme & Globex")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Open/i }));
    expect(routerPush).toHaveBeenCalledWith("/?openDoc=42");
  });
});
