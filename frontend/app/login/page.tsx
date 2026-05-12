"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveUser } from "@/lib/auth";

export default function LoginPage() {
  const [name, setName] = useState("");
  const router = useRouter();
  const trimmed = name.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed) return;
    saveUser({ name: trimmed });
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to prelegal</CardTitle>
          <p className="text-sm text-muted-foreground">
            V1 preview &mdash; sign-in is a name only, no password.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={!trimmed}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
