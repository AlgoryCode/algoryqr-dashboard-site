"use client";

import { useMemo } from "react";
import type {
  MenuAnalyticsReportResponse,
  MenuRevenueReportResponse,
  MenuWaiterPerformanceReportResponse,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_METRIC_LABEL, DASHBOARD_METRIC_VALUE, DASHBOARD_STAT_TILE } from "@/lib/dashboard-surface";

import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { comparePeriodRange } from "@/reporting";

import { CHART_COLORS, money, num } from "./chart-config";
import { ReportEmpty } from "./ReportChartCard";
import { PeakTrackCard } from "./charts/NestedRingCard";
import { RemainSplitCard } from "./charts/RemainSplitCard";
import { TodayPulseCard } from "./charts/TodayPulseCard";
import { readChannelMix, readCiroMetrics, readProfitMix } from "./ciro-metrics";
import { readStaffCompare } from "./staff-metrics";

type OverviewMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

export function OverviewPage({
  revenue,
  visits,
  waiter,
  canUseRevenue,
}: {
  revenue?: MenuRevenueReportResponse | null;
  visits?: MenuAnalyticsReportResponse | null;
  waiter?: MenuWaiterPerformanceReportResponse | null;
  canUseRevenue?: boolean;
}) {
  if (!revenue && !visits) {
    return <ReportEmpty text="Özet verisi henüz yok." />;
  }

  const currency = revenue ? readCiroMetrics(revenue).currency : "TRY";
  const m = (value: number) => money(value, currency);
  const metrics = buildOverviewMetrics({ revenue, visits, waiter, canUseRevenue, money: m });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((item) => (
          <OverviewMetricCard key={item.id} item={item} />
        ))}
      </div>
      {revenue && canUseRevenue ? <OverviewRevenueBlock revenue={revenue} money={m} /> : null}
      {waiter && canUseRevenue ? <OverviewStaffBlock waiter={waiter} money={m} /> : null}
    </div>
  );
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

function OverviewRevenueBlock({
  revenue,
  money: m,
}: {
  revenue: MenuRevenueReportResponse;
  money: (value: number) => string;
}) {
  const compareRange = useMemo(
    () => comparePeriodRange(revenue.from, revenue.to, "previous"),
    [revenue.from, revenue.to],
  );
  const compareQuery = useBranchRevenueReport(
    revenue.branchId ?? null,
    revenue.menuId ?? null,
    compareRange.from,
    compareRange.to,
    revenue.branchId != null,
  );
  const metrics = readCiroMetrics(revenue);
  const profit = readProfitMix(revenue, metrics);
  const channels = readChannelMix(revenue, metrics);

  return (
    <>
      <TodayPulseCard current={revenue} previous={compareQuery.data} money={m} />
      <div className="grid gap-3 xl:grid-cols-2">
        <RemainSplitCard
          title="Tahsilat"
          percent={metrics.cashShare}
          center={m(metrics.paymentTotal)}
          caption="nakit payı"
          rows={[
            { name: "Nakit", value: metrics.cash, display: m(metrics.cash) },
            { name: "Kart", value: metrics.card, display: m(metrics.card) },
            { name: "Bahşiş", value: metrics.tip, display: m(metrics.tip) },
          ]}
        />
        <RemainSplitCard
          title="Kasada kalan"
          percent={profit.netShare}
          center={m(profit.net)}
          caption="kasada kalan"
          rows={[
            { name: "Brüt satış", value: profit.gross, display: m(profit.gross) },
            { name: "Sabit gider", value: profit.expense, display: m(profit.expense) },
            { name: "Kasada kalan", value: profit.net, display: m(profit.net) },
          ]}
        />
      </div>
      {channels.rows.length > 0 ? (
        <PeakTrackCard
          title="Kanal özeti"
          value={m(channels.total)}
          rows={channels.rows.slice(0, 4).map((row) => ({
            name: row.label,
            value: row.revenue,
            display: m(row.revenue),
            hint: `${row.orders.toLocaleString("tr-TR")} sipariş`,
          }))}
          accent={CHART_COLORS.c1}
        />
      ) : null}
    </>
  );
}

function OverviewStaffBlock({
  waiter,
  money: m,
}: {
  waiter: MenuWaiterPerformanceReportResponse;
  money: (value: number) => string;
}) {
  const staff = readStaffCompare(waiter);
  const top = [...(waiter.waiters ?? [])]
    .sort((a, b) => num(b.revenue) - num(a.revenue))
    .slice(0, 5);

  if (top.length === 0) return null;

  return (
    <PeakTrackCard
      title="Personel özeti"
      value={m(staff.totalRevenue)}
      rows={top.map((row) => ({
        name: row.displayName,
        value: num(row.revenue),
        display: m(num(row.revenue)),
        hint: `${(row.orderCount ?? 0).toLocaleString("tr-TR")} sipariş`,
      }))}
      accent={CHART_COLORS.c2}
    />
  );
}

function buildOverviewMetrics({
  revenue,
  visits,
  waiter,
  canUseRevenue,
  money: m,
}: {
  revenue?: MenuRevenueReportResponse | null;
  visits?: MenuAnalyticsReportResponse | null;
  waiter?: MenuWaiterPerformanceReportResponse | null;
  canUseRevenue?: boolean;
  money: (value: number) => string;
}): OverviewMetric[] {
  const items: OverviewMetric[] = [];

  if (revenue && canUseRevenue) {
    const metrics = readCiroMetrics(revenue);
    items.push(
      {
        id: "revenue",
        label: "Ciro",
        value: m(metrics.total),
        hint: `${metrics.orders.toLocaleString("tr-TR")} sipariş`,
      },
      {
        id: "orders",
        label: "Sipariş",
        value: metrics.orders.toLocaleString("tr-TR"),
        hint: `Ort. sepet ${m(metrics.aov)}`,
      },
    );
  }

  if (visits) {
    items.push(
      {
        id: "sessions",
        label: "Oturum",
        value: (visits.kpis.sessions ?? 0).toLocaleString("tr-TR"),
        hint: `${(visits.kpis.menuOpens ?? 0).toLocaleString("tr-TR")} menü açılış`,
      },
      {
        id: "views",
        label: "Ürün görüntüleme",
        value: (visits.kpis.productViews ?? 0).toLocaleString("tr-TR"),
        hint: `Ort. ${(visits.kpis.avgProductsPerSession ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} / oturum`,
      },
    );
  }

  if (waiter && canUseRevenue && items.length < 4) {
    const staff = readStaffCompare(waiter);
    items.push({
      id: "tip",
      label: "Bahşiş",
      value: m(staff.totalTip),
      hint: `${(waiter.waiters?.length ?? 0).toLocaleString("tr-TR")} personel`,
    });
  }

  return items.slice(0, 4);
}
