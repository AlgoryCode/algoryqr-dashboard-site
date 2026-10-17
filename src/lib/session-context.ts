import { destinationForDecision, parseAccessSession, type AccessSession } from "@/lib/access-session-gate";
import { activePackagePath } from "@/lib/active-package-path";
import { getStoredUser } from "@/lib/api/storage";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

export type SessionUser = {
  merchantId: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  provider: string | null;
  role: string | null;
};

export type SessionEntitlement = {
  featureCode: string;
  scopeCode: string | null;
  quantity: number | null;
  unlimited: boolean;
  usedQuantity: number | null;
  source: string | null;
};

export type SessionContext = AccessSession & {
  user: SessionUser;
  packageName: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  products: string[];
  scopes: string[];
  entitlements: SessionEntitlement[];
};

export function parseSessionContext(payload: unknown): SessionContext | null {
  const session = parseAccessSession(payload);
  if (!session || !payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const user = parseUser(record.user);
  if (!user) return null;
  return {
    ...session,
    user,
    packageName: stringOrNull(record.packageName),
    periodStart: stringOrNull(record.periodStart),
    periodEnd: stringOrNull(record.periodEnd),
    products: stringArray(record.products),
    scopes: stringArray(record.scopes),
    entitlements: parseEntitlements(record.entitlements),
  };
}

export async function fetchSessionContextClient(merchantId?: number | null): Promise<SessionContext | null> {
  const resolved = positiveMerchantId(merchantId) ?? storedMerchantId();
  const path = resolved != null ? activePackagePath(resolved) : "/access/context";
  try {
    const response = await getSiteSameOriginAxios().get(path);
    return parseSessionContext(response.data);
  } catch {
    return null;
  }
}

function positiveMerchantId(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function storedMerchantId(): number | null {
  return positiveMerchantId(getStoredUser()?.id);
}

export function pathForSession(
  session: Pick<AccessSession, "decision"> | null,
  returnPath: string | null | undefined,
): string {
  if (!session) {
    return returnPath ?? DASHBOARD_ROUTES.root;
  }
  return destinationForDecision(session.decision, returnPath);
}

function parseUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const merchantId = positiveMerchantId(record.merchantId);
  if (merchantId == null || typeof record.email !== "string") return null;
  return {
    merchantId,
    firstName: stringOrNull(record.firstName),
    lastName: stringOrNull(record.lastName),
    email: record.email,
    phoneNumber: stringOrNull(record.phoneNumber),
    provider: stringOrNull(record.provider),
    role: stringOrNull(record.role),
  };
}

function parseEntitlements(value: unknown): SessionEntitlement[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.featureCode !== "string") return [];
    return [{
      featureCode: record.featureCode,
      scopeCode: stringOrNull(record.scopeCode),
      quantity: numberOrNull(record.quantity),
      unlimited: record.unlimited === true,
      usedQuantity: numberOrNull(record.usedQuantity),
      source: stringOrNull(record.source),
    }];
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}
