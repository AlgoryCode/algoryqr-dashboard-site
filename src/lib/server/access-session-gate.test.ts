import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOP_PATH } from "@/lib/access-session-gate";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  fetchAccessSessionWithToken,
  resolveDashboardPathForRequest,
  resolvePostAuthDashboardPathWithAccessToken,
} from "./access-session-gate";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function accessToken(userId = 7): string {
  const payload = Buffer.from(JSON.stringify({ userId }), "utf8").toString("base64url");
  return `hdr.${payload}.sig`;
}

function mockFetchOk(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe("resolveDashboardPathForRequest", () => {
  it("redirects genel-bakis to the shop when REQUIRE_PURCHASE", async () => {
    mockFetchOk({ decision: "REQUIRE_PURCHASE" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      accessToken(),
    );
    expect(next).toBe(SHOP_PATH);
  });

  it("redirects packages path to the shop when REQUIRE_PURCHASE", async () => {
    mockFetchOk({ decision: "REQUIRE_PURCHASE" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.accountPackages,
      accessToken(),
    );
    expect(next).toBe(SHOP_PATH);
  });

  it("redirects to demo register when START_PACKAGE", async () => {
    mockFetchOk({ decision: "START_PACKAGE" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      accessToken(),
    );
    expect(next).toBe(DASHBOARD_ROUTES.demoRegister);
  });

  it("keeps overview when ALLOW", async () => {
    mockFetchOk({ decision: "ALLOW" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      accessToken(),
    );
    expect(next).toBe(DASHBOARD_ROUTES.overview);
  });

  it("returns null on upstream failure", async () => {
    mockFetchOk({ decision: "ALLOW" }, 500);
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      accessToken(),
    );
    expect(next).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      accessToken(),
    );
    expect(next).toBeNull();
  });
});

describe("fetchAccessSessionWithToken", () => {
  it("parses decision from context payload", async () => {
    mockFetchOk({ decision: "REQUIRE_PAYMENT", packageCode: "PRO" });
    const session = await fetchAccessSessionWithToken(accessToken());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/7/package"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(session).toEqual({
      decision: "REQUIRE_PAYMENT",
      packageCode: "PRO",
      endsAt: null,
      debtDueAt: null,
      messageKey: null,
      code: null,
    });
  });
});

describe("resolvePostAuthDashboardPathWithAccessToken", () => {
  it("falls back to return path when session fetch fails", async () => {
    mockFetchOk({}, 401);
    const next = await resolvePostAuthDashboardPathWithAccessToken(
      accessToken(),
      DASHBOARD_ROUTES.overview,
    );
    expect(next).toBe(DASHBOARD_ROUTES.overview);
  });
});
