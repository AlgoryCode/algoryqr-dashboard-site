import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

export type SubscriptionEventType =
  | "TRIAL_STARTED"
  | "TRIAL_ENDING"
  | "TRIAL_ENDED"
  | "PACKAGE_ACTIVATED"
  | "PACKAGE_RENEWED"
  | "PACKAGE_CHANGED"
  | "PAYMENT_FAILED"
  | "PAYMENT_RECOVERED"
  | "PACKAGE_REFUNDED"
  | "DOWNGRADED_TO_FREE"
  | "ADDON_GRANTED"
  | "ADDON_REVOKED";

export type SubscriptionHistoryItem = {
  type: SubscriptionEventType;
  packageCode: string | null;
  packageName: string | null;
  previousPackageCode: string | null;
  previousPackageName: string | null;
  endsAt: string | null;
  occurredAt: string;
};

const LABELS: Record<SubscriptionEventType, string> = {
  TRIAL_STARTED: "Deneme başladı",
  TRIAL_ENDING: "Deneme bitişi hatırlatıldı",
  TRIAL_ENDED: "Deneme sona erdi",
  PACKAGE_ACTIVATED: "Paket etkinleştirildi",
  PACKAGE_RENEWED: "Abonelik yenilendi",
  PACKAGE_CHANGED: "Paket değiştirildi",
  PAYMENT_FAILED: "Ödeme alınamadı",
  PAYMENT_RECOVERED: "Ödeme alındı",
  PACKAGE_REFUNDED: "İade edildi",
  DOWNGRADED_TO_FREE: "Ücretsiz pakete geçildi",
  ADDON_GRANTED: "Modül eklendi",
  ADDON_REVOKED: "Modül kaldırıldı",
};

/** Problems are red, endings neutral, everything else a positive step. */
export function subscriptionEventTone(type: SubscriptionEventType): "positive" | "negative" | "neutral" {
  if (type === "PAYMENT_FAILED" || type === "PACKAGE_REFUNDED") return "negative";
  if (type === "TRIAL_ENDED" || type === "DOWNGRADED_TO_FREE" || type === "TRIAL_ENDING" || type === "ADDON_REVOKED") {
    return "neutral";
  }
  return "positive";
}

export function subscriptionEventLabel(type: string): string {
  return LABELS[type as SubscriptionEventType] ?? type;
}

export function subscriptionEventDetail(item: SubscriptionHistoryItem): string | null {
  const name = item.packageName ?? item.packageCode;
  const previous = item.previousPackageName ?? item.previousPackageCode;
  if (item.type === "PACKAGE_CHANGED" && previous && name) return `${previous} → ${name}`;
  return name;
}

function parseItem(value: unknown): SubscriptionHistoryItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== "string" || typeof record.occurredAt !== "string") return null;
  const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : null);
  return {
    type: record.type as SubscriptionEventType,
    packageCode: str("packageCode"),
    packageName: str("packageName"),
    previousPackageCode: str("previousPackageCode"),
    previousPackageName: str("previousPackageName"),
    endsAt: str("endsAt"),
    occurredAt: record.occurredAt,
  };
}

export function parseSubscriptionHistory(payload: unknown): SubscriptionHistoryItem[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item) => {
    const parsed = parseItem(item);
    return parsed ? [parsed] : [];
  });
}

export async function fetchSubscriptionHistory(): Promise<SubscriptionHistoryItem[]> {
  const response = await getSiteSameOriginAxios().get("/subscription/history");
  return parseSubscriptionHistory(response.data);
}
