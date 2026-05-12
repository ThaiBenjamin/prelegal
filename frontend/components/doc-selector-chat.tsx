"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENTS } from "@/lib/documents";
import { sendSelectorChat, type ChatMessage } from "@/lib/generic-chat";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! What kind of legal document do you want to draft today? I can help with any of these:\n\n" +
    DOCUMENTS.map((d) => `• ${d.shortName} — ${d.description}`).join(
      "\n",
    ) +
    "\n\nIf you describe what you're trying to do (e.g. \"I'm hiring a contractor\"), I'll suggest the closest fit.",
};

type DisplayMessage = ChatMessage | { role: "system"; content: string };

type Props = {
  onSelect: (documentId: string) => void;
};

function isChatMessage(m: DisplayMessage): m is ChatMessage {
  return m.role === "user" || m.role === "assistant";
}

function Bubble({ message }: { message: DisplayMessage }) {
  const styles: Record<DisplayMessage["role"], string> = {
    user: "ml-auto bg-primary text-primary-foreground",
    assistant: "mr-auto bg-card border",
    system:
      "mx-auto italic border bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <div
      data-role={message.role}
      className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${styles[message.role]}`}
    >
      {message.content}
    </div>
  );
}

export function DocSelectorChat({ onSelect }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  useEffect(() => {
    if (!pending) inputRef.current?.focus();
  }, [pending]);

  const trimmed = draft.trim();

  const send = async () => {
    if (!trimmed || pending) return;
    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const transcript = [
      ...messages.filter(isChatMessage),
      userMessage,
    ];
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setPending(true);

    try {
      const response = await sendSelectorChat({ messages: transcript });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
      if (response.selectedDocumentId) {
        onSelect(response.selectedDocumentId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${message}` },
      ]);
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <Card className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-3xl flex-col">
      <CardHeader>
        <CardTitle>Pick a document</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tell me what you need. I&apos;ll route you to the right template.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-3"
        >
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <Bubble key={idx} message={m} />
            ))}
            {pending && (
              <Bubble
                message={{ role: "assistant", content: "Thinking..." }}
              />
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 'I want a Mutual NDA' or 'I'm hiring a contractor'"
            rows={2}
            disabled={pending}
            aria-label="Message"
            autoFocus
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!trimmed || pending}>
              {pending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
