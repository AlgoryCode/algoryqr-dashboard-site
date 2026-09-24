import { afterEach, describe, expect, it, vi } from "vitest";

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
  it("redirects genel-bakis to packages when REQUIRE_PURCHASE", async () => {
    mockFetchOk({ decision: "REQUIRE_PURCHASE" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      "token",
    );
    expect(next).toBe(DASHBOARD_ROUTES.accountPackages);
  });

  it("keeps packages path when REQUIRE_PURCHASE", async () => {
    mockFetchOk({ decision: "REQUIRE_PURCHASE" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.accountPackages,
      "token",
    );
    expect(next).toBe(DASHBOARD_ROUTES.accountPackages);
  });

  it("redirects to trial start when START_PACKAGE", async () => {
    mockFetchOk({ decision: "START_PACKAGE" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      "token",
    );
    expect(next).toBe(DASHBOARD_ROUTES.trialStart);
  });

  it("keeps overview when ALLOW", async () => {
    mockFetchOk({ decision: "ALLOW" });
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      "token",
    );
    expect(next).toBe(DASHBOARD_ROUTES.overview);
  });

  it("returns null on upstream failure", async () => {
    mockFetchOk({ decision: "ALLOW" }, 500);
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      "token",
    );
    expect(next).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const next = await resolveDashboardPathForRequest(
      DASHBOARD_ROUTES.overview,
      "token",
    );
    expect(next).toBeNull();
  });
});

describe("fetchAccessSessionWithToken", () => {
  it("parses decision from context payload", async () => {
    mockFetchOk({ decision: "REQUIRE_PAYMENT", packageCode: "PRO" });
    const session = await fetchAccessSessionWithToken("token");
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
      "token",
      DASHBOARD_ROUTES.overview,
    );
    expect(next).toBe(DASHBOARD_ROUTES.overview);
  });
});
