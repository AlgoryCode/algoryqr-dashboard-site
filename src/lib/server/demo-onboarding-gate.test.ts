import { describe, expect, it } from "vitest";

import { isDemoOnboardingApiAllowed, isPersonalDemoAccount } from "./demo-onboarding-gate";

describe("demo-onboarding-gate", () => {
  it("detects personal demo accounts", () => {
    expect(isPersonalDemoAccount({ demo: true, active: true })).toBe(true);
    expect(isPersonalDemoAccount({ demo: true, active: false })).toBe(false);
    expect(isPersonalDemoAccount({ demo: false })).toBe(false);
  });

  it("allows onboarding APIs while setup is pending", () => {
    expect(isDemoOnboardingApiAllowed("/api/auth/demo/provision", "POST")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/branches", "GET")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/menu/my/active", "GET")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/demo/setup", "POST")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/waiter-panel/menu/1/areas", "POST")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/waiter-panel/menu/1/tables", "POST")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/waiter-panel/branch/1/waiters", "POST")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/waiter-panel/menu/1/areas", "GET")).toBe(true);
    expect(isDemoOnboardingApiAllowed("/api/waiter-panel/branch/1/waiters", "GET")).toBe(true);
  });

  it("blocks general dashboard APIs until setup completes", () => {
    expect(isDemoOnboardingApiAllowed("/api/menus/1", "GET")).toBe(false);
    expect(isDemoOnboardingApiAllowed("/api/analytics/branch/1/summary", "GET")).toBe(false);
  });
});
