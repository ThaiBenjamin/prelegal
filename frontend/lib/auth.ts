/**
 * Client-side auth state.
 *
 * On sign-in / sign-up the backend returns a JWT plus the user record;
 * we persist both in localStorage. Every API call attaches the token as
 * `Authorization: Bearer <token>`. Sign-out clears local state only --
 * tokens are stateless on the server (DB is wiped on every restart, so
 * tokens issued by an earlier process are rejected automatically).
 */

export type User = {
  id: number;
  name: string;
  email: string;
};

const USER_KEY = "prelegal:user";
const TOKEN_KEY = "prelegal:token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadUser(): User | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      typeof parsed.id === "number" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      parsed.name.length > 0
    ) {
      return { id: parsed.id, name: parsed.name, email: parsed.email };
    }
  } catch {
    // fall through
  }
  return null;
}

export function loadToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveSession(user: User, token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeader(): Record<string, string> {
  const token = loadToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
