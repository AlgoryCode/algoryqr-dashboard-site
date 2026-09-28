import { afterEach, describe, expect, it, vi } from "vitest";

import { resolvePublicMenuHref } from "@/lib/public-menu-href";

describe("resolvePublicMenuHref", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("appends /content to dashboard menu URLs", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://stage.dashboard.algorycode.com/menu/abc123",
        publicId: "abc123",
      }),
    ).toBe("https://stage.dashboard.algorycode.com/menu/abc123/content");
  });

  it("rewrites stage.qr publicUrl to the dashboard origin", () => {
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://stage.qr.algorycode.com/menu/scxtG9KR5FrK0RlLjcYPUw",
        publicId: "scxtG9KR5FrK0RlLjcYPUw",
      }),
    ).toBe("https://stage.dashboard.algorycode.com/menu/scxtG9KR5FrK0RlLjcYPUw/content");
  });

  it("rewrites legacy qr.algorycode.com publicUrl to the dashboard origin", () => {
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

  it("prefers NEXT_PUBLIC_MENU_APP_ORIGIN over baked localhost module default", () => {
    vi.stubEnv("NEXT_PUBLIC_MENU_APP_ORIGIN", "https://stage.dashboard.algorycode.com");
    expect(
      resolvePublicMenuHref({
        publicUrl: "https://stage.qr.algorycode.com/menu/pub-1",
        publicId: "pub-1",
      }),
    ).toBe("https://stage.dashboard.algorycode.com/menu/pub-1/content");
  });
});
