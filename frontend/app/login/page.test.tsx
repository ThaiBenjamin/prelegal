import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerReplace = vi.fn();
const routerPush = vi.fn();
const stableRouter = { push: routerPush, replace: routerReplace };

vi.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

import LoginPage from "./page";
import { loadUser } from "@/lib/auth";

describe("<LoginPage />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerReplace.mockClear();
  });

  it("disables Continue until a name is entered", () => {
    render(<LoginPage />);
    const button = screen.getByRole("button", { name: /Continue/i });
    expect(button).toBeDisabled();
  });

  it("saves the user and redirects to / on submit", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/Your name/i), "  Alice  ");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(loadUser()).toEqual({ name: "Alice" });
    expect(routerReplace).toHaveBeenCalledWith("/");
  });
});
