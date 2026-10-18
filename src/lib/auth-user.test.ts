import { describe, expect, it } from "vitest";

import { getAccessProfileFromToken, hasScope, resolveRefreshExpiresAt } from "./auth-user";

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function buildToken(payload: Record<string, unknown>): string {
  return `header.${encodePayload(payload)}.signature`;
}

describe("refresh token expiry", () => {
  it("reads exp from the refresh token payload", () => {
    const exp = 1_800_000_000;
    const token = buildToken({ exp, typ: "refresh" });
    expect(resolveRefreshExpiresAt(token, null)).toBe(exp);
  });

  it("keeps the iso expiry when the refresh token is not a jwt", () => {
    expect(resolveRefreshExpiresAt("session.raw", "2026-10-08T07:00:00.000Z")).toBe(
      Math.floor(Date.parse("2026-10-08T07:00:00.000Z") / 1000),
    );
  });
});

describe("auth-user access profile", () => {
  it("returns empty products and scopes when token claims are empty", () => {
    const profile = getAccessProfileFromToken(
      buildToken({
        activePackage: null,
        products: [],
        scopes: [],
        roles: ["ROLE_USER"],
      }),
    );

    expect(profile.products).toEqual([]);
    expect(profile.scopes).toEqual([]);
    expect(hasScope(profile, "QR_MENU_OWNER")).toBe(false);
  });

  it("grants menu access from owner scopes when products are missing", () => {
    const profile = getAccessProfileFromToken(
      buildToken({
        activePackage: "ULTIMATE_PACKAGE",
        products: [],
        scopes: ["QR_MENU_OWNER", "QR_CREATE_OWNER", "WAITER_PANEL_OWNER", "SMART_REPORTING_OWNER"],
        roles: ["ROLE_MERCHANT"],
        provider: "GOOGLE",
      }),
    );

    expect(hasScope(profile, "QR_MENU_OWNER")).toBe(true);
    expect(hasScope(profile, "QR_CREATE_OWNER")).toBe(true);
    expect(hasScope(profile, "WAITER_PANEL_OWNER")).toBe(true);
    expect(hasScope(profile, "SMART_REPORTING_OWNER")).toBe(true);
    expect(hasScope(profile, "ONLINE_ORDER_OWNER")).toBe(false);
  });

  it("maps token products and scopes for menu access", () => {
    const profile = getAccessProfileFromToken(
      buildToken({
        activePackage: "ULTIMATE_PACKAGE",
        products: ["QR_MENU", "QR_CREATE"],
        scopes: ["QR_MENU_OWNER", "QR_CREATE_OWNER"],
        roles: ["ROLE_USER"],
      }),
    );

    expect(profile.activePackage).toBe("ULTIMATE_PACKAGE");
    expect(hasScope(profile, "QR_MENU_OWNER")).toBe(true);
    expect(hasScope(profile, "WAITER_PANEL_OWNER")).toBe(false);
  });

  it("treats QR_ANALYTICS_OWNER as SMART_REPORTING_OWNER", () => {
    const profile = getAccessProfileFromToken(
      buildToken({
        products: ["QR_ANALYTICS"],
        scopes: ["QR_ANALYTICS_OWNER"],
      }),
    );

    expect(hasScope(profile, "SMART_REPORTING_OWNER")).toBe(true);
  });

  it("parses MOBILE_GOOGLE provider from token", () => {
    const profile = getAccessProfileFromToken(
      buildToken({
        provider: "MOBILE_GOOGLE",
        products: [],
        scopes: [],
      }),
    );

    expect(profile.provider).toBe("MOBILE_GOOGLE");
  });
});
