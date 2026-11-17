export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.data == null || typeof error.data !== "object") {
    return null;
  }
  const code = (error.data as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code : null;
}

export type EntitlementUpgrade = {
  kind: "PACKAGE" | "ADDON";
  code: string;
  name: string;
  limit: number | null;
  unlimited: boolean;
};

export type EntitlementDenial = {
  code: "NO_ACTIVE_PLAN" | "FEATURE_NOT_IN_PLAN" | "LIMIT_REACHED";
  message: string;
  feature: string | null;
  packageCode: string | null;
  limit: number | null;
  used: number | null;
  upgrades: EntitlementUpgrade[];
};

const DENIAL_CODES = new Set(["NO_ACTIVE_PLAN", "FEATURE_NOT_IN_PLAN", "LIMIT_REACHED"]);

/** The backend's standard "feature refused" body, or null for any other error. */
export function getEntitlementDenial(error: unknown): EntitlementDenial | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null;
  const data = error.data as Partial<EntitlementDenial> | null;
  if (!data || typeof data !== "object" || !data.code || !DENIAL_CODES.has(data.code)) {
    return null;
  }
  return {
    code: data.code,
    message: typeof data.message === "string" ? data.message : error.message,
    feature: data.feature ?? null,
    packageCode: data.packageCode ?? null,
    limit: typeof data.limit === "number" ? data.limit : null,
    used: typeof data.used === "number" ? data.used : null,
    upgrades: Array.isArray(data.upgrades) ? data.upgrades : [],
  };
}
