import { describe, expect, it } from "vitest";

import { parseSessionContext } from "./session-context";

describe("parseSessionContext", () => {
  it("reads the user, decision, and package products", () => {
    const parsed = parseSessionContext({
      decision: "ALLOW",
      packageCode: "ULTIMATE_PACKAGE",
      packageName: "Ultimate",
      products: ["QR_MENU"],
      scopes: ["QR_MENU_OWNER"],
      user: {
        userId: 7,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phoneNumber: "555",
        provider: "BASIC",
        role: "USER",
      },
      entitlements: [{
        featureCode: "QR_MENU",
        scopeCode: "QR_MENU_OWNER",
        quantity: 10,
        unlimited: false,
        usedQuantity: 2,
        source: "PACKAGE_INCLUDE",
      }],
    });

    expect(parsed?.decision).toBe("ALLOW");
    expect(parsed?.user.email).toBe("ada@example.com");
    expect(parsed?.products).toEqual(["QR_MENU"]);
    expect(parsed?.entitlements[0]?.usedQuantity).toBe(2);
  });

  it("rejects a payload without a user", () => {
    expect(parseSessionContext({ decision: "ALLOW" })).toBeNull();
  });
});
