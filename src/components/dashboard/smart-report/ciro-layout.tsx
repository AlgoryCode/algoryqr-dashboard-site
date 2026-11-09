"use client";

import { useMemo, useState } from "react";
import { Clock, Crown, Layers, Package, Radio, ShoppingBag } from "lucide-react";

import {
  InsightStrip,
  RankedListCard,
  ReportSection,
  formatPercent,
  hourRangeLabel,
  type ReportInsight,
} from "@/components/dashboard/reports/ReportData";
import type { MenuRevenueReportResponse } from "@/lib/api";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { comparePeriodRange } from "@/reporting";
import { toAmount } from "@/reporting/numbers";

import { cn } from "@/lib/utils";

import { activeWindow, CHART_COLORS, pctDelta } from "./chart-config";
import { CategorySalesCard } from "./charts/CategorySalesCard";
import { CiroWorthCard } from "./charts/CiroWorthCard";
import { RemainSplitCard } from "./charts/RemainSplitCard";
import { RetentionStepChart } from "./charts/ZentraOverview";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { fillHourlyPoints, readCiroMetrics, readProfitMix, readVolumeValue } from "./ciro-metrics";
import {
  RevenueDetailSheets,
  categoryRankedRows,
  channelRankedRows,
  productRankedRowsByMode,
  readChannelStats,
  readProductStats,
  type RevenueDetailSelection,
} from "./revenue-details";
import { buildCiroWorthSeries } from "./shadcn-charts";
import { buildCategorySales, buildCiroSparkKpis } from "./shadcn-spark";

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
  const profit = readProfitMix(revenue, metrics);
  const categories = buildCategorySales(revenue, compareQuery.data, formatMoney);
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

  const insights = useMemo((): ReportInsight[] => {
    const products = readProductStats(revenue);
    const topRevenue = [...products].sort((a, b) => b.revenue - a.revenue)[0];
    const topQuantity = [...products].sort((a, b) => b.quantity - a.quantity)[0];
    const channels = readChannelStats(revenue).filter((row) => row.revenue > 0);
    const leader = [...channels].sort((a, b) => b.revenue - a.revenue)[0];
    const peakHour = [...(revenue.hourly ?? [])].sort((a, b) => toAmount(b.revenue) - toAmount(a.revenue))[0];
    return [
      {
        icon: Crown,
        label: "En çok kazandıran",
        value: topRevenue?.name ?? "",
        hint: topRevenue ? formatMoney(topRevenue.revenue) : undefined,
        onClick: topRevenue ? () => setDetail({ kind: "product", key: topRevenue.key }) : undefined,
      },
      {
        icon: ShoppingBag,
        label: "En çok satan",
        value: topQuantity?.name ?? "",
        hint: topQuantity ? `${topQuantity.quantity.toLocaleString("tr-TR")} adet` : undefined,
        onClick: topQuantity ? () => setDetail({ kind: "product", key: topQuantity.key }) : undefined,
      },
      {
        icon: Clock,
        label: "En yoğun saat",
        value: peakHour && toAmount(peakHour.revenue) > 0 ? hourRangeLabel(peakHour.hour) : "",
        hint: peakHour ? formatMoney(toAmount(peakHour.revenue)) : undefined,
      },
      {
        icon: Radio,
        label: "Lider kanal",
        value: leader?.name ?? "",
        hint: leader ? `${formatPercent(leader.share)} ciro payı` : undefined,
        onClick: leader ? () => setDetail({ kind: "channel", key: leader.key }) : undefined,
      },
    ];
  }, [formatMoney, revenue]);

  const priorTotal = compareQuery.data ? readCiroMetrics(compareQuery.data).total : null;

  return (
    <div className="space-y-6">
      <ReportSection title="Genel bakış" description="Dönem cirosu ve önceki eşit dönemle karşılaştırma">
        <div className="space-y-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-4 lg:space-y-0">
          <div className="lg:col-span-7">
            <CiroWorthCard
              total={formatMoney(metrics.total)}
              delta={priorTotal == null ? null : pctDelta(metrics.total, priorTotal)}
              points={buildCiroWorthSeries(revenue)}
              formatValue={formatMoney}
              split={{ cash: metrics.cash, card: metrics.card }}
            />
          </div>
          <SparkKpiStrip
            className="lg:col-span-5 lg:grid-cols-2 xl:grid-cols-2"
            items={buildCiroSparkKpis(revenue, compareQuery.data, formatMoney)}
          />
        </div>
        <InsightStrip items={insights} />
      </ReportSection>

      <ReportSection title="Tahsilat ve kâr" description="Ödeme dağılımı ve sabit giderler sonrası kalan">
        <div className="grid gap-3 lg:grid-cols-2">
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
          <div className="space-y-3">
            <CategorySalesCard
              title="Kategori cirosu"
              compact={categories.compact}
              delta={categories.delta}
              slices={categories.slices}
            />
            <RankedListCard
              title="Kategoriler"
              icon={Layers}
              rows={categoryRows}
              sorts={[
                { key: "revenue", label: "Ciro" },
                { key: "quantity", label: "Adet" },
              ]}
              limit={4}
              accent={CHART_COLORS.c3}
              emptyText="Bu dönemde kategori satışı yok."
              searchPlaceholder="Kategori ara…"
              onRowClick={(row) => setDetail({ kind: "category", key: row.key })}
            />
          </div>
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
