import { describe, expect, it } from "vitest";

import { packagesUpstreamUrl } from "./packages-upstream";

describe("packagesUpstreamUrl", () => {
  it("uses the legacy path when the base has no /api/v1 prefix", () => {
    expect(packagesUpstreamUrl("https://stage.qrapi.algorycode.com")).toBe(
      "https://stage.qrapi.algorycode.com/packages",
    );
  });

  it("uses the real path when the base already has /api/v1", () => {
    expect(packagesUpstreamUrl("http://localhost:8056/api/v1/")).toBe(
      "http://localhost:8056/api/v1/plan-packages",
    );
  });
});
