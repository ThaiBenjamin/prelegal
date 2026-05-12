import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerReplace = vi.fn();
const routerPush = vi.fn();
const stableRouter = { push: routerPush, replace: routerReplace };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import LoginPage from "./page";
import { loadToken, loadUser } from "@/lib/auth";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("<LoginPage />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerReplace.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens in sign-in mode with submit disabled", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("tab", { name: /Sign in/ })
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Sign in/ })).toBeDisabled();
    // Sign-in mode does not show a name field.
    expect(screen.queryByLabelText(/Full name/i)).not.toBeInTheDocument();
  });

  it("signs in and stores the session token", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        token: "tok-abc",
        user: { id: 7, name: "Alice", email: "alice@example.com" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<LoginPage />);
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: /Sign in/ }));

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/"));
    expect(loadUser()).toEqual({
      id: 7,
      name: "Alice",
      email: "alice@example.com",
    });
    expect(loadToken()).toBe("tok-abc");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/auth/signin");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "alice@example.com",
      password: "hunter2hunter2",
    });
  });

  it("switches to sign-up mode and requires name + 8-char password", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole("tab", { name: /Sign up/ }));
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    // Short password keeps submit disabled.
    await user.type(screen.getByLabelText(/Full name/i), "Alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "short");
    expect(screen.getByRole("button", { name: /Create account/ })).toBeDisabled();
  });

  it("displays the API error when signup is rejected", async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ detail: "Email already taken" }, 409),
    ) as unknown as typeof fetch;

    render(<LoginPage />);
    await user.click(screen.getByRole("tab", { name: /Sign up/ }));
    await user.type(screen.getByLabelText(/Full name/i), "Alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/Password/i), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: /Create account/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Email already taken/),
    );
    expect(loadToken()).toBeNull();
  });
});
