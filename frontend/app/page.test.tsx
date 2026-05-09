import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const downloadMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/pdf", () => ({
  downloadElementAsPdf: (...args: unknown[]) => downloadMock(...args),
}));

import Home from "./page";

describe("<Home /> (page integration)", () => {
  beforeEach(() => {
    downloadMock.mockClear();
  });

  it("renders the form, the live preview, and a Download PDF action", () => {
    render(<Home />);
    expect(screen.getByText("Mutual NDA Creator")).toBeInTheDocument();
    expect(screen.getAllByText("Party 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Party 2").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /Download PDF/i }),
    ).toBeInTheDocument();
  });

  it("updates the preview as the user fills the form", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const company1 = screen.getAllByLabelText(/Company/i)[0];
    await user.type(company1, "Acme, Inc.");

    await waitFor(() => {
      expect(screen.getAllByText("Acme, Inc.").length).toBeGreaterThan(0);
    });
  });

  it("calls the PDF download helper with a slugged filename derived from party names", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const [c1, c2] = screen.getAllByLabelText(/Company/i);
    await user.type(c1, "Acme, Inc.");
    await user.type(c2, "Globex Corp.");

    const button = screen.getByRole("button", { name: /Download PDF/i });
    await user.click(button);

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [, filename] = downloadMock.mock.calls[0];
    expect(filename).toBe("mutual-nda-acme-inc-globex-corp.pdf");
  });

  it("falls back to party1/party2 in the filename when company names are blank", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const button = screen.getByRole("button", { name: /Download PDF/i });
    await user.click(button);

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [, filename] = downloadMock.mock.calls[0];
    expect(filename).toBe("mutual-nda-party1-party2.pdf");
  });

  it("passes the preview DOM element to the download helper", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const button = screen.getByRole("button", { name: /Download PDF/i });
    await user.click(button);

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [element] = downloadMock.mock.calls[0];
    expect(element).toBeInstanceOf(HTMLElement);
    expect(
      (element as HTMLElement).querySelector("[data-nda-page]"),
    ).not.toBeNull();
  });
});
