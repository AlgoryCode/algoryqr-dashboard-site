import { normalizeProductCode, toAccessProfile, type AccessProfile } from "@/lib/auth-user";
import type { PackageAccessSnapshot, PackageEntitlement } from "@/stores/package-access-store";

export function readPackageAccess(body: unknown): AccessProfile | null {
  return readPackageSnapshot(body)?.profile ?? null;
}

/** Keeps JWT products and scopes when the package payload omits them. */
export function mergePackagePayloadWithProfile(payload: unknown, tokenProfile: AccessProfile): unknown {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  base.products = [...new Set([...readListedProductCodes(base.products), ...tokenProfile.products])];
  base.scopes = [...new Set([...stringArray(base.scopes), ...tokenProfile.scopes])];
  if (
    typeof base.activePackage !== "string" &&
    typeof base.packageCode !== "string" &&
    tokenProfile.activePackage
  ) {
    base.activePackage = tokenProfile.activePackage;
  }
  if (base.provider == null && tokenProfile.provider) {
    base.provider = tokenProfile.provider;
  }
  if ((!Array.isArray(base.roles) || base.roles.length === 0) && tokenProfile.roles.length > 0) {
    base.roles = tokenProfile.roles;
  }
  return base;
}

export function readPackageSnapshot(body: unknown): PackageAccessSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const user = record.user && typeof record.user === "object" ? (record.user as Record<string, unknown>) : null;
  const roles = Array.isArray(record.roles)
    ? record.roles.filter((item): item is string => typeof item === "string")
    : typeof record.role === "string"
      ? [record.role]
      : typeof user?.role === "string"
        ? [user.role]
        : [];
  const packageCode =
    typeof record.activePackage === "string"
      ? record.activePackage
      : typeof record.packageCode === "string"
        ? record.packageCode
        : null;
  const entitlements = parseEntitlements(record.entitlements);
  const products = [
    ...readListedProductCodes(record.products),
    ...(entitlements ?? []).filter((item) => item.open).map((item) => item.productCode),
  ];
  return {
    profile: toAccessProfile({
      packageCode,
      products,
      scopes: stringArray(record.scopes),
      roles,
      provider: record.provider ?? user?.provider,
    }),
    periodEnd: typeof record.periodEnd === "string" ? record.periodEnd : null,
    entitlements: entitlements ?? [],
  };
}

function parseEntitlements(value: unknown): PackageEntitlement[] | null {
  if (!Array.isArray(value)) return null;
  const rows: PackageEntitlement[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const rawCode =
      typeof record.productCode === "string"
        ? record.productCode
        : typeof record.featureCode === "string"
          ? record.featureCode
          : null;
    if (!rawCode) continue;
    const productCode = normalizeProductCode(rawCode);
    if (!productCode) continue;
    const quantity = numberOrNull(record.quantity);
    const usedQuantity = numberOrNull(record.usedQuantity);
    const unlimited = record.unlimited === true;
    rows.push({
      productCode,
      featureCode: typeof record.featureCode === "string" ? record.featureCode : null,
      quantity,
      usedQuantity,
      unlimited,
      open: unlimited || quantity == null || (usedQuantity ?? 0) < quantity,
    });
  }
  return rows;
}

function readListedProductCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      codes.push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const raw =
      typeof record.productCode === "string"
        ? record.productCode
        : typeof record.code === "string"
          ? record.code
          : null;
    if (raw) codes.push(raw);
  }
  return codes;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
