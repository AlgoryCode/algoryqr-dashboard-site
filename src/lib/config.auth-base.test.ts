import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAuthUrl(): Promise<(route: "login" | "refresh") => string> {
  vi.resetModules();
  const config = await import("@/lib/config");
  return config.authUrl;
}

describe("authUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("authUrl_whenAppEnvStage_thenUsesStageAuthHost", async () => {
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("AUTH_BASE_URL", "");
    const authUrl = await loadAuthUrl();
    expect(authUrl("login")).toBe("https://stage.auth.algorycode.com/api/v1/auth/basicauth/login");
  });

  it("authUrl_whenAppEnvProd_thenUsesProdAuthHost", async () => {
    vi.stubEnv("APP_ENV", "prod");
    vi.stubEnv("AUTH_BASE_URL", "");
    const authUrl = await loadAuthUrl();
    expect(authUrl("refresh")).toBe("https://prod.auth.algorycode.com/api/v1/auth/refresh");
  });

  it("authUrl_whenAuthBaseUrlSet_thenUsesThatHost", async () => {
    vi.stubEnv("APP_ENV", "prod");
    vi.stubEnv("AUTH_BASE_URL", "https://stage.auth.algorycode.com/");
    const authUrl = await loadAuthUrl();
    expect(authUrl("login")).toBe("https://stage.auth.algorycode.com/api/v1/auth/basicauth/login");
  });
});
