import { describe, it, expect } from "vitest";
import { fallback, formatHumanDate, formatYears } from "./nda-format";

describe("fallback", () => {
  it("returns the value when non-empty", () => {
    expect(fallback("hello", "[empty]")).toBe("hello");
  });

  it("returns the placeholder when value is empty string", () => {
    expect(fallback("", "[empty]")).toBe("[empty]");
  });

  it("returns the placeholder when value is whitespace only", () => {
    expect(fallback("   \t\n", "[empty]")).toBe("[empty]");
  });

  it("trims surrounding whitespace and returns the trimmed value", () => {
    expect(fallback("  hi  ", "[empty]")).toBe("hi");
  });

  it("handles undefined-like inputs without crashing", () => {
    expect(fallback(null as unknown as string, "[empty]")).toBe("[empty]");
    expect(fallback(undefined as unknown as string, "[empty]")).toBe("[empty]");
  });
});

describe("formatYears", () => {
  it("singularizes for 1 year", () => {
    expect(formatYears(1)).toBe("1 year");
  });

  it("pluralizes for >1 year", () => {
    expect(formatYears(2)).toBe("2 years");
    expect(formatYears(10)).toBe("10 years");
  });

  it("returns placeholder for invalid values", () => {
    expect(formatYears(0)).toBe("[N] year(s)");
    expect(formatYears(-3)).toBe("[N] year(s)");
    expect(formatYears(Number.NaN)).toBe("[N] year(s)");
    expect(formatYears(Number.POSITIVE_INFINITY)).toBe("[N] year(s)");
  });
});

describe("formatHumanDate", () => {
  it("formats an ISO date as Month Day, Year", () => {
    expect(formatHumanDate("2026-05-09")).toBe("May 9, 2026");
  });

  it("returns placeholder for empty string", () => {
    expect(formatHumanDate("")).toBe("[Effective Date]");
  });

  it("returns the placeholder for unparseable dates", () => {
    expect(formatHumanDate("not-a-date")).toBe("[Effective Date]");
  });

  it("handles a single-digit month and day", () => {
    expect(formatHumanDate("2026-01-03")).toBe("January 3, 2026");
  });
});
