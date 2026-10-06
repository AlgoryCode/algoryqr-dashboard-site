import { toAccessProfile, type AccessProfile } from "@/lib/auth-user";

export function readPackageAccess(body: unknown): AccessProfile | null {
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
  return toAccessProfile({
    packageCode,
    products: stringArray(record.products),
    scopes: stringArray(record.scopes),
    roles,
    provider: record.provider ?? user?.provider,
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
