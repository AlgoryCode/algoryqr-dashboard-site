"use client";

import { useMemo } from "react";

import type { MenuRevenueReportResponse } from "@/lib/api";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { comparePeriodRange } from "@/reporting";

import { cn } from "@/lib/utils";

import { activeWindow, CHART_COLORS, pctDelta } from "./chart-config";
import { CategorySalesCard } from "./charts/CategorySalesCard";
import { CiroWorthCard } from "./charts/CiroWorthCard";
import { DualRankCard } from "./charts/DualRankCard";
import { PeakTrackCard } from "./charts/NestedRingCard";
import { RemainSplitCard } from "./charts/RemainSplitCard";
import { RetentionStepChart } from "./charts/ZentraOverview";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { fillHourlyPoints, readChannelMix, readCiroMetrics, readProfitMix, readVolumeValue } from "./ciro-metrics";
import { buildCiroWorthSeries } from "./shadcn-charts";
import { buildCategorySales, buildCiroSparkKpis } from "./shadcn-spark";

export function CiroPage({
  revenue,
  money: formatMoney,
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
  const channels = readChannelMix(revenue, metrics);
  const volume = readVolumeValue(revenue);
  const profit = readProfitMix(revenue, metrics);
  const categories = buildCategorySales(revenue, compareQuery.data, formatMoney);
  const hourly = hourlyRevenue(revenue);

  const priorTotal = compareQuery.data ? readCiroMetrics(compareQuery.data).total : null;

  return (
    <div className="space-y-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-4 lg:space-y-0">
      <div className="lg:col-span-7">
        <CiroWorthCard
          total={formatMoney(metrics.total)}
          delta={priorTotal == null ? null : pctDelta(metrics.total, priorTotal)}
          points={buildCiroWorthSeries(revenue)}
          formatValue={formatMoney}
        />
      </div>
      <SparkKpiStrip
        className="lg:col-span-5 lg:grid-cols-2 xl:grid-cols-2"
        items={buildCiroSparkKpis(revenue, compareQuery.data, formatMoney)}
      />
      <div className="grid gap-3 lg:col-span-12 lg:grid-cols-2">
        <RemainSplitCard
          title="Tahsilat"
          percent={metrics.cashShare}
          center={formatMoney(metrics.paymentTotal)}
          caption="nakit payı"
          rows={[
            { name: "Nakit", value: metrics.cash, display: formatMoney(metrics.cash) },
            { name: "Kart", value: metrics.card, display: formatMoney(metrics.card) },
          ]}
        />
        <RemainSplitCard
          title="Kasada kalan"
          percent={profit.netShare}
          center={formatMoney(profit.net)}
          caption="kasada kalan"
          rows={[
            { name: "Brüt satış", value: profit.gross, display: formatMoney(profit.gross) },
            { name: "Sabit gider", value: profit.expense, display: formatMoney(profit.expense) },
            { name: "Kasada kalan", value: profit.net, display: formatMoney(profit.net) },
          ]}
        />
      </div>
      <div className={cn("grid gap-3 lg:col-span-12", hourly.length > 0 && "lg:grid-cols-2")}>
        {hourly.length > 0 ? <RetentionStepChart title="Saatlik ciro" data={hourly} /> : null}
        <PeakTrackCard
          title="Kanal"
          value={formatMoney(channels.total)}
          rows={channels.rows.map((row) => ({
            name: row.label,
            value: row.revenue,
            display: formatMoney(row.revenue),
            hint: `${row.orders.toLocaleString("tr-TR")} sipariş`,
          }))}
          accent={CHART_COLORS.c1}
        />
      </div>
      <div className="grid gap-3 lg:col-span-12 lg:grid-cols-2">
        <CategorySalesCard
          title="Kategori cirosu"
          compact={categories.compact}
          delta={categories.delta}
          slices={categories.slices}
        />
        <DualRankCard
          title="Ne çok satıldı, ne çok kazandırdı"
          leftTitle="Adet"
          rightTitle="Ciro"
          left={volume.byQuantity.map((row) => ({
            name: row.name,
            value: row.quantity.toLocaleString("tr-TR"),
            weight: row.quantity,
          }))}
          right={volume.byRevenue.map((row) => ({
            name: row.name,
            value: formatMoney(row.revenue),
            weight: row.revenue,
          }))}
          footer={volumeFooter(volume)}
        />
      </div>
    </div>
  );
}

function hourlyRevenue(revenue: MenuRevenueReportResponse): { label: string; value: number }[] {
  return activeWindow(
    fillHourlyPoints(revenue.hourly ?? []).map((point) => ({
      label: point.label,
      value: point.revenue,
    })),
  );
}

function volumeFooter(volume: ReturnType<typeof readVolumeValue>): string {
  const bits: string[] = [];
  if (volume.leastSold) {
    bits.push(`En az satan: ${volume.leastSold.name} (${volume.leastSold.quantity} adet)`);
  }
  bits.push(`Satılmayan ürün: ${volume.unsoldCount}`);
  return bits.join(" · ");
}
