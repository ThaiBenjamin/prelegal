/**
 * Lightweight client-side "auth" for the V1 foundation.
 *
 * No real authentication: a signed-in user is just a name persisted in
 * localStorage. V2 will replace this with a real backend session.
 */

export type User = { name: string };

const STORAGE_KEY = "prelegal:user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadUser(): User | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (parsed && typeof parsed.name === "string" && parsed.name.length > 0) {
      return { name: parsed.name };
    }
  } catch {
    // fall through
  }
  return null;
}

export function saveUser(user: User): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
