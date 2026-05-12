"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import {
  clearSession,
  loadToken,
  loadUser,
  type User,
} from "@/lib/auth";
import {
  deleteSavedDocument,
  listSavedDocuments,
  type SavedDocumentSummary,
} from "@/lib/saved-documents";
import { getDocument } from "@/lib/documents";

function formatRelative(iso: string): string {
  const ts = new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime();
  if (!Number.isFinite(ts)) return iso;
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => loadUser());
  const [token] = useState<string | null>(() => loadToken());
  const [items, setItems] = useState<SavedDocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const authReady = user !== null && token !== null;

  useEffect(() => {
    if (!authReady) {
      router.replace("/login");
    }
  }, [authReady, router]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listSavedDocuments();
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load documents.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const handleSignOut = () => {
    clearSession();
    router.replace("/login");
  };

  const handleOpen = (id: number) => {
    router.push(`/?openDoc=${id}`);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this saved document? This cannot be undone.")) {
      return;
    }
    try {
      await deleteSavedDocument(id);
      setItems((prev) => (prev ?? []).filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    }
  };

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[color:var(--brand-navy)] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-xl font-bold tracking-tight"
            >
              <span aria-hidden="true" className="text-[color:var(--brand-yellow)]">
                §
              </span>
              Prelegal
            </button>
            <nav className="flex items-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-white/70 hover:text-white"
              >
                Draft new
              </button>
              <span className="font-medium text-white">My documents</span>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/70">
              Signed in as{" "}
              <span className="font-medium text-white">{user.name}</span>
            </span>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <DisclaimerBanner />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--brand-navy)]">
              My documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Drafts auto-save as you chat. Documents reset whenever the server restarts.
            </p>
          </div>
          <Button onClick={() => router.push("/")}>Draft new document</Button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {items === null && !error && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {items !== null && items.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                You haven&apos;t saved any documents yet.
              </p>
              <Button onClick={() => router.push("/")}>
                Draft your first document
              </Button>
            </CardContent>
          </Card>
        )}

        {items !== null && items.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const doc = getDocument(item.documentId);
              const label = doc?.shortName ?? item.documentId;
              return (
                <li key={item.id}>
                  <Card>
                    <CardHeader className="pb-2">
                      <span className="inline-block w-fit rounded-full bg-[color:var(--brand-blue)]/10 px-2 py-0.5 text-xs font-medium text-[color:var(--brand-blue)]">
                        {label}
                      </span>
                      <h2 className="mt-2 text-base font-semibold leading-snug text-[color:var(--brand-navy)]">
                        {item.title}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Edited {formatRelative(item.updatedAt)}
                      </p>
                    </CardHeader>
                    <CardContent className="flex gap-2 pt-0">
                      <Button onClick={() => handleOpen(item.id)}>Open</Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
