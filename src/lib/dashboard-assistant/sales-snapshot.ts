import type { MenuRevenueReportResponse } from "@/lib/api";
import {
  averageBasket,
  comparePeriodRange,
  confirmedOrderCount,
  reportingPeriodRange,
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
    topProducts,
    channels,
    peakHour,
  };
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

export function periodRangesForAssistant() {
  return ASSISTANT_SALES_PERIODS.map((period) => {
    const current = reportingPeriodRange(period);
    const previous = comparePeriodRange(current.from, current.to, "previous");
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
