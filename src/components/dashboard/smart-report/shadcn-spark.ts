import type { MenuAnalyticsReportResponse, MenuRevenueReportResponse } from "@/lib/api";
import { toAmount } from "@/reporting/numbers";

import { dayLabel, pctDelta } from "./chart-config";
import { readCiroMetrics, readSoldMix, type CiroMetrics } from "./ciro-metrics";
import { compactAmount } from "./shadcn-charts";

export type TwinSeries = {
  title: string;
  value: string;
  delta: number | null;
  points: { label: string; value: number }[];
};

export type SparkSplit = {
  label: string;
  value: string;
};

export type SparkKpi = {
  title: string;
  value: string;
  delta: number | null;
  icon: "users" | "userPlus" | "repeat" | "wallet" | "card";
  series: number[];
  splits?: SparkSplit[];
  /** Line color for the "fade" style; defaults to the chart palette by position. */
  color?: string;
};

export type CategorySlice = {
  name: string;
  value: number;
  display: string;
  percent: number;
};

export function buildCiroSparkKpis(
  current: MenuRevenueReportResponse,
  previous: MenuRevenueReportResponse | undefined,
  money: (value: number) => string,
): SparkKpi[] {
  const metrics = readCiroMetrics(current);
  const prior = previous ? readCiroMetrics(previous) : null;
  const daily = current.daily ?? [];
  const orders = daily.map((row) => row.orderCount ?? 0);
  const revenue = daily.map((row) => toAmount(row.revenue));
  const aov = daily.map((row, index) => {
    const count = orders[index] ?? 0;
    return count > 0 ? (revenue[index] ?? 0) / count : 0;
  });
  const perOrder = itemsPerOrder(metrics);
  const priorPerOrder = prior ? itemsPerOrder(prior) : 0;
  const busiest = daily.reduce<(typeof daily)[number] | null>(
    (best, row) => ((row.orderCount ?? 0) > (best?.orderCount ?? 0) ? row : best),
    null,
  );
  // Ciro, nakit/kart ve kâr kendi kartlarında, bahşiş Personel sekmesinde; burada yalnızca sipariş davranışı var.
  const orderSplits: SparkSplit[] = [
    {
      label: "Kalem / sipariş",
      value: `${perOrder.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}${deltaSuffix(pctDelta(perOrder, priorPerOrder))}`,
    },
  ];
  if (busiest && daily.length > 1) {
    orderSplits.push({ label: "En yoğun gün", value: `${dayLabel(busiest.date)} · ${busiest.orderCount} sipariş` });
  }
  return [
    {
      ...spark("Sipariş", metrics.orders.toLocaleString("tr-TR"), pctDelta(metrics.orders, prior?.orders ?? 0), "users", trend(orders)),
      splits: orderSplits,
    },
    spark("Ort. sepet", money(metrics.aov), pctDelta(metrics.aov, prior?.aov ?? 0), "wallet", trend(aov)),
  ];
}

/** Tek noktalı ya da tamamen sıfır seride çizgi anlamsız. */
function trend(values: number[]): number[] {
  return values.length > 1 && values.some((value) => value > 0) ? values : [];
}

function deltaSuffix(delta: number | null): string {
  if (delta == null || Math.round(delta) === 0) return "";
  const rounded = Math.round(delta);
  return ` (${rounded > 0 ? "+" : ""}${rounded}%)`;
}

export function buildTrafficSparkKpis(visits: MenuAnalyticsReportResponse): SparkKpi[] {
  const daily = visits.daily ?? [];
  const mid = Math.max(1, Math.floor(daily.length / 2));
  const first = daily.slice(0, mid);
  const second = daily.slice(mid);
  const depth = daily.map((row) => (row.sessions > 0 ? row.productViews / row.sessions : 0));
  return [
    spark(
      "Menü açılış",
      visits.kpis.menuOpens.toLocaleString("tr-TR"),
      halfDelta(second, first, (row) => row.menuOpens),
      "userPlus",
      daily.map((row) => row.menuOpens),
    ),
    spark("Kategori bakışı", visits.kpis.categoryViews.toLocaleString("tr-TR"), null, "users", []),
    spark(
      "Ürün görüntüleme",
      visits.kpis.productViews.toLocaleString("tr-TR"),
      halfDelta(second, first, (row) => row.productViews),
      "repeat",
      daily.map((row) => row.productViews),
    ),
    spark(
      "Ürün / oturum",
      visits.kpis.avgProductsPerSession.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
      halfDelta(second, first, (row) => (row.sessions > 0 ? row.productViews / row.sessions : 0)),
      "wallet",
      depth,
    ),
  ];
}

export type StaffScorecard = {
  tip: number;
  billsClosed: number;
  unassigned: number;
  activeStaff: number;
};

export function buildStaffSparkKpis(
  score: StaffScorecard,
  money: (value: number) => string,
): SparkKpi[] {
  return [
    spark("Bahşiş", money(score.tip), null, "wallet", []),
    spark("Kapanan hesap", score.billsClosed.toLocaleString("tr-TR"), null, "users", []),
    spark("Atanmamış sipariş", score.unassigned.toLocaleString("tr-TR"), null, "userPlus", []),
    spark("Aktif personel", score.activeStaff.toLocaleString("tr-TR"), null, "repeat", []),
  ];
}

export function buildCategorySales(
  current: MenuRevenueReportResponse,
  previous: MenuRevenueReportResponse | undefined,
  money: (value: number) => string,
): { total: string; compact: string; delta: number | null; slices: CategorySlice[] } {
  const sold = readSoldMix(current);
  const head = sold.categories.slice(0, 4);
  const leftover = sold.categories.slice(4).reduce((sum, row) => sum + row.revenue, 0);
  const slices = leftover > 0 ? [...head, { name: "Diğer", quantity: 0, revenue: leftover }] : head;
  const grand = slices.reduce((sum, row) => sum + row.revenue, 0);
  const priorTotal = previous
    ? readSoldMix(previous).categories.reduce((sum, row) => sum + row.revenue, 0)
    : 0;
  return {
    total: money(grand),
    compact: compactAmount(grand),
    delta: pctDelta(grand, priorTotal),
    slices: slices.map((row) => ({
      name: row.name,
      value: row.revenue,
      display: compactAmount(row.revenue),
      percent: Math.round((row.revenue / (grand || 1)) * 100),
    })),
  };
}

function itemsPerOrder(metrics: CiroMetrics): number {
  if (metrics.orders <= 0) return 0;
  return metrics.items / metrics.orders;
}

function spark(
  title: string,
  value: string,
  delta: number | null,
  icon: SparkKpi["icon"],
  series: number[],
  splits?: SparkSplit[],
): SparkKpi {
  return { title, value, delta, icon, series, ...(splits ? { splits } : {}) };
}

function halfDelta<TRow>(
  second: TRow[],
  first: TRow[],
  pick: (row: TRow) => number,
): number | null {
  return pctDelta(
    second.reduce((sum, row) => sum + pick(row), 0),
    first.reduce((sum, row) => sum + pick(row), 0),
  );
}
