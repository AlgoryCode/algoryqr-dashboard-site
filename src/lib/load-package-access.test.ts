import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
const listeners: Record<string, () => void> = {};

vi.mock("@/lib/flow-log", () => ({ recordFlow: vi.fn() }));
vi.mock("@/lib/package-access", () => ({
  readPackageSnapshot: () => ({ profile: { activePackage: "PRO", products: [], scopes: [] } }),
}));

describe("watchPackageAccess", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: (name: string, fn: () => void) => (listeners[name] = fn),
    });
    vi.stubGlobal("window", {
      addEventListener: (name: string, fn: () => void) => (listeners[name] = fn),
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reloads the plan on focus only once it is older than the max age", async () => {
    const { loadPackageAccess, watchPackageAccess, PACKAGE_ACCESS_MAX_AGE_MS } = await import(
      "@/lib/load-package-access"
    );
    await loadPackageAccess();
    watchPackageAccess();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    listeners.focus();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + PACKAGE_ACCESS_MAX_AGE_MS + 1);
    listeners.focus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
