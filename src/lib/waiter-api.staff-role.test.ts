import { describe, expect, it } from "vitest";

import {
  currentStaffApp,
  isCourierRole,
  isKitchenRole,
  isWaiterRole,
  parseStaffRole,
  staffAppForRole,
  staffAppMismatchMessage,
  staffHomePath,
  staffLoginPath,
  staffRoleMatchesApp,
} from "./waiter-api";

describe("staff role routing", () => {
  it("treats only KITCHEN as kitchen staff", () => {
    expect(isKitchenRole("KITCHEN")).toBe(true);
    expect(isKitchenRole("WAITER")).toBe(false);
    expect(isKitchenRole(null)).toBe(false);
    expect(isKitchenRole(undefined)).toBe(false);
  });

  it("treats only COURIER as courier staff", () => {
    expect(isCourierRole("COURIER")).toBe(true);
    expect(isCourierRole("WAITER")).toBe(false);
    expect(isWaiterRole("COURIER")).toBe(false);
    expect(isWaiterRole("WAITER")).toBe(true);
    expect(isWaiterRole(undefined)).toBe(true);
  });

  it("locks each staff app to its own role", () => {
    expect(staffRoleMatchesApp("KITCHEN", "KITCHEN")).toBe(true);
    expect(staffRoleMatchesApp("WAITER", "KITCHEN")).toBe(false);
    expect(staffRoleMatchesApp("KITCHEN", "WAITER")).toBe(false);
    expect(staffRoleMatchesApp("WAITER", "WAITER")).toBe(true);
    expect(staffRoleMatchesApp(undefined, "WAITER")).toBe(true);
    expect(staffRoleMatchesApp("COURIER", "WAITER")).toBe(false);
    expect(staffRoleMatchesApp("COURIER", "COURIER")).toBe(true);
    expect(staffRoleMatchesApp("WAITER", "COURIER")).toBe(false);
  });

  it("sends every role to the personel app", () => {
    expect(staffHomePath("KITCHEN")).toBe("/personel");
    expect(staffHomePath("WAITER")).toBe("/personel");
    expect(staffHomePath("COURIER")).toBe("/personel");
    expect(staffLoginPath("courier")).toBe("/personel");
    expect(staffLoginPath("kitchen")).toBe("/personel");
    expect(staffLoginPath("waiter")).toBe("/personel");
    expect(staffAppForRole("COURIER")).toBe("courier");
  });

  it("explains the other login when the role does not match", () => {
    expect(staffAppMismatchMessage("WAITER")).toContain("mutfak");
    expect(staffAppMismatchMessage("KITCHEN")).toContain("garson");
    expect(staffAppMismatchMessage("COURIER")).toContain("kurye");
    expect(staffAppMismatchMessage("WAITER", "COURIER")).toContain("kurye");
  });

  it("parses courier from backend role strings", () => {
    expect(parseStaffRole("COURIER")).toBe("COURIER");
    expect(parseStaffRole("kitchen")).toBe("KITCHEN");
    expect(parseStaffRole("waiter")).toBe("WAITER");
  });

  it("treats non-mutfak paths as the waiter app", () => {
    expect(currentStaffApp()).toBe("waiter");
  });
});
