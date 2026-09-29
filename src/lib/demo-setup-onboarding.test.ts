import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  demoSetupDoneKey,
  isDemoSetupDone,
  markDemoSetupDone,
  readDemoSetupBranchBand,
  readDemoSetupStaffBand,
} from "./demo-setup-onboarding";

describe("demo-setup-onboarding", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => store.clear(),
      },
    });
  });

  it("tracks setup completion and staff band", () => {
    expect(isDemoSetupDone(42)).toBe(false);
    markDemoSetupDone(42, "6_15", "2_3");
    expect(isDemoSetupDone(42)).toBe(true);
    expect(readDemoSetupStaffBand(42)).toBe("6_15");
    expect(readDemoSetupBranchBand(42)).toBe("2_3");
    expect(demoSetupDoneKey(42)).toBe("algory_demo_setup_done_42");
  });
});
