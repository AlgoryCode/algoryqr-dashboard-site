export type DemoAccountStatus = {
  enabled?: boolean;
  email?: string | null;
  demo?: boolean;
  username?: string | null;
  expiresAt?: string | null;
  active?: boolean;
  trialPackageCode?: string | null;
  trialPackageName?: string | null;
  trialDays?: number | null;
};

export function isDemoAccountSession(
  currentEmail: string | null | undefined,
  demo: DemoAccountStatus | null | undefined,
): boolean {
  if (demo?.demo === true && demo.active !== false) {
    return true;
  }
  if (demo?.enabled !== true) return false;
  const demoEmail = demo.email?.trim().toLowerCase();
  const sessionEmail = currentEmail?.trim().toLowerCase();
  if (!demoEmail || !sessionEmail) return false;
  return demoEmail === sessionEmail;
}

export function demoDaysRemaining(expiresAt: string | null | undefined, now = Date.now()): number | null {
  if (!expiresAt?.trim()) return null;
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return null;
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
