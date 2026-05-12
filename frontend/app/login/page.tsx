"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import { saveSession, type User } from "@/lib/auth";

type AuthResponse = { token: string; user: User };
type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";
  const canSubmit =
    !pending &&
    email.trim().length > 0 &&
    password.length >= (isSignup ? 8 : 1) &&
    (!isSignup || name.trim().length > 0);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const body = isSignup
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };
      const path = isSignup ? "/api/auth/signup" : "/api/auth/signin";
      const result = await apiFetch<AuthResponse>(path, {
        method: "POST",
        body,
      });
      saveSession(result.user, result.token);
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign-in failed. Please try again.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--brand-navy)] bg-gradient-to-br from-[color:var(--brand-navy)] via-[color:var(--brand-navy)] to-[#0a3978] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-3xl font-bold tracking-tight text-white">
            <span aria-hidden="true" className="text-[color:var(--brand-yellow)]">
              §
            </span>
            Prelegal
          </div>
          <p className="text-sm text-white/70">
            AI-assisted legal document drafting
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isSignup ? "Create your account" : "Welcome back"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isSignup
                ? "Sign up to start drafting agreements."
                : "Sign in to continue working on your drafts."}
            </p>
          </CardHeader>
          <CardContent>
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mb-5 grid grid-cols-2 rounded-md border bg-muted/30 p-1 text-sm font-medium"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isSignup}
                onClick={() => switchMode("signin")}
                className={`rounded px-3 py-1.5 transition-colors ${
                  !isSignup
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                onClick={() => switchMode("signup")}
                className={`rounded px-3 py-1.5 transition-colors ${
                  isSignup
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={isSignup ? 8 : 1}
                />
                {isSignup && (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters.
                  </p>
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
              >
                {pending
                  ? isSignup
                    ? "Creating account…"
                    : "Signing in…"
                  : isSignup
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-white/60">
          Drafts are not legal advice. Have a licensed attorney review before signing.
        </p>
      </div>
    </div>
  );
}
