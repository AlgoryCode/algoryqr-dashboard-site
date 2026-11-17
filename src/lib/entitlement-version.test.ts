import { beforeEach, describe, expect, it, vi } from "vitest";

import { noteEntitlementVersion, onEntitlementVersionChange, resetEntitlementVersion } from "./entitlement-version";

describe("noteEntitlementVersion", () => {
  beforeEach(() => resetEntitlementVersion());

  it("does not fire on the first version seen", () => {
    const listener = vi.fn();
    onEntitlementVersionChange(listener);
    expect(noteEntitlementVersion("4")).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it("fires once when the version goes up", () => {
    const listener = vi.fn();
    onEntitlementVersionChange(listener);
    noteEntitlementVersion("4");
    expect(noteEntitlementVersion("5")).toBe(true);
    expect(noteEntitlementVersion("5")).toBe(false);
    expect(noteEntitlementVersion("3")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores missing or malformed headers", () => {
    expect(noteEntitlementVersion(undefined)).toBe(false);
    expect(noteEntitlementVersion("abc")).toBe(false);
  });
});
