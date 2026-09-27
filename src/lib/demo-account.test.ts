import { describe, expect, it } from "vitest";

import { demoDaysRemaining, isDemoAccountSession } from "./demo-account";

describe("isDemoAccountSession", () => {
  it("detects personal demo status", () => {
    expect(isDemoAccountSession("a@b.com", { demo: true, active: true })).toBe(true);
    expect(isDemoAccountSession("a@b.com", { demo: true, active: false })).toBe(false);
  });

  it("detects shared demo email", () => {
    expect(
      isDemoAccountSession("demo@test.com", { enabled: true, email: "demo@test.com" }),
    ).toBe(true);
  });
});

describe("demoDaysRemaining", () => {
  it("returns days until expiry", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    expect(demoDaysRemaining("2026-01-04T12:00:00.000Z", now)).toBe(4);
    expect(demoDaysRemaining("2025-12-31T00:00:00.000Z", now)).toBe(0);
  });
});
