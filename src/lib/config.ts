const trimTrailingSlash = (s: string) => s.replace(/\/$/, "");

const PROD_API_BASE = "https://prod.qrapi.algorycode.com";
const STAGE_API_BASE = "https://stage.qrapi.algorycode.com";
const PROD_AUTH_BASE = "https://prod.auth.algorycode.com";
const STAGE_AUTH_BASE = "https://stage.auth.algorycode.com";

const AUTH_ROUTES = {
  login: "/api/v1/auth/basicauth/login",
  register: "/api/v1/auth/basicauth/register",
  refresh: "/api/v1/auth/refresh",
  logout: "/api/v1/auth/logout",
  googleAuthorize: "/api/v1/auth/google/authorize",
  googleRedeem: "/api/v1/auth/google/redeem",
} as const;

export type AuthRoute = keyof typeof AUTH_ROUTES;

function readApiBaseFromEnv(): string | undefined {
  const raw = process.env.API_BASE_URL?.trim() || process.env.API_UPSTREAM?.trim();
  return raw ? trimTrailingSlash(raw) : undefined;
}

function readDeployEnv(): string {
  return (process.env.APP_ENV || process.env.DEPLOY_ENV || "").trim().toLowerCase();
}

function resolveApiBaseUrl(): string {
  const fromEnv = readApiBaseFromEnv();
  if (fromEnv) return fromEnv;

  const deployEnv = readDeployEnv();
  if (deployEnv === "prod" || deployEnv === "production") return PROD_API_BASE;
  if (deployEnv === "stage" || deployEnv === "staging") return STAGE_API_BASE;

  if (process.env.NODE_ENV === "development") return "http://localhost:8055";

  throw new Error("APP_ENV must be prod or stage, or set API_BASE_URL");
}

function resolvePublicApiBaseUrl(): string {
  const fromEnv = process.env.PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);

  const deployEnv = readDeployEnv();
  if (deployEnv === "prod" || deployEnv === "production") return PROD_API_BASE;
  if (deployEnv === "stage" || deployEnv === "staging") return STAGE_API_BASE;

  return resolveApiBaseUrl();
}

function resolveAuthBaseUrl(): string {
  const fromEnv = process.env.AUTH_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);

  const deployEnv = readDeployEnv();
  if (deployEnv === "prod" || deployEnv === "production") return PROD_AUTH_BASE;
  if (deployEnv === "stage" || deployEnv === "staging") return STAGE_AUTH_BASE;
  if (process.env.NODE_ENV === "development") return resolveApiBaseUrl();

  throw new Error("APP_ENV must be prod or stage, or set AUTH_BASE_URL");
}

function resolveAppUrl(): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return "";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const PUBLIC_API_BASE_URL = resolvePublicApiBaseUrl();

export const AUTH_BASE_URL = resolveAuthBaseUrl();

export const authUrl = (route: AuthRoute): string => `${AUTH_BASE_URL}${AUTH_ROUTES[route]}`;

export const APP_URL = resolveAppUrl();

export const WAITER_APP_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_WAITER_APP_ORIGIN?.trim() ||
    process.env.WAITER_APP_ORIGIN?.trim() ||
    "http://localhost:3003",
);

export const KITCHEN_APP_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_KITCHEN_APP_ORIGIN?.trim() ||
    process.env.KITCHEN_APP_ORIGIN?.trim() ||
    "http://localhost:3004",
);

export const COURIER_APP_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_COURIER_APP_ORIGIN?.trim() ||
    process.env.COURIER_APP_ORIGIN?.trim() ||
    "http://localhost:3005",
);

export const STORE_APP_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_STORE_APP_ORIGIN?.trim() ||
    process.env.STORE_APP_ORIGIN?.trim() ||
    "http://localhost:3006",
);

export const MENU_APP_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_MENU_APP_ORIGIN?.trim() ||
    process.env.MENU_APP_ORIGIN?.trim() ||
    "http://localhost:3002",
);

export const MARKETING_APP_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_MARKETING_APP_ORIGIN?.trim() ||
    process.env.MARKETING_APP_ORIGIN?.trim() ||
    "http://localhost:3000",
);

export const QR_API_BASE = `${API_BASE_URL}/qr`;

function resolveQrMcpBaseUrl(): string {
  const fromEnv = process.env.QR_MCP_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return "https://prod.qr-mcp.algorycode.com";
}

export const QR_MCP_BASE_URL = resolveQrMcpBaseUrl();

export const QR_MCP_API_KEY = process.env.QR_MCP_API_KEY?.trim() ?? "";

function resolveQrAgentBaseUrl(): string {
  const fromEnv = process.env.QR_AGENT_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return "http://localhost:3200";
}

export const QR_AGENT_BASE_URL = resolveQrAgentBaseUrl();

function resolveAiServiceBaseUrl(): string {
  const fromEnv = process.env.AI_SERVICE_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return "http://localhost:8000";
}

export const AI_SERVICE_BASE_URL = resolveAiServiceBaseUrl();

export const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY?.trim() ?? "";

function resolveProductServiceBaseUrl(): string {
  const fromEnv = process.env.PRODUCT_SERVICE_BASE_URL?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return "";
}

export const PRODUCT_SERVICE_BASE_URL = resolveProductServiceBaseUrl();

export const PRODUCT_SERVICE_AUTH_TOKEN = process.env.PRODUCT_SERVICE_AUTH_TOKEN?.trim() ?? "";

export const PRODUCT_SERVICE_AUTH_HEADER =
  process.env.PRODUCT_SERVICE_AUTH_HEADER?.trim() || "X-Service-Token";

export const ACCESS_TOKEN_EXPIRY_MS = 900_000;
export const ACCESS_TOKEN_EXPIRY_SECONDS = ACCESS_TOKEN_EXPIRY_MS / 1000;
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const COOKIE_MAX_AGE_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
export const TWO_FACTOR_PENDING_COOKIE_MAX_AGE_SECONDS = ACCESS_TOKEN_EXPIRY_SECONDS;
