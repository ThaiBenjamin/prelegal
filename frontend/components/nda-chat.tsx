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
import type { NdaFormData } from "@/lib/nda-types";
import {
  applyUpdates,
  sendChat,
  type ChatMessage,
} from "@/lib/nda-chat";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Mutual NDA. To start, who are the two companies entering this agreement?",
};

type DisplayMessage =
  | ChatMessage
  | { role: "system"; content: string };

type Props = {
  data: NdaFormData;
  onChange: (next: NdaFormData) => void;
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

export function NdaChat({ data, onChange }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

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
      const response = await sendChat({
        messages: transcript,
        currentData: data,
      });
      onChange(applyUpdates(data, response.updates));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
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
    <Card className="flex h-[calc(100vh-9rem)] flex-col">
      <CardHeader>
        <CardTitle>Chat to draft your NDA</CardTitle>
        <p className="text-sm text-muted-foreground">
          Answer in your own words. The preview on the right updates as fields are filled.
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your reply..."
            rows={2}
            disabled={pending}
            aria-label="Message"
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
