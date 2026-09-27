"use client";

import { useMemo } from "react";

import type { MenuRevenueReportResponse } from "@/lib/api";
import { buildRevenueReportView } from "@/reporting";

import { CHART_COLORS, dayLabel, money } from "./chart-config";
import { HighlightBarChart } from "./charts/HighlightBarChart";
import { SharePieChart } from "./charts/SharePieChart";
import { StackedBarChart } from "./charts/StackedBarChart";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { PeakTrackCard } from "./charts/NestedRingCard";
import { RetentionStepChart } from "./charts/ZentraOverview";
import { ReportEmpty } from "./ReportChartCard";
import { readChannelMix, readCiroMetrics } from "./ciro-metrics";
import type { SparkKpi } from "./shadcn-spark";

export function OrdersPage({ revenue }: { revenue: MenuRevenueReportResponse }) {
  const metrics = readCiroMetrics(revenue);
  const view = buildRevenueReportView(revenue);
  const channels = readChannelMix(revenue, metrics);
  const formatMoney = (value: number) => money(value, metrics.currency);

  const itemsPerOrder =
    metrics.orders > 0 ? Math.round((metrics.items / metrics.orders) * 10) / 10 : 0;

  const kpiItems = useMemo((): SparkKpi[] => {
    const dailyOrders = view.daily.map((row) => row.orderCount);
    const hourlyOrders = view.hourly.map((row) => row.orderCount);
    return [
      {
        title: "Toplam sipariş",
        value: metrics.orders.toLocaleString("tr-TR"),
        delta: null,
        icon: "repeat",
        series: dailyOrders.length > 0 ? dailyOrders : hourlyOrders,
      },
      {
        title: "Ort. sepet",
        value: formatMoney(metrics.aov),
        delta: null,
        icon: "wallet",
        series: view.daily.map((row) =>
          row.orderCount > 0 ? row.revenue / row.orderCount : 0,
        ),
      },
      {
        title: "Satılan kalem",
        value: metrics.items.toLocaleString("tr-TR"),
        delta: null,
        icon: "users",
        series: view.daily.map((row) => row.orderCount),
      },
      {
        title: "Kalem / sipariş",
        value: itemsPerOrder.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
        delta: null,
        icon: "userPlus",
        series: dailyOrders.length > 0 ? dailyOrders : hourlyOrders,
      },
    ];
  }, [formatMoney, itemsPerOrder, metrics.aov, metrics.items, metrics.orders, view.daily, view.hourly]);

  const dailyOrderTrend = useMemo(
    () =>
      view.daily.map((row) => ({
        label: row.dateLabel,
        value: row.orderCount,
      })),
    [view.daily],
  );

  const hourlyOrderTrend = useMemo(
    () =>
      view.hourly.map((row) => ({
        label: row.hour,
        value: row.orderCount,
      })),
    [view.hourly],
  );

  const channelOrderRows = useMemo(() => {
    const totalOrders = channels.rows.reduce((sum, row) => sum + row.orders, 0) || 1;
    return channels.rows
      .filter((row) => row.orders > 0 || row.connected)
      .map((row) => ({
        ...row,
        share: Math.round((row.orders / totalOrders) * 100),
        aov: row.orders > 0 ? row.revenue / row.orders : 0,
      }));
  }, [channels.rows]);

  const channelDailyOrders = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const point of revenue.channelDaily ?? []) {
      const row = map.get(point.date) ?? { label: dayLabel(point.date) };
      row[point.channelCode] = point.orderCount ?? 0;
      map.set(point.date, row);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }, [revenue.channelDaily]);

  const channelCodes = [...new Set((revenue.channelDaily ?? []).map((p) => p.channelCode))];

  const hasOrders =
    metrics.orders > 0 ||
    channelOrderRows.some((row) => row.orders > 0) ||
    dailyOrderTrend.some((row) => row.value > 0);

  if (!hasOrders && view.empty) {
    return (
      <ReportEmpty text="Seçilen dönemde sipariş kaydı yok. Kapalı adisyonlar burada görünür." />
    );
  }

  return (
    <div className="space-y-3">
      <SparkKpiStrip items={kpiItems} />

      {dailyOrderTrend.length > 0 ? (
        <HighlightBarChart
          title="Günlük sipariş"
          description="Dönem içindeki adisyon sayısı"
          value={metrics.orders.toLocaleString("tr-TR")}
          data={dailyOrderTrend}
        />
      ) : null}

      {hourlyOrderTrend.some((row) => row.value > 0) ? (
        <RetentionStepChart
          title="Saatlik sipariş yoğunluğu"
          data={hourlyOrderTrend.map((row) => ({ label: row.label, value: row.value }))}
        />
      ) : null}

      {channelOrderRows.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <SharePieChart
            title="Kanal bazlı sipariş payı"
            center={metrics.orders.toLocaleString("tr-TR")}
            data={channelOrderRows.map((row, index) => ({
              name: row.label,
              value: row.orders,
              color: `hsl(var(--chart-${(index % 5) + 1}))`,
            }))}
            formatValue={(value) => `${value.toLocaleString("tr-TR")} sipariş`}
          />
          <StackedBarChart
            title="Kanal siparişleri"
            description="Sipariş adedi ve ortalama sepet"
            stacked={false}
            data={channelOrderRows.map((row) => ({
              label: row.label,
              orders: row.orders,
              aov: Math.round(row.aov),
            }))}
            series={[
              { key: "orders", label: "Sipariş", color: CHART_COLORS.c1 },
              { key: "aov", label: "Ort. sepet (₺)", color: CHART_COLORS.c2 },
            ]}
          />
        </div>
      ) : null}

      {channelOrderRows.length > 0 ? (
        <PeakTrackCard
          title="Kanal özeti"
          value={`${metrics.orders.toLocaleString("tr-TR")} sipariş`}
          rows={channelOrderRows.map((row) => ({
            name: row.label,
            value: row.orders,
            display: `${row.orders.toLocaleString("tr-TR")} sipariş`,
            hint: `Ort. ${formatMoney(row.aov)} · %${row.share}`,
          }))}
          accent={CHART_COLORS.c3}
        />
      ) : null}

      {channelDailyOrders.length > 0 && channelCodes.length > 0 ? (
        <StackedBarChart
          title="Günlük kanal siparişleri"
          data={channelDailyOrders}
          series={channelCodes.map((code, index) => ({
            key: code,
            label: channelOrderRows.find((row) => row.code === code)?.label ?? code,
            color: `hsl(var(--chart-${(index % 5) + 1}))`,
          }))}
        />
      ) : null}

      {view.daily.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Günlük sipariş tablosu</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Tarih</th>
                <th className="px-4 py-2 font-medium text-right">Sipariş</th>
                <th className="px-4 py-2 font-medium text-right">Ciro</th>
                <th className="px-4 py-2 font-medium text-right">Ort. sepet</th>
              </tr>
            </thead>
            <tbody>
              {view.daily.map((row) => (
                <tr key={row.dateLabel} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2">{row.dateLabel}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.orderCount.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(row.revenue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.orderCount > 0 ? formatMoney(row.revenue / row.orderCount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
