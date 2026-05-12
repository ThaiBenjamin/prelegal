import { afterEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getAuthHeader,
  loadToken,
  loadUser,
  saveSession,
} from "./auth";

const SAMPLE = { id: 7, name: "Alice", email: "alice@example.com" };

describe("auth (client-side session store)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadUser()).toBeNull();
    expect(loadToken()).toBeNull();
    expect(getAuthHeader()).toEqual({});
  });

  it("persists both the user and the token on saveSession", () => {
    saveSession(SAMPLE, "tok-abc");
    expect(loadUser()).toEqual(SAMPLE);
    expect(loadToken()).toBe("tok-abc");
    expect(getAuthHeader()).toEqual({ Authorization: "Bearer tok-abc" });
  });

  it("ignores malformed JSON", () => {
    window.localStorage.setItem("prelegal:user", "{not json");
    expect(loadUser()).toBeNull();
  });

  it("rejects users that are missing required fields", () => {
    window.localStorage.setItem(
      "prelegal:user",
      JSON.stringify({ name: "" }),
    );
    expect(loadUser()).toBeNull();
  });

  it("clears both the user and the token on clearSession", () => {
    saveSession(SAMPLE, "tok-abc");
    clearSession();
    expect(loadUser()).toBeNull();
    expect(loadToken()).toBeNull();
  });
});
