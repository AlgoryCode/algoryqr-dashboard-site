import type { MyProfile } from "@/hooks/use-my-profile";
import type { UserSessionPage, UserSessionRow } from "@/hooks/use-user-sessions";
import type { BillingAddress, PaymentMethod } from "@/lib/commerce";
import type { PurchaseApiItem, PurchaseSummaryApiItem, SubscriptionOverviewApiItem } from "@/lib/api";

export const ACCOUNT_OVERVIEW_SESSION_PAGE_SIZE = 50;

export type AccountOverviewSection<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message?: string };

export interface AccountOverviewSessions {
  page: UserSessionPage;
  openSessions: UserSessionRow[];
}

export interface AccountOverview {
  profile: AccountOverviewSection<MyProfile>;
  subscription: AccountOverviewSection<SubscriptionOverviewApiItem>;
  purchases: AccountOverviewSection<PurchaseApiItem[]>;
  paymentMethods: AccountOverviewSection<PaymentMethod[]>;
  billingAddresses: AccountOverviewSection<BillingAddress[]>;
  sessions: AccountOverviewSection<AccountOverviewSessions>;
}

function listFromPayload<TEntity>(payload: unknown, keys: string[]): TEntity[] {
  if (Array.isArray(payload)) return payload as TEntity[];
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as TEntity[];
  }
  return [];
}

function upstreamMessage(data: unknown): string | undefined {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return undefined;
}

export function parsePurchasesPayload(payload: unknown): PurchaseApiItem[] {
  return listFromPayload<PurchaseApiItem>(payload, ["content", "purchases", "items"]);
}

export function parseBillingAddressesPayload(payload: unknown): BillingAddress[] {
  return listFromPayload<BillingAddress>(payload, ["items", "addresses", "content"]);
}

export function parsePaymentMethodsPayload(payload: unknown): PaymentMethod[] {
  const raw = listFromPayload<Record<string, unknown>>(payload, ["items", "paymentMethods", "cards", "content"]);
  return raw.map((item) => ({
    id: String(item.id),
    cardAlias:
      (item.cardAlias as string | null | undefined) ?? (item.alias as string | null | undefined) ?? null,
    brand: (item.brand as string | null | undefined) ?? null,
    lastFour: String(item.lastFour ?? item.last4 ?? item.lastFourDigits ?? ""),
    expiryMonth: (item.expiryMonth as number | null | undefined) ?? null,
    expiryYear: (item.expiryYear as number | null | undefined) ?? null,
  }));
}

export function parseSubscriptionOverviewPayload(payload: unknown): SubscriptionOverviewApiItem {
  const data = payload && typeof payload === "object" ? (payload as SubscriptionOverviewApiItem) : {};
  return {
    activePackage: data.activePackage ?? null,
    entitlements: Array.isArray(data.entitlements) ? data.entitlements : [],
    addonPurchases: Array.isArray(data.addonPurchases) ? data.addonPurchases : [],
    branchQuota: data.branchQuota ?? null,
    menuQuota: data.menuQuota ?? null,
    fulfillmentDetails: Array.isArray(data.fulfillmentDetails) ? data.fulfillmentDetails : [],
    fulfillmentActive: !!data.fulfillmentActive,
  };
}

export function parseSessionsPagePayload(payload: unknown): UserSessionPage {
  const data = payload && typeof payload === "object" ? (payload as UserSessionPage) : {};
  const content = Array.isArray(data.content) ? data.content : [];
  return {
    content,
    page: data.page ?? 0,
    size: data.size ?? content.length,
    totalElements: data.totalElements ?? content.length,
    totalPages: data.totalPages ?? 0,
    hasNext: Boolean(data.hasNext),
  };
}

export function filterOpenUserSessions(sessions: UserSessionRow[]): UserSessionRow[] {
  return sessions.filter((session) => session.active && !session.revoked && !session.expired);
}

export function mapPurchaseSummaryToApiItem(summary: PurchaseSummaryApiItem): PurchaseApiItem {
  return {
    id: summary.purchaseId ?? 0,
    packageId: summary.packageId,
    packageName: summary.packageName,
    packageCode: summary.packageCode,
    price: summary.price,
    currency: summary.currency,
    status: summary.status,
    purchaseType: summary.purchaseType,
    paymentStyle: summary.paymentStyle,
    installmentCount: summary.installmentCount,
    paymentId: summary.paymentId,
    paymentConversationId: summary.paymentConversationId,
    paymentMethodId: summary.paymentMethodId,
    cardBrand: summary.cardBrand,
    cardLastFour: summary.cardLastFour,
    startsAt: summary.startsAt,
    expiresAt: summary.expiresAt,
    purchasedAt: summary.purchasedAt,
    subscriptionStatus: summary.subscriptionStatus,
    billingPeriod: summary.billingPeriod,
    cancelAtPeriodEnd: summary.cancelAtPeriodEnd,
    currentPeriodConversationId: summary.currentPeriodConversationId,
    currentPeriodPaidAt: summary.currentPeriodPaidAt,
    subscriptionGraceEndsAt: summary.subscriptionGraceEndsAt,
    manualPaymentRequired: summary.manualPaymentRequired,
    refundEligibleUntil: summary.refundEligibleUntil,
    refundEligible: summary.refundEligible,
    refundableAmount: summary.refundableAmount,
    refundCoolingDays: summary.refundCoolingDays,
    refundedAt: summary.refundedAt,
    refundStatus: summary.refundStatus,
    daysUntilExpiry: summary.daysUntilExpiry,
    nextPaymentDueAt: summary.nextPaymentDueAt,
    paymentApproaching: summary.paymentApproaching,
    expiryApproaching: summary.expiryApproaching,
    usable: summary.usable,
    expired: summary.expired,
  };
}

export function activePurchaseFromOverview(overview: AccountOverview | undefined): PurchaseApiItem | null {
  if (!overview?.subscription.ok || !overview.subscription.data.activePackage) return null;
  return mapPurchaseSummaryToApiItem(overview.subscription.data.activePackage);
}

export function sectionFromUpstream<T>(
  status: number,
  data: unknown,
  parse: (payload: unknown) => T,
): AccountOverviewSection<T> {
  if (status >= 200 && status < 300) {
    return { ok: true, data: parse(data) };
  }
  return { ok: false, status, message: upstreamMessage(data) };
}
