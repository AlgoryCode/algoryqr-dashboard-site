import { describe, expect, it } from "vitest";

import { formatDuration, formatTl, parseRateInput } from "@/lib/console-api";

describe("parseRateInput", () => {
  it("reads Turkish and plain decimals", () => {
    expect(parseRateInput("120")).toBe("120");
    expect(parseRateInput("120,50")).toBe("120.50");
    expect(parseRateInput("1.250,5")).toBe("1250.5");
    expect(parseRateInput("99.9")).toBe("99.9");
  });

  it("treats empty as no rate and rejects junk", () => {
    expect(parseRateInput("  ")).toBeNull();
    expect(parseRateInput("-5")).toBeUndefined();
    expect(parseRateInput("abc")).toBeUndefined();
    expect(parseRateInput("1,234")).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it("shows hours and minutes", () => {
    expect(formatDuration(0)).toBe("0 dk");
    expect(formatDuration(45)).toBe("45 dk");
    expect(formatDuration(60)).toBe("1 sa");
    expect(formatDuration(96)).toBe("1 sa 36 dk");
  });
});

describe("formatTl", () => {
  it("formats lira with two decimals", () => {
    expect(formatTl("192")).toMatch(/^192,00\s₺$/);
    expect(formatTl(null)).toBe("—");
  });
});
