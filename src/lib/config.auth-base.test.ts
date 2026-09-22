import { afterEach, describe, expect, it, vi } from "vitest";

async function loadApiBaseUrl(): Promise<string> {
  vi.resetModules();
  const config = await import("@/lib/config");
  return config.API_BASE_URL;
}

describe("API_BASE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("resolveApiBaseUrl_whenApiBaseUrlSet_thenUsesThatHost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("API_BASE_URL", "https://stage.auth.algorycode.com/");
    expect(await loadApiBaseUrl()).toBe("https://stage.auth.algorycode.com");
  });

  it("resolveApiBaseUrl_whenUnsetOutsideProduction_thenUsesLocalhost", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "prod");
    vi.stubEnv("API_BASE_URL", "");
    expect(await loadApiBaseUrl()).toBe("http://localhost:8055");
  });
});
