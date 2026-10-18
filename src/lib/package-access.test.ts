import { describe, expect, it } from "vitest";

import { mergePackagePayloadWithProfile, readPackageAccess } from "@/lib/package-access";
import type { AccessProfile } from "@/lib/auth-user";

describe("readPackageAccess", () => {
  it("maps the access payload onto the package profile", () => {
    const profile = readPackageAccess({
      role: "MERCHANT",
      activePackage: "ULTIMATE_PACKAGE",
      products: ["QR_MENU", "MENU_PRODUCT"],
      scopes: ["QR_MENU_OWNER"],
      provider: "BASIC",
    });

    expect(profile?.activePackage).toBe("ULTIMATE_PACKAGE");
    expect(profile?.products).toEqual(["QR_MENU", "MENU_PRODUCT"]);
    expect(profile?.scopes).toEqual(["QR_MENU_OWNER"]);
    expect(profile?.roles).toEqual(["MERCHANT"]);
    expect(profile?.provider).toBe("BASIC");
  });

  it("maps the qr-service active package payload", () => {
    const profile = readPackageAccess({
      packageCode: "PRO_PACKAGE",
      products: ["QR_MENU"],
      scopes: ["QR_MENU_OWNER"],
      user: { role: "USER", provider: "BASIC" },
    });

    expect(profile?.activePackage).toBe("PRO_PACKAGE");
    expect(profile?.products).toEqual(["QR_MENU"]);
    expect(profile?.scopes).toEqual(["QR_MENU_OWNER"]);
    expect(profile?.roles).toEqual(["USER"]);
    expect(profile?.provider).toBe("BASIC");
  });

  it("returns null when the payload is empty", () => {
    expect(readPackageAccess(null)).toBeNull();
  });

  it("keeps listed products when entitlements is an empty array", () => {
    const profile = readPackageAccess({
      activePackage: "ULTIMATE_PACKAGE",
      products: ["QR_MENU", "QR_CREATE", "WAITER_PANEL"],
      scopes: ["QR_MENU_OWNER", "QR_CREATE_OWNER", "WAITER_PANEL_OWNER"],
      entitlements: [],
    });

    expect(profile?.products).toEqual(["QR_MENU", "QR_CREATE", "WAITER_PANEL"]);
    expect(profile?.scopes).toEqual(["QR_MENU_OWNER", "QR_CREATE_OWNER", "WAITER_PANEL_OWNER"]);
  });

  it("reads product codes from entitlement objects on the products field", () => {
    const profile = readPackageAccess({
      packageCode: "ULTIMATE_PACKAGE",
      products: [{ productCode: "QR_MENU" }, { code: "ONLINE_ORDER" }],
      scopes: ["QR_MENU_OWNER"],
    });

    expect(profile?.products).toEqual(["QR_MENU", "ONLINE_ORDER"]);
  });

  it("merges token products and scopes into an empty package payload", () => {
    const tokenProfile: AccessProfile = {
      activePackage: "ULTIMATE_PACKAGE",
      products: ["QR_MENU", "SMART_REPORTING"],
      scopes: ["QR_MENU_OWNER", "SMART_REPORTING_OWNER"],
      roles: ["ROLE_MERCHANT"],
      provider: "GOOGLE",
    };

    const merged = mergePackagePayloadWithProfile({ entitlements: [] }, tokenProfile);
    const profile = readPackageAccess(merged);

    expect(profile?.activePackage).toBe("ULTIMATE_PACKAGE");
    expect(profile?.products).toEqual(["QR_MENU", "SMART_REPORTING"]);
    expect(profile?.scopes).toEqual(["QR_MENU_OWNER", "SMART_REPORTING_OWNER"]);
    expect(profile?.provider).toBe("GOOGLE");
  });
});
