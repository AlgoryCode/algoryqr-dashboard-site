import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("axios", () => ({ default: { post: (...args: unknown[]) => post(...args) } }));
vi.mock("@/lib/flow-log", () => ({ recordFlow: vi.fn() }));
vi.mock("@/lib/load-package-access", () => ({
  clearPackageAccess: vi.fn(),
  loadPackageAccess: vi.fn(() => Promise.resolve(null)),
}));

const replace = vi.fn();

async function loadModule() {
  vi.resetModules();
  return import("@/lib/site-session");
}

describe("site-session", () => {
  beforeEach(() => {
    post.mockReset();
    replace.mockReset();
    vi.stubGlobal("window", { location: { pathname: "/dashboard", replace } });
    vi.stubGlobal("localStorage", { removeItem: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares one refresh request between concurrent callers", async () => {
    post.mockResolvedValue({ status: 200, data: { accessTokenExpiresAt: 123 } });
    const { refreshSession } = await loadModule();

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.ok && r.accessTokenExpiresAt === 123)).toBe(true);
  });

  it("ends the session on 401 and never refreshes again", async () => {
    post.mockImplementation((url: string) =>
      Promise.resolve(url === "/api/auth/refresh" ? { status: 401, data: {} } : { status: 204, data: {} }),
    );
    const { refreshSession, isSessionEnded } = await loadModule();

    const first = await refreshSession();
    const second = await refreshSession();

    expect(first).toEqual({ ok: false, status: 401 });
    expect(second).toEqual({ ok: false, status: 401 });
    expect(isSessionEnded()).toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/login");
    const refreshCalls = post.mock.calls.filter(([url]) => url === "/api/auth/refresh");
    expect(refreshCalls).toHaveLength(1);
  });

  it("does not reload the login page when the session ends there", async () => {
    vi.stubGlobal("window", { location: { pathname: "/login", replace } });
    post.mockResolvedValue({ status: 204, data: {} });
    const { endSession, isSessionEnded } = await loadModule();

    await endSession("expired");

    expect(replace).not.toHaveBeenCalled();
    expect(isSessionEnded()).toBe(false);
  });

  it("keeps the session on network errors", async () => {
    post.mockRejectedValue(new Error("offline"));
    const { refreshSession, isSessionEnded } = await loadModule();

    expect(await refreshSession()).toEqual({ ok: false, status: 0 });
    expect(isSessionEnded()).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
