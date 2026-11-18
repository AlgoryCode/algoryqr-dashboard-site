import type { MenuRevenueReportResponse } from "@/lib/api";
import {
  averageBasket,
  confirmedOrderCount,
  soldItemCount,
  toAmount,
  totalRevenue,
  type AnalyticsPeriod,
} from "@/reporting";

export const ASSISTANT_SALES_PERIODS: AnalyticsPeriod[] = ["1d", "7d", "30d"];

const PERIOD_LABEL: Record<AnalyticsPeriod, string> = {
  "1d": "Bugün",
  yesterday: "Dün",
  "7d": "Son 7 gün",
  "30d": "Son 30 gün",
};

export type AssistantSalesPeriodSnapshot = {
  period: AnalyticsPeriod;
  label: string;
  from: string;
  to: string;
  currency: string;
  revenue: number;
  orders: number;
  items: number;
  basket: number;
  previousRevenue: number | null;
  revenueDeltaPercent: number | null;
  previousOrders: number | null;
  previousBasket: number | null;
  /** Products whose revenue moved most against the previous equal period. */
  movers: { name: string; revenue: number; previousRevenue: number; quantity: number; previousQuantity: number }[];
  unsold: { count: number; names: string[] };
  topProducts: { name: string; quantity: number; revenue: number }[];
  channels: { label: string; revenue: number; orders: number }[];
  peakHour: { hour: number; revenue: number } | null;
};

export type AssistantSalesCachePayload = {
  version: 1;
  branchId: number;
  menuId: number | null;
  branchName: string | null;
  menuName: string | null;
  fetchedAt: string;
  periods: AssistantSalesPeriodSnapshot[];
};

export function buildSalesPeriodSnapshot(
  period: AnalyticsPeriod,
  current: MenuRevenueReportResponse,
  previous: MenuRevenueReportResponse | null,
): AssistantSalesPeriodSnapshot {
  const currency = current.kpis?.currency || current.paymentBreakdown?.currency || "TRY";
  const revenue = totalRevenue(current.kpis?.totalRevenue);
  const orders = confirmedOrderCount(current.kpis?.orderCount);
  const items = soldItemCount(current.kpis?.itemCount);
  const basket = averageBasket(revenue, orders);
  const previousRevenue = previous ? totalRevenue(previous.kpis?.totalRevenue) : null;
  const revenueDeltaPercent =
    previousRevenue != null && previousRevenue > 0
      ? Math.round(((revenue - previousRevenue) / previousRevenue) * 1000) / 10
      : null;

  const topProducts = [...(current.products ?? [])]
    .map((row) => ({
      name: row.name,
      quantity: row.quantity ?? 0,
      revenue: toAmount(row.revenue),
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 8);

  const channels = [...(current.channels ?? [])]
    .map((row) => ({
      label: row.label || row.code,
      revenue: toAmount(row.revenue),
      orders: row.orderCount ?? 0,
    }))
    .filter((row) => row.revenue > 0 || row.orders > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const peakHour = peakHourFromReport(current);
  const previousOrders = previous ? confirmedOrderCount(previous.kpis?.orderCount) : null;
  const previousBasket =
    previous && previousRevenue != null && previousOrders ? averageBasket(previousRevenue, previousOrders) : null;

  return {
    period,
    label: PERIOD_LABEL[period],
    from: current.from,
    to: current.to,
    currency,
    revenue,
    orders,
    items,
    basket,
    previousRevenue,
    revenueDeltaPercent,
    previousOrders,
    previousBasket,
    movers: previous ? productMovers(current, previous) : [],
    unsold: {
      count: current.unsold?.count ?? current.unsold?.products?.length ?? 0,
      names: (current.unsold?.products ?? []).map((row) => row.name).slice(0, 8),
    },
    topProducts,
    channels,
    peakHour,
  };
}

const MOVER_LIMIT = 6;

function productMovers(current: MenuRevenueReportResponse, previous: MenuRevenueReportResponse) {
  const rows = new Map<string, AssistantSalesPeriodSnapshot["movers"][number]>();
  const row = (name: string) => {
    let value = rows.get(name);
    if (!value) {
      value = { name, revenue: 0, previousRevenue: 0, quantity: 0, previousQuantity: 0 };
      rows.set(name, value);
    }
    return value;
  };
  for (const product of current.products ?? []) {
    const value = row(product.name);
    value.revenue += toAmount(product.revenue);
    value.quantity += product.quantity ?? 0;
  }
  for (const product of previous.products ?? []) {
    const value = row(product.name);
    value.previousRevenue += toAmount(product.revenue);
    value.previousQuantity += product.quantity ?? 0;
  }
  return [...rows.values()]
    .filter((value) => value.revenue !== value.previousRevenue)
    .sort((a, b) => Math.abs(b.revenue - b.previousRevenue) - Math.abs(a.revenue - a.previousRevenue))
    .slice(0, MOVER_LIMIT);
}

function peakHourFromReport(report: MenuRevenueReportResponse): { hour: number; revenue: number } | null {
  const hourly = report.hourly ?? [];
  if (hourly.length === 0) return null;
  let best: { hour: number; revenue: number } | null = null;
  for (const row of hourly) {
    const revenue = toAmount(row.revenue);
    if (!best || revenue > best.revenue) {
      best = { hour: row.hour, revenue };
    }
  }
  return best && best.revenue > 0 ? best : null;
}

const MS_PER_DAY = 86_400_000;

function shiftIsoDay(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Today in the business time zone (YYYY-MM-DD), so a UTC server still means Turkish "bugün". */
export function businessToday(timeZone = "Europe/Istanbul", now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Bugün, son 7 ve 30 gün with the equal period before each, counted back from `today`. */
export function assistantRangesFrom(today: string) {
  const spans: Record<string, number> = { "1d": 0, "7d": 6, "30d": 29 };
  return ASSISTANT_SALES_PERIODS.map((period) => {
    const span = spans[period] ?? 0;
    const current = { from: shiftIsoDay(today, -span), to: today };
    const previousTo = shiftIsoDay(current.from, -1);
    const previous = { from: shiftIsoDay(previousTo, -span), to: previousTo };
    return { period, current, previous };
  });
}

export function formatSalesContextForAgent(payload: AssistantSalesCachePayload): string {
  const header = [
    `Şube: ${payload.branchName ?? payload.branchId}`,
    payload.menuName ? `Menü filtresi: ${payload.menuName}` : "Menü filtresi: tüm menüler",
    `Rapor çekilme: ${payload.fetchedAt}`,
  ].join(" | ");

  const blocks = payload.periods.map((period) => {
    const delta =
      period.revenueDeltaPercent != null
        ? ` (önceki döneme göre ciro %${period.revenueDeltaPercent})`
        : "";
    const lines = [
      `[${period.label} ${period.from}–${period.to}]`,
      `Ciro: ${formatMoney(period.revenue, period.currency)}${delta}`,
      `Sipariş: ${period.orders} | Sepet: ${formatMoney(period.basket, period.currency)} | Ürün adedi: ${period.items}`,
    ];
    if (period.topProducts.length > 0) {
      lines.push(
        `En çok satan: ${period.topProducts
          .slice(0, 5)
          .map((p) => `${p.name} (${p.quantity} adet, ${formatMoney(p.revenue, period.currency)})`)
          .join("; ")}`,
      );
    }
    if (period.channels.length > 0) {
      lines.push(
        `Kanallar: ${period.channels
          .map((c) => `${c.label} ${formatMoney(c.revenue, period.currency)}`)
          .join("; ")}`,
      );
    }
    if (period.peakHour) {
      lines.push(
        `Yoğun saat: ${String(period.peakHour.hour).padStart(2, "0")}:00 (${formatMoney(period.peakHour.revenue, period.currency)})`,
      );
    }
    return lines.join("\n");
  });

  return `${header}\n\n${blocks.join("\n\n")}`;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} ${currency}`;
  }
}
