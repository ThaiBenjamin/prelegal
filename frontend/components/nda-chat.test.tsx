import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { NdaChat } from "./nda-chat";
import { defaultFormData } from "@/lib/nda-defaults";
import type { NdaFormData } from "@/lib/nda-types";

function Harness({
  onChange,
}: {
  onChange?: (next: NdaFormData) => void;
}) {
  const [data, setData] = useState<NdaFormData>(defaultFormData);
  return (
    <NdaChat
      data={data}
      onChange={(next) => {
        setData(next);
        onChange?.(next);
      }}
    />
  );
}

function mockFetchOnce(body: object, init?: ResponseInit) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

describe("<NdaChat />", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the assistant greeting on mount", () => {
    render(<Harness />);
    expect(screen.getByText(/I'll help you put together a Mutual NDA/i)).toBeInTheDocument();
  });

  it("sends a user message, posts to /api/chat, renders the reply, and merges updates", async () => {
    mockFetchOnce({
      reply: "Got it. What is Party 2 called?",
      updates: { party1: { company: "Acme, Inc." } },
    });

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    const composer = screen.getByLabelText(/Message/i);
    await user.type(composer, "Party 1 is Acme, Inc.");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(screen.getByText(/What is Party 2 called/i)).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(last.party1.company).toBe("Acme, Inc.");
  });

  it("renders a system error bubble when the request fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "LLM call failed: nope" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/Message/i), "hello");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Error: LLM call failed: nope/i),
      ).toBeInTheDocument();
    });
  });

  it("shows a pending state while a request is in flight and clears it on resolve", async () => {
    let resolve!: (value: Response) => void;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );

    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/Message/i), "anything");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    expect(screen.getByRole("button", { name: /Sending/i })).toBeDisabled();
    expect(screen.getByLabelText(/Message/i)).toBeDisabled();
    expect(screen.getByText("Thinking...")).toBeInTheDocument();

    resolve(
      new Response(JSON.stringify({ reply: "done", updates: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Message/i)).not.toBeDisabled();
  });

  it("does not send when the composer is empty or whitespace", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const sendButton = screen.getByRole("button", { name: /Send/i });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Message/i), "   ");
    expect(sendButton).toBeDisabled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
