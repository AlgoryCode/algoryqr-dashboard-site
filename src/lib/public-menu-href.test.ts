import { describe, expect, it } from "vitest";

import { resolvePublicMenuHref } from "@/lib/public-menu-href";

describe("resolvePublicMenuHref", () => {
  it("appends /content to API menu base URLs on the dashboard host", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://stage.dashboard.algorycode.com/menu/abc123",
        publicId: "abc123",
      }),
    ).toBe("https://stage.dashboard.algorycode.com/menu/abc123/content");
  });

  it("rewrites legacy qr.algorycode.com publicUrl to the menu app origin", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://qr.algorycode.com/menu/pub-1",
        publicId: "pub-1",
      }),
    ).toBe("https://stage.dashboard.algorycode.com/menu/pub-1/content");
  });

  it("rewrites localhost publicUrl using configured menu origin", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "http://localhost:3000/menu/pub-1",
        publicId: "pub-1",
      }),
    ).toBe("https://stage.dashboard.algorycode.com/menu/pub-1/content");
  });
});
