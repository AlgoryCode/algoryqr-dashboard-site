"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { SMART_REPORT_CREDIT_COLOR, SmartReportRows } from "@/components/dashboard/smart-report/SmartReportList";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SlidingTabSelect } from "@/components/ui/sliding-tab-select";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  getSmartReportUsageRequest,
  SMART_REPORT_CREDIT_LABEL,
  smartReportCreditSource,
  type SmartReportCreditSource,
  type SmartReportUsageDays,
} from "@/lib/smart-report";
import { cn } from "@/lib/utils";

// Validated categorical palette (light + dark): teal, violet, orange — fixed per credit type.
const CHART_CONFIG = {
  free: { label: SMART_REPORT_CREDIT_LABEL.FREE, color: SMART_REPORT_CREDIT_COLOR.FREE },
  bonus: { label: SMART_REPORT_CREDIT_LABEL.BONUS, color: SMART_REPORT_CREDIT_COLOR.BONUS },
  paid: { label: SMART_REPORT_CREDIT_LABEL.PAID, color: SMART_REPORT_CREDIT_COLOR.PAID },
} satisfies ChartConfig;

const SERIES: { key: keyof typeof CHART_CONFIG; source: SmartReportCreditSource }[] = [
  { key: "free", source: "FREE" },
  { key: "bonus", source: "BONUS" },
  { key: "paid", source: "PAID" },
];

const RANGE_ITEMS = [
  { value: "7", label: "7 gün" },
  { value: "30", label: "30 gün" },
];

function dayLabel(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return days === 7
    ? date.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" })
    : date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/** Reports created in the last 7 or 30 days, split by the credit that paid for them, with the matching report list. */
export function SmartReportUsageCard() {
  const [days, setDays] = useState<SmartReportUsageDays>(7);
  const [filter, setFilter] = useState<SmartReportCreditSource | null>(null);

  const usageQuery = useQuery({
    queryKey: ["smart-reports", "usage", days],
    queryFn: () => getSmartReportUsageRequest(days),
  });
  const usage = usageQuery.data;

  const chartData = useMemo(
    () => (usage?.daily ?? []).map((day) => ({ ...day, label: dayLabel(day.date, days) })),
    [usage, days],
  );
  const items = useMemo(
    () => (usage?.items ?? []).filter((item) => !filter || smartReportCreditSource(item) === filter),
    [usage, filter],
  );
  // Only the topmost non-zero segment of each day gets rounded corners.
  const topKeyByDay = useMemo(
    () =>
      chartData.map((day) => [...SERIES].reverse().find((series) => day[series.key] > 0)?.key ?? null),
    [chartData],
  );

  const totals = usage?.totals;

  return (
    <section className={cn(DASHBOARD_SURFACE, "overflow-hidden")} aria-labelledby="smart-report-usage-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id="smart-report-usage-title" className="text-sm font-semibold text-foreground">
            Rapor hakkı kullanımı
          </h2>
          <p className="text-xs text-muted-foreground">
            Her hafta 1 ücretsiz rapor; geri bildirim verirseniz o hafta 1 rapor daha.
          </p>
        </div>
        <SlidingTabSelect
          variant="soft"
          ariaLabel="Kullanım dönemi"
          value={String(days)}
          onValueChange={(next) => {
            setDays(Number(next) as SmartReportUsageDays);
            setFilter(null);
          }}
          items={RANGE_ITEMS}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4" role="group" aria-label="Hak türüne göre filtrele">
        <button
          type="button"
          aria-pressed={filter === null}
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === null ? "bg-muted" : "hover:bg-muted/50",
          )}
        >
          <span className="block text-xs text-muted-foreground">Toplam</span>
          <span className="block text-xl font-semibold tabular-nums text-foreground">{totals?.total ?? "–"}</span>
        </button>
        {SERIES.map((series) => (
          <button
            key={series.key}
            type="button"
            aria-pressed={filter === series.source}
            onClick={() => setFilter(filter === series.source ? null : series.source)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === series.source ? "bg-muted" : "hover:bg-muted/50",
            )}
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: CHART_CONFIG[series.key].color }} />
              {CHART_CONFIG[series.key].label}
            </span>
            <span className="block text-xl font-semibold tabular-nums text-foreground">
              {totals ? totals[series.key] : "–"}
            </span>
          </button>
        ))}
      </div>

      <div className="px-2 pb-2 pt-3 sm:px-4">
        {usageQuery.isLoading ? (
          <div className="h-[220px] animate-pulse rounded-xl bg-muted/60" />
        ) : usageQuery.isError ? (
          <p className="py-10 text-center text-sm text-destructive">Kullanım verisi yüklenemedi.</p>
        ) : (
          <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[220px] w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 6" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={days === 30 ? 16 : 4}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltipContent />} />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  stackId="credits"
                  fill={`var(--color-${series.key})`}
                  maxBarSize={days === 7 ? 36 : 16}
                  hide={filter !== null && filter !== series.source}
                  shape={(props: unknown) => {
                    const { x, width, fill, index } = props as {
                      x: number;
                      y: number;
                      width: number;
                      height: number;
                      fill: string;
                      index: number;
                    };
                    let { y, height } = props as { y: number; height: number };
                    if (!height || height <= 0) return <g />;
                    const top = filter !== null || topKeyByDay[index] === series.key;
                    // 2px gap above a segment that has another segment stacked on it.
                    const gap = top ? 0 : Math.min(2, height / 2);
                    y += gap;
                    height -= gap;
                    const r = top ? Math.min(4, width / 2, height) : 0;
                    return (
                      <path
                        fill={fill}
                        d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
                      />
                    );
                  }}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="border-t border-border">
        <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">
          {filter ? `${SMART_REPORT_CREDIT_LABEL[filter]} hakla oluşturulan raporlar` : "Bu dönemde oluşturulan raporlar"}
        </p>
        <SmartReportRows
          items={items}
          isLoading={usageQuery.isLoading}
          isError={usageQuery.isError}
          emptyText={filter ? "Bu hak türüyle oluşturulmuş rapor yok." : "Bu dönemde rapor oluşturulmadı."}
          showCredit
        />
      </div>
    </section>
  );
}
