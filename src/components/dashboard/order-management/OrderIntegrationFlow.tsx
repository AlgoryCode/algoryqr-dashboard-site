"use client";

import { useMemo, type ReactNode } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import type { RevenueShareRow } from "@/lib/order-management";
import { cn } from "@/lib/utils";

const SOURCE_COLORS: Record<string, string> = {
  INTERNAL: "#a3e635",
  ONLINE: "#10b981",
  UBER_EATS: "#f97316",
  YEMEKSEPETI: "#f43f5e",
};

type OrderIntegrationFlowProps = {
  rows: RevenueShareRow[];
  total: number;
  currency: string;
  actions?: ReactNode;
};

export function OrderIntegrationFlow({ rows, total, currency, actions }: OrderIntegrationFlowProps) {
  const slices = rows.filter((row) => row.revenue > 0);
  const empty = slices.length === 0;
  const center = formatMenuPrice(total, currency) || "₺0";

  const config = useMemo(() => {
    const cfg: ChartConfig = {};
    for (const row of rows) {
      cfg[row.key] = {
        label: row.label,
        color: SOURCE_COLORS[row.key] ?? "hsl(var(--muted-foreground))",
      };
    }
    return cfg;
  }, [rows]);

  const chartData = empty
    ? [{ key: "empty", name: "Kazanç yok", value: 1, fill: "hsl(var(--muted))" }]
    : slices.map((row) => ({
        key: row.key,
        name: row.label,
        value: row.revenue,
        fill: `var(--color-${row.key})`,
      }));

  return (
    <div className={cn(DASHBOARD_SURFACE, "relative px-3 py-3 sm:px-4")}>
      {actions ? (
        <div className="mb-1 flex flex-wrap justify-end gap-1 sm:absolute sm:right-3 sm:top-3 sm:mb-0">
          {actions}
        </div>
      ) : null}
      <div className="flex flex-col items-center">
        <ChartContainer config={config} className="mx-auto aspect-square h-[104px] w-[104px] shrink-0">
          <PieChart>
            {empty ? null : (
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="name"
                    hideLabel
                    formatter={(value) => formatMenuPrice(Number(value), currency) || "₺0"}
                  />
                }
              />
            )}
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={32}
              outerRadius={46}
              strokeWidth={2}
              stroke="hsl(var(--card))"
              paddingAngle={empty ? 0 : 2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 7}
                        className="fill-muted-foreground text-[9px]"
                      >
                        Toplam
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 8}
                        className="fill-foreground text-[11px] font-semibold tabular-nums"
                      >
                        {center}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="mt-2 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {rows.map((row) => (
            <li key={row.key} className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: SOURCE_COLORS[row.key] ?? "hsl(var(--muted-foreground))" }}
              />
              <span className="truncate text-xs text-muted-foreground">{row.label}</span>
              <span className="shrink-0 text-xs font-medium tabular-nums">
                {formatMenuPrice(row.revenue, currency) || "₺0"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
