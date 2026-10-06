import { describe, expect, it } from "vitest";

import { readPackageAccess } from "@/lib/package-access";

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
});
