import { describe, expect, it } from "vitest";

import { toPublicAuthPayload } from "@/lib/server/public-auth-payload";

describe("toPublicAuthPayload", () => {
  it("drops every token value and keeps profile and expiry fields", () => {
    const safe = toPublicAuthPayload({
      accessToken: "a",
      refreshToken: "r",
      access_token: "a2",
      refresh_token: "r2",
      twoFactorToken: "t",
      idToken: "i",
      merchantId: 13,
      email: "owner@example.com",
      accessTokenExpiresAt: 1700000000,
      refreshExpiresAt: "2026-12-01T00:00:00",
      type: "Bearer",
    });

    expect(safe).toEqual({
      merchantId: 13,
      email: "owner@example.com",
      accessTokenExpiresAt: 1700000000,
      refreshExpiresAt: "2026-12-01T00:00:00",
      type: "Bearer",
    });
  });
});
