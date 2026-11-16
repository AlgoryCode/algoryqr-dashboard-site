"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Label, Pie, PieChart } from "recharts";

import { SMART_REPORT_CREDIT_COLOR } from "@/components/dashboard/smart-report/SmartReportList";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getSmartReportUsageRequest, SMART_REPORT_CREDIT_LABEL } from "@/lib/smart-report";

const DAYS = 30;

const CHART_CONFIG = {
  free: { label: SMART_REPORT_CREDIT_LABEL.FREE, color: SMART_REPORT_CREDIT_COLOR.FREE },
  bonus: { label: SMART_REPORT_CREDIT_LABEL.BONUS, color: SMART_REPORT_CREDIT_COLOR.BONUS },
  paid: { label: SMART_REPORT_CREDIT_LABEL.PAID, color: SMART_REPORT_CREDIT_COLOR.PAID },
} satisfies ChartConfig;

const KEYS = ["free", "bonus", "paid"] as const;

/** Donut of reports created in the last 30 days, split by the credit that paid for them. */
export function SmartReportCreditDonut() {
  // Same key as the usage card's 30-day range, so both share one request.
  const usageQuery = useQuery({
    queryKey: ["smart-reports", "usage", DAYS],
    queryFn: () => getSmartReportUsageRequest(DAYS),
  });
  const totals = usageQuery.data?.totals;

  if (usageQuery.isLoading) {
    return <div className="mx-auto size-[148px] animate-pulse rounded-full bg-muted/60" aria-hidden />;
  }
  if (usageQuery.isError || !totals) {
    return <p className="py-6 text-center text-xs text-destructive">Rapor dağılımı yüklenemedi.</p>;
  }

  const hasData = totals.total > 0;
  const data = hasData
    ? KEYS.filter((key) => totals[key] > 0).map((key) => ({ key, value: totals[key], fill: `var(--color-${key})` }))
    : [{ key: "empty", value: 1, fill: "hsl(var(--muted))" }];

  return (
    <div className="space-y-3">
      <ChartContainer config={CHART_CONFIG} className="mx-auto aspect-square w-full max-w-[148px]">
        <PieChart>
          {hasData ? (
            <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          ) : null}
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius="68%"
            outerRadius="100%"
            stroke="hsl(var(--card))"
            strokeWidth={2}
            paddingAngle={data.length > 1 ? 2 : 0}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={cy - 6} className="fill-foreground text-2xl font-semibold tabular-nums">
                      {totals.total}
                    </tspan>
                    <tspan x={cx} y={cy + 14} className="fill-muted-foreground text-[11px]">
                      son {DAYS} gün
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="space-y-1.5" aria-label={`Son ${DAYS} günde hak türüne göre raporlar`}>
        {KEYS.map((key) => (
          <li key={key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: CHART_CONFIG[key].color }} />
              {CHART_CONFIG[key].label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{totals[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
