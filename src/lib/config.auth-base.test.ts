import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig(): Promise<typeof import("@/lib/config")> {
  vi.resetModules();
  return import("@/lib/config");
}

describe("API_BASE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("resolveApiBaseUrl_whenApiBaseUrlSet_thenUsesThatHost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "https://stage.qrapi.algorycode.com/");
    const config = await loadConfig();
    expect(config.API_BASE_URL).toBe("https://stage.qrapi.algorycode.com");
  });

  it("authUrl_whenStageApi_thenUsesStageAuthService", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "https://stage.qrapi.algorycode.com");
    const config = await loadConfig();
    expect(config.authUrl("login")).toBe("https://stage.auth.algorycode.com/api/v1/auth/login");
  });

  it("authUrl_whenProdApi_thenUsesProdAuthService", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "https://prod.qrapi.algorycode.com");
    const config = await loadConfig();
    expect(config.authUrl("refresh")).toBe("https://prod.auth.algorycode.com/api/v1/auth/tokens/refresh");
  });

  it("MENU_APP_ORIGIN_whenStageEnv_thenUsesDashboardHost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("MENU_APP_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_MENU_APP_ORIGIN", "");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const config = await loadConfig();
    expect(config.MENU_APP_ORIGIN).toBe("https://stage.dashboard.algorycode.com");
  });

  it("MENU_APP_ORIGIN_whenLegacyQrEnv_thenFallsBackToDashboard", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("NEXT_PUBLIC_MENU_APP_ORIGIN", "https://stage.qr.algorycode.com");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const config = await loadConfig();
    expect(config.MENU_APP_ORIGIN).toBe("https://stage.dashboard.algorycode.com");
  });

  it("resolveApiBaseUrl_whenUnsetOutsideProduction_thenUsesLocalhost", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("DEPLOY_ENV", "");
    vi.stubEnv("API_BASE_URL", "");
    vi.stubEnv("API_UPSTREAM", "");
    const config = await loadConfig();
    expect(config.API_BASE_URL).toBe("http://localhost:8055");
    expect(config.authUrl("login")).toBe("http://localhost:8080/api/v1/auth/login");
    expect(config.authUrl("googleAuthorize")).toBe("http://localhost:8080/api/v1/auth/google/authorize");
  });
});
