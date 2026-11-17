import type { MenuRevenueReportResponse } from "@/lib/api";
import { eachIsoDate, formatReportingDate, isSingleDayRange } from "@/reporting";
import { revenueShare, toAmount } from "@/reporting/numbers";

import { fillHourlyPoints, readCiroMetrics } from "./ciro-metrics";
import { pulseHourLabel } from "./shadcn-charts";

/** Dönem başından bu noktaya kadar biriken gelir ve sabit gider. */
export type BalancePoint = {
  label: string;
  income: number;
  expense: number;
};

export type BalanceSummary = {
  points: BalancePoint[];
  /** Dönem sabit gideri (dönem boyunca eşit dağıtılır). */
  expense: number;
  /** Gelir eksi sabit gider; negatif olabilir. */
  net: number;
  /** Kârın gelire oranı (%); gelir yoksa null. */
  margin: number | null;
  /** Biriken gelirin dönemin tüm sabit giderini ilk geçtiği nokta. */
  breakEven: string | null;
  /** Başabaşa ulaşılmadıysa eksik kalan tutar. */
  shortfall: number;
};

export function buildBalanceSummary(revenue: MenuRevenueReportResponse): BalanceSummary {
  const pb = revenue.paymentBreakdown;
  const income = toAmount(pb?.grossRevenue) || readCiroMetrics(revenue).total;
  const expense = toAmount(pb?.fixedExpenseTotal);
  const net = pb?.netRevenue != null ? toAmount(pb.netRevenue) : income - expense;

  const steps = incomeSteps(revenue);
  let running = 0;
  const points = steps.map((step, index) => {
    running += step.value;
    return {
      label: step.label,
      income: running,
      expense: steps.length > 0 ? (expense * (index + 1)) / steps.length : 0,
    };
  });

  const crossing = expense > 0 ? points.find((point) => point.income >= expense) : undefined;
  return {
    points,
    expense,
    net,
    margin: income > 0 ? revenueShare(net, income) : null,
    breakEven: crossing?.label ?? null,
    shortfall: expense > 0 && !crossing ? Math.max(0, expense - income) : 0,
  };
}

function incomeSteps(revenue: MenuRevenueReportResponse): { label: string; value: number }[] {
  if (isSingleDayRange(revenue.from, revenue.to)) {
    const hours = fillHourlyPoints(revenue.hourly ?? []);
    const first = hours.findIndex((row) => row.revenue > 0);
    if (first < 0) return [];
    let last = hours.length - 1;
    while (last > first && hours[last].revenue <= 0) last -= 1;
    return hours.slice(first, last + 1).map((row) => ({ label: pulseHourLabel(row.hour), value: row.revenue }));
  }
  const byDate = new Map<string, number>();
  for (const row of revenue.daily ?? []) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + toAmount(row.revenue));
  }
  return eachIsoDate(revenue.from, revenue.to).map((date) => ({
    label: formatReportingDate(date),
    value: byDate.get(date) ?? 0,
  }));
}
