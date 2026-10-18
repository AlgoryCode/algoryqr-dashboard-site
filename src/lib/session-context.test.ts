import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/site-same-origin-axios", () => ({
  getSiteSameOriginAxios: () => ({ get: axiosGet }),
}));

import { fetchSessionContextClient, parseSessionContext } from "./session-context";

describe("parseSessionContext", () => {
  it("reads the user, decision, and package products", () => {
    const parsed = parseSessionContext({
      decision: "ALLOW",
      packageCode: "ULTIMATE_PACKAGE",
      packageName: "Ultimate",
      products: ["QR_MENU"],
      scopes: ["QR_MENU_OWNER"],
      user: {
        merchantId: 7,
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
    expect(parsed?.user.merchantId).toBe(7);
  });

  it("accepts merchantId on session user", () => {
    const parsed = parseSessionContext({
      decision: "ALLOW",
      packageCode: "PRO_PACKAGE",
      user: {
        merchantId: 42,
        email: "shop@example.com",
      },
    });
    expect(parsed?.user.merchantId).toBe(42);
  });

  it("rejects a payload without a user", () => {
    expect(parseSessionContext({ decision: "ALLOW" })).toBeNull();
  });
});

describe("fetchSessionContextClient", () => {
  beforeEach(() => {
    axiosGet.mockReset();
    axiosGet.mockResolvedValue({ data: {} });
  });

  it("requests the access context resolved from the session token", async () => {
    await fetchSessionContextClient();
    expect(axiosGet).toHaveBeenCalledWith("/access/context");
  });
});
