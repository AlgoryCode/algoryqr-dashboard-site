"use client";

import { useMemo } from "react";
import type { MenuAnalyticsReportResponse, MenuRevenueReportResponse } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_METRIC_LABEL, DASHBOARD_METRIC_VALUE, DASHBOARD_STAT_TILE } from "@/lib/dashboard-surface";
import { useBranchAnalyticsReport } from "@/hooks/use-branch-analytics-report";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { comparePeriodRange } from "@/reporting";

import { dayLabel, money, pctDelta } from "./chart-config";
import { ReportEmpty } from "./ReportChartCard";
import { CiroWorthCard } from "./charts/CiroWorthCard";
import { RetentionStepChart } from "./charts/ZentraOverview";
import { readCiroMetrics } from "./ciro-metrics";
import { buildCiroWorthSeries } from "./shadcn-charts";

type OverviewMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

export function OverviewPage({
  revenue,
  visits,
  canUseRevenue,
}: {
  revenue?: MenuRevenueReportResponse | null;
  visits?: MenuAnalyticsReportResponse | null;
  canUseRevenue?: boolean;
}) {
  const from = revenue?.from ?? visits?.from ?? "";
  const to = revenue?.to ?? visits?.to ?? "";
  const branchId = revenue?.branchId ?? visits?.branchId ?? null;
  const menuId = revenue?.menuId ?? visits?.menuId ?? null;
  const compareRange = useMemo(
    () => comparePeriodRange(from || "1970-01-01", to || "1970-01-01", "previous"),
    [from, to],
  );
  const compareRevenue = useBranchRevenueReport(
    branchId,
    menuId,
    compareRange.from,
    compareRange.to,
    Boolean(canUseRevenue && branchId != null && from),
  );
  const compareVisits = useBranchAnalyticsReport(
    branchId,
    menuId,
    compareRange.from,
    compareRange.to,
    branchId != null && Boolean(from),
  );

  if (!revenue && !visits) {
    return <ReportEmpty text="Özet verisi henüz yok." />;
  }

  const currency = revenue ? readCiroMetrics(revenue).currency : "TRY";
  const formatMoney = (value: number) => money(value, currency);
  const metrics = buildOverviewMetrics({
    revenue,
    visits,
    previousRevenue: compareRevenue.data,
    previousVisits: compareVisits.data,
    canUseRevenue,
    money: formatMoney,
  });

  const showCiroWorth = Boolean(revenue && canUseRevenue);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {showCiroWorth ? (
          <div className="col-span-2 min-w-0">
            <CiroWorthCard
              total={formatMoney(readCiroMetrics(revenue!).total)}
              delta={worthDelta(revenue!, compareRevenue.data)}
              points={buildCiroWorthSeries(revenue!)}
              formatValue={formatMoney}
            />
          </div>
        ) : null}
        {metrics.map((item) => (
          <OverviewMetricCard key={item.id} item={item} />
        ))}
      </div>
      {visits && (!revenue || !canUseRevenue) ? <SessionRhythm visits={visits} /> : null}
    </div>
  );
}

function worthDelta(
  current: MenuRevenueReportResponse,
  previous: MenuRevenueReportResponse | undefined,
): number | null {
  if (!previous) return null;
  return pctDelta(readCiroMetrics(current).total, readCiroMetrics(previous).total);
}

function OverviewMetricCard({ item }: { item: OverviewMetric }) {
  return (
    <Card className={DASHBOARD_STAT_TILE}>
      <CardContent className="p-0">
        <p className={DASHBOARD_METRIC_LABEL}>{item.label}</p>
        <p className={`truncate ${DASHBOARD_METRIC_VALUE}`}>{item.value}</p>
        {item.hint ? <p className="mt-2 text-xs font-light text-neutral-400">{item.hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function SessionRhythm({ visits }: { visits: MenuAnalyticsReportResponse }) {
  return (
    <RetentionStepChart
      title="Oturum"
      data={(visits.daily ?? []).map((row) => ({ label: dayLabel(row.date), value: row.sessions }))}
    />
  );
}

function buildOverviewMetrics({
  revenue,
  visits,
  previousRevenue,
  previousVisits,
  canUseRevenue,
  money: formatMoney,
}: {
  revenue?: MenuRevenueReportResponse | null;
  visits?: MenuAnalyticsReportResponse | null;
  previousRevenue?: MenuRevenueReportResponse;
  previousVisits?: MenuAnalyticsReportResponse;
  canUseRevenue?: boolean;
  money: (value: number) => string;
}): OverviewMetric[] {
  if (revenue && canUseRevenue) {
    return revenueScorecard(revenue, visits, previousRevenue, previousVisits, formatMoney);
  }
  if (!visits) return [];
  return visitScorecard(visits, previousVisits);
}

function revenueScorecard(
  revenue: MenuRevenueReportResponse,
  visits: MenuAnalyticsReportResponse | null | undefined,
  previousRevenue: MenuRevenueReportResponse | undefined,
  previousVisits: MenuAnalyticsReportResponse | undefined,
  formatMoney: (value: number) => string,
): OverviewMetric[] {
  const current = readCiroMetrics(revenue);
  const prior = previousRevenue ? readCiroMetrics(previousRevenue) : null;
  const sessions = visits?.kpis.sessions ?? 0;
  const conversion = menuConversion(revenue, visits);
  return [
    metric("orders", "Sipariş", current.orders.toLocaleString("tr-TR"), prior ? pctDelta(current.orders, prior.orders) : null),
    metric(
      "sessions",
      "Oturum",
      sessions.toLocaleString("tr-TR"),
      previousVisits ? pctDelta(sessions, previousVisits.kpis.sessions) : null,
    ),
    metric(
      "conversion",
      "Dönüşüm",
      percent(conversion),
      previousRevenue && previousVisits ? pctDelta(conversion, menuConversion(previousRevenue, previousVisits)) : null,
      "Menü açılışından siparişe",
    ),
  ];
}

function visitScorecard(
  visits: MenuAnalyticsReportResponse,
  previous: MenuAnalyticsReportResponse | undefined,
): OverviewMetric[] {
  const sessions = visits.kpis.sessions;
  const intensity = opensPerSession(visits);
  return [
    metric("sessions", "Oturum", sessions.toLocaleString("tr-TR"), previous ? pctDelta(sessions, previous.kpis.sessions) : null),
    metric(
      "intensity",
      "Açılış / oturum",
      intensity.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
      previous ? pctDelta(intensity, opensPerSession(previous)) : null,
      "Bir oturumda menünün kaç kez açıldığı",
    ),
  ];
}

function menuConversion(
  revenue?: MenuRevenueReportResponse | null,
  visits?: MenuAnalyticsReportResponse | null,
): number {
  const opens = visits?.kpis.menuOpens ?? 0;
  if (!revenue || opens <= 0) return 0;
  return (inHouseOrders(revenue) / opens) * 100;
}

function inHouseOrders(revenue: MenuRevenueReportResponse): number {
  const inHouse = (revenue.channels ?? []).find((row) => row.code === "IN_HOUSE");
  if (inHouse?.orderCount != null) return inHouse.orderCount;
  return revenue.kpis.orderCount ?? 0;
}

function opensPerSession(visits?: MenuAnalyticsReportResponse | null): number {
  const sessions = visits?.kpis.sessions ?? 0;
  if (sessions <= 0) return 0;
  return (visits?.kpis.menuOpens ?? 0) / sessions;
}

function metric(
  id: string,
  label: string,
  value: string,
  delta: number | null,
  note?: string,
): OverviewMetric {
  return { id, label, value, hint: compareHint(delta, note) };
}

function percent(value: number): string {
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

function compareHint(delta: number | null, note?: string): string | undefined {
  if (delta == null) return note;
  const rounded = Math.round(delta);
  const change = `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("tr-TR")}% önceki dönem`;
  return note ? `${note} · ${change}` : change;
}
