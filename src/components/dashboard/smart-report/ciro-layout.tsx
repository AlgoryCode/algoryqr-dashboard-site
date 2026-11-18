"use client";

import { useMemo, useState } from "react";
import { Layers, Package, Radio } from "lucide-react";

import { RankedListCard, ReportSection } from "@/components/dashboard/reports/ReportData";
import type { MenuRevenueReportResponse } from "@/lib/api";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { comparePeriodRange } from "@/reporting";

import { cn } from "@/lib/utils";

import { activeWindow, CHART_COLORS, pctDelta } from "./chart-config";
import { buildBalanceSummary } from "./balance-series";
import { BalanceAreaCard } from "./charts/BalanceAreaCard";
import { CiroWorthCard } from "./charts/CiroWorthCard";
import { RetentionStepChart } from "./charts/ZentraOverview";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { fillHourlyPoints, readCiroMetrics, readVolumeValue } from "./ciro-metrics";
import {
  RevenueDetailSheets,
  categoryRankedRows,
  channelRankedRows,
  productRankedRowsByMode,
  type RevenueDetailSelection,
} from "./revenue-details";
import { buildCiroWorthSeries } from "./shadcn-charts";
import { buildCiroSparkKpis } from "./shadcn-spark";

export function CiroPage({
  revenue,
  money: formatMoney,
}: {
  revenue: MenuRevenueReportResponse;
  money: (value: number) => string;
}) {
  const [detail, setDetail] = useState<RevenueDetailSelection>(null);

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
  const volume = readVolumeValue(revenue);
  const balance = buildBalanceSummary(revenue);
  const priorBalance = compareQuery.data ? buildBalanceSummary(compareQuery.data) : null;
  const hourly = hourlyRevenue(revenue);

  const productRows = useMemo(() => productRankedRowsByMode(revenue, formatMoney), [formatMoney, revenue]);
  const categoryRows = useMemo(() => categoryRankedRows(revenue, formatMoney), [formatMoney, revenue]);
  const channelRows = useMemo(
    () => ({
      revenue: channelRankedRows(revenue, formatMoney, "revenue"),
      orders: channelRankedRows(revenue, formatMoney, "orders"),
    }),
    [formatMoney, revenue],
  );

  const priorTotal = compareQuery.data ? readCiroMetrics(compareQuery.data).total : null;

  return (
    <div className="space-y-6">
      <ReportSection title="Genel bakış" description="Dönem cirosu ve önceki eşit dönemle karşılaştırma">
        <div className="space-y-3 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-4 lg:space-y-0">
          <div className={metrics.orders > 0 ? "lg:col-span-7" : "lg:col-span-12"}>
            <CiroWorthCard
              total={formatMoney(metrics.total)}
              delta={priorTotal == null ? null : pctDelta(metrics.total, priorTotal)}
              points={buildCiroWorthSeries(revenue)}
              formatValue={formatMoney}
              split={{ cash: metrics.cash, card: metrics.card }}
            />
          </div>
          {metrics.orders > 0 ? (
            <SparkKpiStrip
              spark="fade"
              className="sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 xl:grid-cols-1"
              items={buildCiroSparkKpis(revenue, compareQuery.data, formatMoney)}
            />
          ) : null}
        </div>
      </ReportSection>

      <ReportSection title="Kârlılık" description="Biriken gelirin sabit giderleri ne zaman karşıladığı">
        <BalanceAreaCard
          summary={balance}
          delta={priorBalance && priorBalance.expense > 0 ? pctDelta(balance.net, priorBalance.net) : null}
          formatValue={formatMoney}
        />
      </ReportSection>

      <ReportSection title="Zaman ve kanal" description="Gün içi yoğunluk ve satış kanallarının payı">
        <div className={cn("grid gap-3", hourly.length > 0 && "lg:grid-cols-2")}>
          {hourly.length > 0 ? <RetentionStepChart title="Saatlik ciro" data={hourly} /> : null}
          <RankedListCard
            title="Kanallar"
            description="Detay için kanala dokunun"
            icon={Radio}
            rows={channelRows.revenue}
            rowsBySort={channelRows}
            sorts={[
              { key: "revenue", label: "Ciro" },
              { key: "orders", label: "Sipariş" },
            ]}
            limit={5}
            accent={CHART_COLORS.c1}
            emptyText="Bu dönemde kanal satışı yok."
            onRowClick={(row) => setDetail({ kind: "channel", key: row.key })}
          />
        </div>
      </ReportSection>

      <ReportSection title="Ürün ve kategori" description="Neyin çok satıldığı, neyin çok kazandırdığı">
        <div className="grid gap-3 lg:grid-cols-2">
          <RankedListCard
            title="Ürünler"
            description="Detay için ürüne dokunun"
            icon={Package}
            rows={productRows.byRevenue}
            rowsBySort={{ revenue: productRows.byRevenue, quantity: productRows.byQuantity }}
            sorts={[
              { key: "revenue", label: "Ciro" },
              { key: "quantity", label: "Adet" },
            ]}
            limit={6}
            accent={CHART_COLORS.c2}
            emptyText="Bu dönemde ürün satışı yok."
            searchPlaceholder="Ürün ara…"
            footer={volumeFooter(volume)}
            onRowClick={(row) => setDetail({ kind: "product", key: row.key })}
          />
            <RankedListCard
              title="Kategoriler"
              icon={Layers}
              rows={categoryRows}
              sorts={[
                { key: "revenue", label: "Ciro" },
                { key: "quantity", label: "Adet" },
              ]}
              limit={6}
              accent={CHART_COLORS.c3}
              emptyText="Bu dönemde kategori satışı yok."
              searchPlaceholder="Kategori ara…"
              onRowClick={(row) => setDetail({ kind: "category", key: row.key })}
            />
        </div>
      </ReportSection>

      <RevenueDetailSheets
        revenue={revenue}
        formatMoney={formatMoney}
        selection={detail}
        onClose={() => setDetail(null)}
      />
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
