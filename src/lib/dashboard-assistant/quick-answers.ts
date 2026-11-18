import type {
  AssistantSalesCachePayload,
  AssistantSalesPeriodSnapshot,
} from "@/lib/dashboard-assistant/sales-snapshot";

/**
 * The ready-made chips in "Asistana sor". They are answered here from the sales summary, with no
 * model call: instant, always the same numbers as the reports, and they do not use up a question.
 */
export type QuickPromptId =
  | "today_revenue"
  | "top_products"
  | "peak_hour"
  | "week_summary"
  | "week_change"
  | "unsold";

export type QuickPrompt = { id: QuickPromptId; label: string; insight?: boolean };

export const QUICK_PROMPT_IDS: QuickPromptId[] = [
  "today_revenue",
  "top_products",
  "peak_hour",
  "week_summary",
  "week_change",
  "unsold",
];

export const BASE_QUICK_PROMPTS: QuickPrompt[] = [
  { id: "today_revenue", label: "Bugün ciro nasıl?" },
  { id: "top_products", label: "En çok satan ne?" },
  { id: "peak_hour", label: "Yoğun saat hangisi?" },
  { id: "week_summary", label: "Son 7 gün özeti" },
];

/** A weekly move smaller than this is noise, not worth a chip. */
const NOTABLE_CHANGE_PERCENT = 10;

function period(payload: AssistantSalesCachePayload, key: AssistantSalesPeriodSnapshot["period"]) {
  return payload.periods.find((row) => row.period === key) ?? null;
}

/** Up to two chips the data itself suggests, e.g. a weekly drop or products that never sold. */
export function insightPrompts(payload: AssistantSalesCachePayload | null): QuickPrompt[] {
  if (!payload) return [];
  const chips: QuickPrompt[] = [];
  const week = period(payload, "7d");
  const delta = week?.revenueDeltaPercent;
  if (week && delta != null && Math.abs(delta) >= NOTABLE_CHANGE_PERCENT) {
    chips.push({
      id: "week_change",
      label: delta < 0 ? "Bu hafta ciro neden düştü?" : "Bu hafta ne iyi gitti?",
      insight: true,
    });
  }
  const month = period(payload, "30d");
  if (month && month.unsold.count > 0) {
    chips.push({ id: "unsold", label: "Satmayan ürünler hangileri?", insight: true });
  }
  return chips.slice(0, 2);
}

export function quickPromptLabel(id: QuickPromptId, payload: AssistantSalesCachePayload | null): string {
  return (
    [...BASE_QUICK_PROMPTS, ...insightPrompts(payload)].find((prompt) => prompt.id === id)?.label ??
    BASE_QUICK_PROMPTS.find((prompt) => prompt.id === id)?.label ??
    ""
  );
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value)} ${currency}`;
  }
}

function count(value: number): string {
  return value.toLocaleString("tr-TR");
}

function percent(value: number): string {
  return `%${Math.abs(value).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

function changeText(current: number, previous: number | null): string | null {
  if (previous == null || previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 1000) / 10;
  if (change === 0) return "değişmedi";
  return `${percent(change)} ${change > 0 ? "arttı" : "azaldı"}`;
}

function hourRange(hour: number): string {
  const pad = (value: number) => String(value % 24).padStart(2, "0");
  return `${pad(hour)}:00–${pad(hour + 1)}:00`;
}

function noSales(label: string): string {
  return `${label} için kayıtlı satış yok. Siparişler tamamlandıkça burada görünür.`;
}

function todayRevenue(payload: AssistantSalesCachePayload): string | null {
  const today = period(payload, "1d");
  if (!today) return null;
  const yesterday =
    today.previousRevenue != null ? ` Dün tüm gün ${money(today.previousRevenue, today.currency)} ciro yapmıştınız.` : "";
  if (today.orders === 0) return `Bugün henüz tamamlanan sipariş yok.${yesterday}`;
  return (
    `Bugün şu ana kadar ${money(today.revenue, today.currency)} ciro, ${count(today.orders)} sipariş ` +
    `(ortalama sepet ${money(today.basket, today.currency)}).${yesterday}`
  );
}

function topProducts(payload: AssistantSalesCachePayload): string | null {
  const week = period(payload, "7d");
  if (!week) return null;
  if (week.topProducts.length === 0) return noSales("Son 7 gün");
  const lines = week.topProducts
    .slice(0, 3)
    .map((row, index) => `${index + 1}. ${row.name}: ${count(row.quantity)} adet (${money(row.revenue, week.currency)})`);
  return `Son 7 günde en çok satanlar:\n${lines.join("\n")}`;
}

function peakHour(payload: AssistantSalesCachePayload): string | null {
  const week = period(payload, "7d");
  if (!week) return null;
  if (!week.peakHour) return noSales("Son 7 gün");
  const today = period(payload, "1d");
  const todayText = today?.peakHour
    ? ` Bugün en yoğun saat ${hourRange(today.peakHour.hour)} (${money(today.peakHour.revenue, today.currency)}).`
    : "";
  return (
    `Son 7 günde en yoğun saatiniz ${hourRange(week.peakHour.hour)}; bu saatte ` +
    `${money(week.peakHour.revenue, week.currency)} ciro yapıldı.${todayText}`
  );
}

function weekSummary(payload: AssistantSalesCachePayload): string | null {
  const week = period(payload, "7d");
  if (!week) return null;
  if (week.orders === 0) return noSales("Son 7 gün");
  const parts = [
    `Son 7 gün: ${money(week.revenue, week.currency)} ciro, ${count(week.orders)} sipariş, ortalama sepet ${money(week.basket, week.currency)}.`,
  ];
  const change = changeText(week.revenue, week.previousRevenue);
  if (change) parts.push(`Ciro önceki 7 güne göre ${change}.`);
  const top = week.topProducts[0];
  if (top) parts.push(`En çok satan ${top.name} (${count(top.quantity)} adet).`);
  const channel = week.channels[0];
  if (channel && week.channels.length > 1) parts.push(`En güçlü kanal ${channel.label}.`);
  return parts.join(" ");
}

function weekChange(payload: AssistantSalesCachePayload): string | null {
  const week = period(payload, "7d");
  if (!week || week.previousRevenue == null) return null;
  if (week.previousRevenue <= 0) return "Önceki 7 günde satış olmadığı için karşılaştırma yapılamıyor.";
  const down = week.revenue < week.previousRevenue;
  const parts = [
    `Son 7 günde ciro ${money(week.revenue, week.currency)}; önceki 7 güne göre ${changeText(week.revenue, week.previousRevenue)} ` +
      `(${money(week.previousRevenue, week.currency)}).`,
  ];
  const orders = changeText(week.orders, week.previousOrders);
  const basket = changeText(week.basket, week.previousBasket);
  if (orders || basket) {
    const reasons = [orders ? `sipariş sayısı ${orders}` : null, basket ? `ortalama sepet ${basket}` : null]
      .filter(Boolean)
      .join(", ");
    parts.push(`Bunun içinde ${reasons}.`);
  }
  const movers = week.movers
    .filter((row) => (down ? row.revenue < row.previousRevenue : row.revenue > row.previousRevenue))
    .slice(0, 3);
  if (movers.length > 0) {
    const list = movers
      .map((row) => `${row.name} (${row.revenue > row.previousRevenue ? "+" : "−"}${money(Math.abs(row.revenue - row.previousRevenue), week.currency)})`)
      .join(", ");
    parts.push(`${down ? "En çok düşen" : "En çok artan"} ürünler: ${list}.`);
  }
  return parts.join(" ");
}

function unsold(payload: AssistantSalesCachePayload): string | null {
  const month = period(payload, "30d");
  if (!month) return null;
  if (month.unsold.count === 0) return "Son 30 günde menünüzdeki her ürün en az bir kez satıldı.";
  const names = month.unsold.names.join(", ");
  const more = month.unsold.count > month.unsold.names.length ? ` ve ${count(month.unsold.count - month.unsold.names.length)} ürün daha` : "";
  return (
    `Son 30 günde ${count(month.unsold.count)} ürün hiç satılmadı: ${names}${more}. ` +
    "Menüde öne çıkarmayı, fiyatını gözden geçirmeyi veya menüden kaldırmayı düşünebilirsiniz."
  );
}

const ANSWERS: Record<QuickPromptId, (payload: AssistantSalesCachePayload) => string | null> = {
  today_revenue: todayRevenue,
  top_products: topProducts,
  peak_hour: peakHour,
  week_summary: weekSummary,
  week_change: weekChange,
  unsold,
};

/** The chip's answer, or null when the summary lacks what it needs (then the question goes to the agent). */
export function answerQuickPrompt(id: QuickPromptId, payload: AssistantSalesCachePayload): string | null {
  return ANSWERS[id](payload);
}
