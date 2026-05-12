/**
 * Tiny fetch wrapper.
 *
 * Attaches the bearer token (when present), parses JSON, and surfaces
 * the FastAPI `{detail}` error message. Used by every client API call
 * so adding auth headers happens in one place.
 */

import { getAuthHeader } from "./auth";

export type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown };
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // fall through
  }
  return `Request failed: ${res.status}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...getAuthHeader(),
    ...(options.headers ?? {}),
  };
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(path, { ...options, headers, body });
  if (!res.ok) {
    throw new ApiError(await readError(res), res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
