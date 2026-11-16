import type { PurchaseApiItem } from "@/lib/api";
import type { SessionContext } from "@/lib/session-context";
import { isDateUsablePurchase } from "@/lib/product-access";

export const TRIAL_REMINDER_AUTO_OPEN_DAYS = 3;

const DISMISS_KEY_PREFIX = "algory-trial-reminder-dismissed";

export interface TrialReminderInfo {
  purchaseId: number;
  packageName: string;
  daysUntilExpiry: number;
  expiresAt?: string | null;
}

export function getTrialReminderInfo(
  activePurchase: PurchaseApiItem | null | undefined,
): TrialReminderInfo | null {
  if (!activePurchase) return null;
  if (activePurchase.purchaseType !== "TRIAL") return null;
  if (!isDateUsablePurchase(activePurchase)) return null;

  const days = activePurchase.daysUntilExpiry;
  if (typeof days !== "number" || !Number.isFinite(days)) return null;
  if (days < 0) return null;

  return {
    purchaseId: activePurchase.id,
    packageName: activePurchase.packageName ?? "Deneme paketi",
    daysUntilExpiry: days,
    expiresAt: activePurchase.expiresAt,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today until the given date (inclusive end day); null when unknown. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.round((endDay - startOfToday) / DAY_MS);
}

/**
 * Trial info from the access session. Trials started from onboarding have no purchase row, so the
 * session's billing state is the source of truth; purchase data is only a fallback.
 */
export function getTrialReminderInfoFromSession(
  session: Pick<SessionContext, "billingState" | "packageName" | "endsAt" | "periodEnd"> | null | undefined,
  now: Date = new Date(),
): TrialReminderInfo | null {
  if (!session || session.billingState !== "TRIALING") return null;
  const expiresAt = session.endsAt ?? session.periodEnd;
  const days = daysUntil(expiresAt, now);
  if (days == null || days < 0) return null;
  return {
    purchaseId: 0,
    packageName: session.packageName ?? "Deneme paketi",
    daysUntilExpiry: days,
    expiresAt,
  };
}

export function shouldAutoOpenTrialReminder(info: TrialReminderInfo): boolean {
  return info.daysUntilExpiry <= TRIAL_REMINDER_AUTO_OPEN_DAYS;
}

export function getTrialReminderDismissKey(info: TrialReminderInfo): string {
  return `${DISMISS_KEY_PREFIX}-${info.purchaseId}-${info.daysUntilExpiry}`;
}

export function isTrialReminderDismissed(info: TrialReminderInfo): boolean {
  try {
    return sessionStorage.getItem(getTrialReminderDismissKey(info)) === "1";
  } catch {
    return false;
  }
}

export function dismissTrialReminder(info: TrialReminderInfo): void {
  try {
    sessionStorage.setItem(getTrialReminderDismissKey(info), "1");
  } catch {
    /* ignore */
  }
}
