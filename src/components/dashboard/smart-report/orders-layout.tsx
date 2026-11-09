"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Clock, Layers, Radio } from "lucide-react";

import {
  DetailBarList,
  InsightStrip,
  RankedListCard,
  ReportDetailSheet,
  ReportSection,
  formatPercent,
  hourRangeLabel,
  type ReportInsight,
} from "@/components/dashboard/reports/ReportData";
import { REPORT_CARD, ResponsiveSheet } from "@/components/dashboard/reports/ReportShell";
import type { MenuRevenueReportResponse } from "@/lib/api";
import { buildRevenueReportView } from "@/reporting";
import { toAmount } from "@/reporting/numbers";
import { cn } from "@/lib/utils";

import { CHART_COLORS, dayLabel, money } from "./chart-config";
import { HighlightBarChart } from "./charts/HighlightBarChart";
import { SharePieChart } from "./charts/SharePieChart";
import { StackedBarChart } from "./charts/StackedBarChart";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { RetentionStepChart } from "./charts/ZentraOverview";
import { ReportEmpty } from "./ReportChartCard";
import { readCiroMetrics } from "./ciro-metrics";
import {
  RevenueDetailSheets,
  channelRankedRows,
  readChannelStats,
  type RevenueDetailSelection,
} from "./revenue-details";
import type { SparkKpi } from "./shadcn-spark";

type DayRow = { date: string; label: string; weekday: string; orders: number; revenue: number; aov: number };
type DaySort = "date" | "orders" | "revenue";

const DAY_PREVIEW = 7;

function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { weekday: "long" });
}

export function OrdersPage({ revenue }: { revenue: MenuRevenueReportResponse }) {
  const metrics = readCiroMetrics(revenue);
  const view = buildRevenueReportView(revenue);
  const formatMoney = (value: number) => money(value, metrics.currency);

  const [detail, setDetail] = useState<RevenueDetailSelection>(null);
  const [dayDetail, setDayDetail] = useState<DayRow | null>(null);
  const [daysOpen, setDaysOpen] = useState(false);
  const [daySort, setDaySort] = useState<DaySort>("date");

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
        value: money(metrics.aov, metrics.currency),
        delta: null,
        icon: "wallet",
        series: view.daily.map((row) => (row.orderCount > 0 ? row.revenue / row.orderCount : 0)),
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
  }, [itemsPerOrder, metrics.aov, metrics.currency, metrics.items, metrics.orders, view.daily, view.hourly]);

  const dayRows = useMemo((): DayRow[] => {
    return (revenue.daily ?? []).map((point) => {
      const orders = point.orderCount ?? 0;
      const amount = toAmount(point.revenue);
      return {
        date: point.date,
        label: dayLabel(point.date),
        weekday: weekdayLabel(point.date),
        orders,
        revenue: amount,
        aov: orders > 0 ? amount / orders : 0,
      };
    });
  }, [revenue.daily]);

  const sortedDays = useMemo(() => {
    const rows = [...dayRows];
    if (daySort === "orders") return rows.sort((a, b) => b.orders - a.orders);
    if (daySort === "revenue") return rows.sort((a, b) => b.revenue - a.revenue);
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [dayRows, daySort]);

  const dailyOrderTrend = useMemo(
    () => view.daily.map((row) => ({ label: row.dateLabel, value: row.orderCount })),
    [view.daily],
  );
  const hourlyOrderTrend = useMemo(
    () => view.hourly.map((row) => ({ label: row.hour, value: row.orderCount })),
    [view.hourly],
  );

  const channels = useMemo(() => readChannelStats(revenue), [revenue]);
  const channelOrderRows = useMemo(
    () => ({
      orders: channelRankedRows(revenue, formatMoney, "orders"),
      revenue: channelRankedRows(revenue, formatMoney, "revenue"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revenue, metrics.currency],
  );

  const channelDailyOrders = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const point of revenue.channelDaily ?? []) {
      const row = map.get(point.date) ?? { label: dayLabel(point.date) };
      row[point.channelCode] = point.orderCount ?? 0;
      map.set(point.date, row);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value);
  }, [revenue.channelDaily]);
  const channelCodes = [...new Set((revenue.channelDaily ?? []).map((p) => p.channelCode))];

  const insights = useMemo((): ReportInsight[] => {
    const busiestDay = [...dayRows].sort((a, b) => b.orders - a.orders)[0];
    const peakHour = [...(revenue.hourly ?? [])].sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))[0];
    const leader = [...channels].filter((row) => row.orders > 0).sort((a, b) => b.orders - a.orders)[0];
    const totalOrders = channels.reduce((sum, row) => sum + row.orders, 0);
    return [
      {
        icon: CalendarDays,
        label: "En yoğun gün",
        value: busiestDay && busiestDay.orders > 0 ? `${busiestDay.label} ${busiestDay.weekday}` : "",
        hint: busiestDay ? `${busiestDay.orders.toLocaleString("tr-TR")} sipariş` : undefined,
        onClick: busiestDay ? () => setDayDetail(busiestDay) : undefined,
      },
      {
        icon: Clock,
        label: "En yoğun saat",
        value: peakHour && (peakHour.orderCount ?? 0) > 0 ? hourRangeLabel(peakHour.hour) : "",
        hint: peakHour ? `${(peakHour.orderCount ?? 0).toLocaleString("tr-TR")} sipariş` : undefined,
      },
      {
        icon: Radio,
        label: "En çok sipariş gelen kanal",
        value: leader?.name ?? "",
        hint: leader ? formatPercent(totalOrders > 0 ? (leader.orders / totalOrders) * 100 : 0) : undefined,
        onClick: leader ? () => setDetail({ kind: "channel", key: leader.key }) : undefined,
      },
      {
        icon: Layers,
        label: "Sipariş başına kalem",
        value: metrics.orders > 0 ? `${itemsPerOrder.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kalem` : "",
        hint: metrics.orders > 0 ? `Ort. sepet ${money(metrics.aov, metrics.currency)}` : undefined,
      },
    ];
  }, [channels, dayRows, itemsPerOrder, metrics.aov, metrics.currency, metrics.orders, revenue.hourly]);

  const dayChannelRows = useMemo(() => {
    if (!dayDetail) return [];
    const labels = new Map(channels.map((row) => [row.key, row.name]));
    return (revenue.channelDaily ?? [])
      .filter((point) => point.date === dayDetail.date && ((point.orderCount ?? 0) > 0 || toAmount(point.revenue) > 0))
      .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))
      .map((point) => ({
        key: point.channelCode,
        label: labels.get(point.channelCode) ?? point.channelCode,
        value: point.orderCount ?? 0,
        display: `${(point.orderCount ?? 0).toLocaleString("tr-TR")} · ${money(toAmount(point.revenue), metrics.currency)}`,
      }));
  }, [channels, dayDetail, metrics.currency, revenue.channelDaily]);

  const hasOrders =
    metrics.orders > 0 || channels.some((row) => row.orders > 0) || dailyOrderTrend.some((row) => row.value > 0);

  if (!hasOrders && view.empty) {
    return <ReportEmpty text="Seçilen dönemde sipariş kaydı yok. Kapalı adisyonlar burada görünür." />;
  }

  const hasHourly = hourlyOrderTrend.some((row) => row.value > 0);
  const peakDayOrders = Math.max(1, ...dayRows.map((row) => row.orders));

  const dayTable = (rows: DayRow[], onRow: (row: DayRow) => void) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="py-2 pr-2 font-medium">Tarih</th>
          <th className="px-2 py-2 text-right font-medium">Sipariş</th>
          <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Ciro</th>
          <th className="px-2 py-2 text-right font-medium">Ort. sepet</th>
          <th className="w-6 py-2" aria-hidden />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.date}
            tabIndex={0}
            onClick={() => onRow(row)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRow(row);
              }
            }}
            aria-label={`${row.label} detayını aç`}
            className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
          >
            <td className="py-2 pr-2">
              <span className="block font-medium text-foreground">{row.label}</span>
              <span className="block text-[11px] capitalize text-muted-foreground">{row.weekday}</span>
            </td>
            <td className="px-2 py-2 text-right">
              <span className="block tabular-nums text-foreground">{row.orders.toLocaleString("tr-TR")}</span>
              <span className="ml-auto mt-1 block h-1 w-16 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary/70"
                  style={{ width: `${row.orders > 0 ? Math.max(4, (row.orders / peakDayOrders) * 100) : 0}%` }}
                />
              </span>
            </td>
            <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{formatMoney(row.revenue)}</td>
            <td className="px-2 py-2 text-right tabular-nums">{row.orders > 0 ? formatMoney(row.aov) : "—"}</td>
            <td className="py-2 text-right text-muted-foreground">
              <ChevronRight className="ml-auto h-4 w-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const daySortControl = (
    <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Gün sıralama">
      {(
        [
          { key: "date", label: "Tarih" },
          { key: "orders", label: "Sipariş" },
          { key: "revenue", label: "Ciro" },
        ] as const
      ).map((sort) => (
        <button
          key={sort.key}
          type="button"
          role="radio"
          aria-checked={daySort === sort.key}
          onClick={() => setDaySort(sort.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            daySort === sort.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {sort.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <ReportSection title="Genel bakış" description="Sipariş hacmi ve sepet büyüklüğü">
        <SparkKpiStrip items={kpiItems} />
        <InsightStrip items={insights} />
      </ReportSection>

      {dailyOrderTrend.length > 0 || hasHourly ? (
        <ReportSection title="Zaman" description="Hangi gün ve saatte sipariş yoğunlaşıyor">
          <div className={cn("grid gap-3", dailyOrderTrend.length > 0 && hasHourly && "lg:grid-cols-2")}>
            {dailyOrderTrend.length > 0 ? (
              <HighlightBarChart
                title="Günlük sipariş"
                description="Dönem içindeki adisyon sayısı"
                value={metrics.orders.toLocaleString("tr-TR")}
                data={dailyOrderTrend}
              />
            ) : null}
            {hasHourly ? (
              <RetentionStepChart
                title="Saatlik sipariş yoğunluğu"
                data={hourlyOrderTrend.map((row) => ({ label: row.label, value: row.value }))}
              />
            ) : null}
          </div>
        </ReportSection>
      ) : null}

      {channels.length > 0 ? (
        <ReportSection title="Kanal" description="Siparişlerin hangi kanaldan geldiği">
          <div className="grid gap-3 lg:grid-cols-2">
            <SharePieChart
              title="Kanal bazlı sipariş payı"
              center={metrics.orders.toLocaleString("tr-TR")}
              data={channels.map((row, index) => ({
                name: row.name,
                value: row.orders,
                color: `hsl(var(--chart-${(index % 5) + 1}))`,
              }))}
              formatValue={(value) => `${value.toLocaleString("tr-TR")} sipariş`}
            />
            <RankedListCard
              title="Kanallar"
              description="Detay için kanala dokunun"
              icon={Radio}
              rows={channelOrderRows.orders}
              rowsBySort={channelOrderRows}
              sorts={[
                { key: "orders", label: "Sipariş" },
                { key: "revenue", label: "Ciro" },
              ]}
              limit={5}
              accent={CHART_COLORS.c3}
              onRowClick={(row) => setDetail({ kind: "channel", key: row.key })}
            />
          </div>
          {channelDailyOrders.length > 0 && channelCodes.length > 0 ? (
            <StackedBarChart
              title="Günlük kanal siparişleri"
              data={channelDailyOrders}
              series={channelCodes.map((code, index) => ({
                key: code,
                label: channels.find((row) => row.key === code)?.name ?? code,
                color: `hsl(var(--chart-${(index % 5) + 1}))`,
              }))}
            />
          ) : null}
        </ReportSection>
      ) : null}

      {dayRows.length > 0 ? (
        <ReportSection
          title="Günlük döküm"
          description="Detay için güne dokunun"
          action={dayRows.length > DAY_PREVIEW ? daySortControl : undefined}
        >
          <div className={cn(REPORT_CARD, "px-4 py-2")}>
            {dayTable(sortedDays.slice(0, DAY_PREVIEW), setDayDetail)}
            {dayRows.length > DAY_PREVIEW ? (
              <div className="flex justify-end border-t border-border/60 py-2">
                <button
                  type="button"
                  onClick={() => setDaysOpen(true)}
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Tüm günleri gör ({dayRows.length.toLocaleString("tr-TR")})
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </ReportSection>
      ) : null}

      <ResponsiveSheet
        open={daysOpen}
        onOpenChange={setDaysOpen}
        icon={CalendarDays}
        title="Günlük sipariş dökümü"
        description={`${dayRows.length.toLocaleString("tr-TR")} gün`}
      >
        <div className="space-y-3">
          <div className="flex justify-end">{daySortControl}</div>
          {dayTable(sortedDays, (row) => {
            setDaysOpen(false);
            setDayDetail(row);
          })}
        </div>
      </ResponsiveSheet>

      <ReportDetailSheet
        open={dayDetail != null}
        onClose={() => setDayDetail(null)}
        icon={CalendarDays}
        title={dayDetail ? `${dayDetail.label} ${dayDetail.weekday}` : "Gün"}
        description="Günün sipariş özeti"
        metrics={
          dayDetail
            ? [
                { label: "Sipariş", value: dayDetail.orders.toLocaleString("tr-TR"), accent: true },
                { label: "Ciro", value: formatMoney(dayDetail.revenue), accent: true },
                { label: "Ort. sepet", value: dayDetail.orders > 0 ? formatMoney(dayDetail.aov) : "—" },
                {
                  label: "Dönem payı",
                  value: formatPercent(metrics.orders > 0 ? (dayDetail.orders / metrics.orders) * 100 : 0, 1),
                },
              ]
            : []
        }
      >
        <DetailBarList
          title="Kanallara göre sipariş · ciro"
          rows={dayChannelRows}
          emptyText="Bu gün için kanal kırılımı yok."
        />
      </ReportDetailSheet>

      <RevenueDetailSheets
        revenue={revenue}
        formatMoney={formatMoney}
        selection={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
