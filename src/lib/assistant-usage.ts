/** What a dashboard assistant question was about. Mirrors qr-service AssistantUsageTopic. */
export type AssistantUsageTopic = "REVENUE" | "ORDERS" | "PRODUCTS" | "STAFF" | "MENU" | "GENERAL";

export type AssistantUsageOutcome = "ANSWERED" | "FAILED";

const TOPIC_KEYWORDS: ReadonlyArray<readonly [AssistantUsageTopic, readonly string[]]> = [
  ["STAFF", ["personel", "garson", "çalışan", "calisan", "bahşiş", "bahsis", "komisyon", "vardiya", "kurye"]],
  ["REVENUE", ["ciro", "gelir", "kazanç", "kazanc", "hasılat", "hasilat", "satış tutar", "nakit", "kart", "tahsilat", "kâr", "kar marj", "para"]],
  ["ORDERS", ["sipariş", "siparis", "masa", "adisyon", "hesap", "yoğun", "yogun", "saat"]],
  ["PRODUCTS", ["ürün", "urun", "en çok satan", "en cok satan", "satan", "stok", "kategori", "fiyat"]],
  ["MENU", ["menü", "menu", "qr", "ziyaret", "görüntülen", "goruntulen", "tarama"]],
];

/**
 * Sorts a merchant's question into a topic by keywords, so usage can be reported without storing
 * the question itself. The first matching topic in TOPIC_KEYWORDS order wins.
 */
export function classifyAssistantTopic(message: string): AssistantUsageTopic {
  const text = message.toLocaleLowerCase("tr-TR");
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return topic;
  }
  return "GENERAL";
}

export const ASSISTANT_TOPIC_LABEL: Record<AssistantUsageTopic, string> = {
  REVENUE: "Ciro ve tahsilat",
  ORDERS: "Sipariş ve masa",
  PRODUCTS: "Ürün ve satış",
  STAFF: "Personel",
  MENU: "Menü ve ziyaret",
  GENERAL: "Genel",
};

export const ASSISTANT_DAILY_LIMIT_CODE = "ASSISTANT_DAILY_LIMIT";

/** How many questions the merchant may still ask today; `limit` is null on plans with the assistant. */
export type AssistantAllowance = {
  limit: number | null;
  used: number;
  remaining: number | null;
};

/** qr-service `GET /usage/{feature}`: one per-period allowance. `limit` is null when unlimited. */
export type MeteredUsage = {
  feature: string;
  period: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  resetsAt: string | null;
};

/**
 * The backend meters assistant questions (ASSISTANT_QUESTION): unlimited with the assistant in the
 * plan, otherwise a small free daily allowance whose size the backend decides.
 */
export function allowanceFromUsage(usage: MeteredUsage): AssistantAllowance {
  const used = Math.max(0, Math.floor(usage.used));
  if (usage.unlimited || usage.limit == null) return { limit: null, used, remaining: null };
  return { limit: usage.limit, used, remaining: Math.max(0, usage.limit - used) };
}

export function isAllowanceExhausted(allowance: AssistantAllowance | null | undefined): boolean {
  return allowance?.remaining != null && allowance.remaining <= 0;
}
