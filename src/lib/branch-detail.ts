import type { BranchItem } from "@/lib/branch";
import { toAmount } from "@/reporting";

export type WeekBar = {
  date: string;
  height: number;
  peak: boolean;
};

export function formatBranchAmount(value: number, currency?: string | null): string {
  const rounded = Math.round(value).toLocaleString("tr-TR");
  if (currency === "USD") return `$${rounded}`;
  if (currency === "EUR") return `€${rounded}`;
  return `₺${rounded}`;
}

export function formatCancelPercent(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  const percent = rate <= 1 ? rate * 100 : rate;
  return `%${percent.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatManagerShort(firstName?: string | null, lastName?: string | null): string | null {
  const first = firstName?.trim();
  if (!first) return null;
  const last = lastName?.trim();
  if (!last) return first;
  return `${first} ${last.charAt(0).toLocaleUpperCase("tr-TR")}.`;
}

export function branchStatusLabel(active: boolean): string {
  return active ? "Açık" : "Kapalı";
}

export function branchMetaLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(" · ");
}

export function compareBranchIds(branches: BranchItem[], currentId: number): number[] {
  const others = branches
    .filter((branch) => branch.id !== currentId)
    .sort((left, right) => left.name.localeCompare(right.name, "tr-TR"))
    .slice(0, 5)
    .map((branch) => branch.id);
  return [currentId, ...others];
}

export function weeklyRevenueBars(
  dates: string[],
  daily: Array<{ date: string; revenue?: number | string | null }>,
): WeekBar[] {
  const totals = new Map(daily.map((row) => [row.date.slice(0, 10), toAmount(row.revenue)]));
  const revenues = dates.map((date) => totals.get(date) ?? 0);
  const max = Math.max(0, ...revenues);
  const peakAt = max > 0 ? revenues.indexOf(max) : -1;
  return dates.map((date, index) => ({
    date,
    peak: index === peakAt,
    height: barHeight(revenues[index] ?? 0, max),
  }));
}

function barHeight(revenue: number, max: number): number {
  if (max <= 0 || revenue <= 0) return 8;
  return Math.max(18, Math.round((revenue / max) * 100));
}
