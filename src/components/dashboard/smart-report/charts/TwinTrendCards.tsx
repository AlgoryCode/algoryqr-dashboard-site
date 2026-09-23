"use client";

import { Line, LineChart, XAxis } from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DASHBOARD_METRIC_LABEL, DASHBOARD_METRIC_VALUE, DASHBOARD_STAT_TILE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import type { TwinSeries } from "../shadcn-spark";
import { DeltaPill } from "./DeltaPill";

const CONFIG = {
  value: { label: "Değer", color: "hsl(var(--foreground))" },
} satisfies ChartConfig;

export function TwinTrendCards({
  left,
  right,
}: {
  left: TwinSeries;
  right: TwinSeries;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TwinCard series={left} />
      <TwinCard series={right} />
    </div>
  );
}

function TwinCard({ series }: { series: TwinSeries }) {
  return (
    <Card className={DASHBOARD_STAT_TILE}>
      <CardHeader className="space-y-0 p-0 pb-2">
        <p className={DASHBOARD_METRIC_LABEL}>{series.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className={cn(DASHBOARD_METRIC_VALUE, "mt-0")}>{series.value}</p>
          <DeltaPill value={series.delta} />
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-1">
        <ChartContainer
          config={CONFIG}
          className="aspect-auto h-[88px] w-full min-w-0 [&_.recharts-responsive-container]:h-full [&_.recharts-responsive-container]:w-full"
        >
          <LineChart data={series.points} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
