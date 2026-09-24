import type { MenuRevenueReportResponse } from "@/lib/api";
import { eachIsoDate, formatReportingDate, isSingleDayRange } from "@/reporting";
import { toAmount } from "@/reporting/numbers";

import { activeWindow } from "./chart-config";
import { fillHourlyPoints } from "./ciro-metrics";

export type PulseAreaPoint = {
  label: string;
  current: number;
  previous: number;
};

export function todayIso(clock: () => Date = () => new Date()): string {
  const date = clock();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function pulseNowHour(to: string, clock: () => Date = () => new Date()): number | null {
  if (to !== todayIso(clock)) return null;
  return clock().getHours();
}

export function pulseRadioLabels(
  from: string,
  to: string,
  clock: () => Date = () => new Date(),
): { current: string; previous: string } {
  if (isSingleDayRange(from, to) && to === todayIso(clock)) {
    return { current: "Bugün", previous: "Dün" };
  }
  if (isSingleDayRange(from, to)) {
    return { current: "Seçilen gün", previous: "Önceki gün" };
  }
  return { current: "Bu dönem", previous: "Önceki" };
}

export function pulseHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function compactAmount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("tr-TR")}K`;
  }
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function compactAxis(value: number): string {
  if (value <= 0) return "₺0";
  return `₺${compactAmount(value)}`;
}

export function trimZeroEdges(points: PulseAreaPoint[]): PulseAreaPoint[] {
  const first = points.findIndex((point) => point.current > 0 || point.previous > 0);
  if (first < 0) return points;
  let last = points.length - 1;
  while (last > first && points[last].current <= 0 && points[last].previous <= 0) {
    last -= 1;
  }
  return points.slice(first, last + 1);
}

export function keepActivePoints(points: PulseAreaPoint[]): PulseAreaPoint[] {
  const active = points.filter((point) => point.current > 0 || point.previous > 0);
  return active.length >= 2 ? active : trimZeroEdges(points);
}

export type CiroWorthPoint = {
  label: string;
  value: number;
};

export function buildCiroWorthSeries(revenue: MenuRevenueReportResponse): CiroWorthPoint[] {
  const points = isSingleDayRange(revenue.from, revenue.to) ? hourlyWorth(revenue) : dailyWorth(revenue);
  const windowed = activeWindow(points);
  if (windowed.length >= 2) return windowed;
  return points;
}

function hourlyWorth(revenue: MenuRevenueReportResponse): CiroWorthPoint[] {
  return fillHourlyPoints(revenue.hourly ?? []).map((row) => ({
    label: pulseHourLabel(row.hour),
    value: row.revenue,
  }));
}

function dailyWorth(revenue: MenuRevenueReportResponse): CiroWorthPoint[] {
  const totals = sumByDate(revenue.daily ?? []);
  return eachIsoDate(revenue.from, revenue.to).map((date) => ({
    label: formatReportingDate(date),
    value: totals.get(date) ?? 0,
  }));
}

export function buildPulseArea(
  current: MenuRevenueReportResponse,
  previous?: MenuRevenueReportResponse,
): PulseAreaPoint[] {
  if (isSingleDayRange(current.from, current.to)) {
    return keepActivePoints(hourlyArea(current, previous));
  }
  return trimZeroEdges(dailyArea(current, previous));
}

function hourlyArea(
  current: MenuRevenueReportResponse,
  previous?: MenuRevenueReportResponse,
): PulseAreaPoint[] {
  const curr = fillHourlyPoints(current.hourly ?? []);
  const prev = fillHourlyPoints(previous?.hourly ?? []);
  return curr.map((row, index) => ({
    label: pulseHourLabel(row.hour),
    current: row.revenue,
    previous: prev[index]?.revenue ?? 0,
  }));
}

function dailyArea(
  current: MenuRevenueReportResponse,
  previous?: MenuRevenueReportResponse,
): PulseAreaPoint[] {
  const dates = eachIsoDate(current.from, current.to);
  const previousDates = previous ? eachIsoDate(previous.from, previous.to) : [];
  const currentMap = sumByDate(current.daily ?? []);
  const previousMap = sumByDate(previous?.daily ?? []);
  return dates.map((date, index) => ({
    label: formatReportingDate(date),
    current: currentMap.get(date) ?? 0,
    previous: previousMap.get(previousDates[index] ?? "") ?? 0,
  }));
}

function sumByDate(rows: { date: string; revenue?: number | string | null }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.date, (totals.get(row.date) ?? 0) + toAmount(row.revenue));
  }
  return totals;
}
