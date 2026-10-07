import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosGet = vi.hoisted(() => vi.fn());
const storedUser = vi.hoisted(() => vi.fn((): { id?: string } | null => null));

vi.mock("@/lib/site-same-origin-axios", () => ({
  getSiteSameOriginAxios: () => ({ get: axiosGet }),
}));

vi.mock("@/lib/api/storage", () => ({
  getStoredUser: () => storedUser(),
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

describe("fetchSessionContextClient", () => {
  beforeEach(() => {
    axiosGet.mockReset();
    axiosGet.mockResolvedValue({ data: {} });
    storedUser.mockReset();
    storedUser.mockReturnValue(null);
  });

  it("requests the active package for a numeric user id", async () => {
    await fetchSessionContextClient(7);
    expect(axiosGet).toHaveBeenCalledWith("/users/7/package");
  });

  it("uses the stored user id when the argument is a query context object", async () => {
    storedUser.mockReturnValue({ id: "7" });
    await fetchSessionContextClient({ queryKey: ["sessionContext"] } as unknown as number);
    expect(axiosGet).toHaveBeenCalledWith("/users/7/package");
  });

  it("falls back to the access context when no user id is available", async () => {
    await fetchSessionContextClient();
    expect(axiosGet).toHaveBeenCalledWith("/access/context");
  });
});
