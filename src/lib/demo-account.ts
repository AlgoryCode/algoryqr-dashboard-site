export type DemoAccountStatus = {
  enabled?: boolean;
  email?: string | null;
};

export function isDemoAccountSession(
  currentEmail: string | null | undefined,
  demo: DemoAccountStatus | null | undefined,
): boolean {
  if (demo?.enabled !== true) return false;
  const demoEmail = demo.email?.trim().toLowerCase();
  const sessionEmail = currentEmail?.trim().toLowerCase();
  if (!demoEmail || !sessionEmail) return false;
  return demoEmail === sessionEmail;
}
