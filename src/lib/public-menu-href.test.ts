import { describe, expect, it } from "vitest";

import { resolvePublicMenuHref } from "@/lib/public-menu-href";

describe("resolvePublicMenuHref", () => {
  it("appends /content to qr.algorycode.com menu URLs from API", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://qr.algorycode.com/menu/abc123",
        publicId: "abc123",
      }),
    ).toBe("https://qr.algorycode.com/menu/abc123/content");
  });

  it("keeps stage qr host without rewriting to dashboard", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://stage.qr.algorycode.com/menu/pub-1",
        publicId: "pub-1",
      }),
    ).toBe("https://stage.qr.algorycode.com/menu/pub-1/content");
  });

  it("rewrites localhost publicUrl using configured menu origin", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "http://localhost:3000/menu/pub-1",
        publicId: "pub-1",
      }),
    ).toBe("https://stage.qr.algorycode.com/menu/pub-1/content");
  });
});
