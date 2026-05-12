import { afterEach, describe, expect, it } from "vitest";
import { clearUser, loadUser, saveUser } from "./auth";

describe("auth (client-side user store)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadUser()).toBeNull();
  });

  it("saves and loads a user", () => {
    saveUser({ name: "Alice" });
    expect(loadUser()).toEqual({ name: "Alice" });
  });

  it("ignores malformed JSON", () => {
    window.localStorage.setItem("prelegal:user", "{not json");
    expect(loadUser()).toBeNull();
  });

  it("rejects entries with an empty name", () => {
    window.localStorage.setItem(
      "prelegal:user",
      JSON.stringify({ name: "" }),
    );
    expect(loadUser()).toBeNull();
  });

  it("clears the stored user", () => {
    saveUser({ name: "Bob" });
    clearUser();
    expect(loadUser()).toBeNull();
  });
});
