import { describe, expect, it } from "vitest";

import { resolveMenuHeroImage, resolveMenuLogoUrl } from "./menu-assets";

describe("menu-assets", () => {
  it("prefers menu cover over theme fallback", () => {
    expect(resolveMenuHeroImage(" https://cdn/cover.png ", "/theme/hero.png")).toBe(
      "https://cdn/cover.png",
    );
  });

  it("uses theme fallback when cover is missing", () => {
    expect(resolveMenuHeroImage(null, "/theme/hero.png")).toBe("/theme/hero.png");
    expect(resolveMenuHeroImage("  ", "/theme/hero.png")).toBe("/theme/hero.png");
  });

  it("returns null logo when menu has none", () => {
    expect(resolveMenuLogoUrl(null)).toBeNull();
    expect(resolveMenuLogoUrl("  ")).toBeNull();
    expect(resolveMenuLogoUrl("https://cdn/logo.png")).toBe("https://cdn/logo.png");
  });
});
