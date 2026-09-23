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
    expect(config.authUrl("login")).toBe("https://stage.auth.algorycode.com/api/v1/auth/basicauth/login");
  });

  it("authUrl_whenProdApi_thenUsesProdAuthService", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_BASE_URL", "https://prod.qrapi.algorycode.com");
    const config = await loadConfig();
    expect(config.authUrl("refresh")).toBe("https://prod.auth.algorycode.com/api/v1/auth/refresh");
  });

  it("resolveApiBaseUrl_whenUnsetOutsideProduction_thenUsesLocalhost", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("API_BASE_URL", "");
    const config = await loadConfig();
    expect(config.API_BASE_URL).toBe("http://localhost:8055");
    expect(config.authUrl("login")).toBe("http://localhost:8080/api/v1/auth/basicauth/login");
    expect(config.authUrl("googleAuthorize")).toBe("http://localhost:8080/api/v1/auth/google/authorize");
  });
});
