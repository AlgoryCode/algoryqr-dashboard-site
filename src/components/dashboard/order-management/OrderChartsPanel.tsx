"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMenuPrice } from "@/components/menu-templates/types";
import { badgeVariants } from "@/components/ui/badge";
import {
  CHART_COMPARE_PERIODS,
  type ChartComparePeriod,
} from "@/components/ui/date-range-filter";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import type { OrderChartCompareKey, OrderChartCompareSeries } from "@/lib/order-management";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "16px",
  fontSize: "12px",
  boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
};

const SERIES_COLOR: Record<OrderChartCompareKey, string> = {
  yesterday: "#86efac",
  today: "#16a34a",
  sevenDay: "#a3e635",
  total: "#16a34a",
};

const SERIES_ORDER: OrderChartCompareKey[] = ["yesterday", "today", "sevenDay", "total"];

type OrderChartsPanelProps = {
  series: OrderChartCompareSeries;
  totalRevenue: number;
  currency: string;
  includeTips?: boolean;
  comparePeriods: ChartComparePeriod[];
  onTogglePeriod: (period: ChartComparePeriod) => void;
};

function seriesLabel(key: OrderChartCompareKey, mode: OrderChartCompareSeries["mode"]) {
  if (key === "yesterday") return "Dün";
  if (key === "today") return "Bugün";
  if (key === "sevenDay") return mode === "hour" ? "7g (ort.)" : "7g";
  return "Toplam";
}

export function OrderChartsPanel({
  series,
  totalRevenue,
  currency,
  includeTips,
  comparePeriods,
  onTogglePeriod,
}: OrderChartsPanelProps) {
  const activeKeys = SERIES_ORDER.filter((key) => series.points.some((point) => point[key] != null));
  const empty = series.points.every((point) => activeKeys.every((key) => Number(point[key] ?? 0) === 0));

  return (
    <div className={`${DASHBOARD_PANEL} flex h-full min-w-0 flex-col p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {formatMenuPrice(totalRevenue, currency) || "₺0"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Toplam kazanç · {includeTips ? "bahşiş dahil" : "toplam sipariş"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CHART_COMPARE_PERIODS.map((period) => {
            const selected = comparePeriods.includes(period.id);
            return (
              <button
                key={period.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onTogglePeriod(period.id)}
                className={cn(
                  badgeVariants({ variant: selected ? "destructive" : "outline" }),
                  "cursor-pointer",
                  selected
                    ? "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/80"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: SERIES_COLOR[period.id === "7d" ? "sevenDay" : period.id],
                  }}
                />
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {empty ? (
        <p className="py-16 text-sm text-muted-foreground">Bu aralıkta kazanç grafiği yok.</p>
      ) : (
        <div className="mt-6 h-52 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={16} />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.35)", strokeWidth: 1 }}
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  formatMenuPrice(Number(value), currency),
                  seriesLabel(name as OrderChartCompareKey, series.mode),
                ]}
              />
              {activeKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={SERIES_COLOR[key]}
                  strokeWidth={2.25}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
