"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_METRIC_LABEL, DASHBOARD_METRIC_VALUE, DASHBOARD_STAT_TILE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

import type { SparkKpi } from "../shadcn-spark";
import { FadeLineSpark, MiniLineSpark } from "./FadeLineSpark";
import { DeltaText } from "./DeltaPill";

/** Card line style: "line" is the plain dark trend line, "fade" the colored line that fades in from the left. */
export type SparkStyle = "line" | "fade";

export function SparkKpiStrip({
  items,
  className,
  spark = "line",
}: {
  items: SparkKpi[];
  className?: string;
  spark?: SparkStyle;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 xl:grid-cols-4", className)}>
      {items.map((item, index) => (
        <SparkKpiCard
          key={item.title}
          item={item}
          spark={spark}
          color={item.color ?? `hsl(var(--chart-${(index % 5) + 1}))`}
        />
      ))}
    </div>
  );
}

function SplitList({ splits }: { splits?: SparkKpi["splits"] }) {
  if (!splits || splits.length === 0) return null;
  return (
    <ul className="space-y-1 border-t border-border/60 pt-2">
      {splits.map((split) => (
        <li key={split.label} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{split.label}</span>
          <span className="truncate font-medium tabular-nums text-foreground">{split.value}</span>
        </li>
      ))}
    </ul>
  );
}

function SparkKpiCard({ item, spark, color }: { item: SparkKpi; spark: SparkStyle; color: string }) {
  return (
    <Card className={DASHBOARD_STAT_TILE}>
      <CardContent className="space-y-3 p-0">
        <div className="min-w-0">
          <p className={DASHBOARD_METRIC_LABEL}>{item.title}</p>
          <p className={`truncate ${DASHBOARD_METRIC_VALUE}`}>{item.value}</p>
          <DeltaText value={item.delta} />
        </div>
        {spark === "fade" ? (
          <FadeLineSpark values={item.series} color={color} className="-mx-1 h-12 w-[calc(100%+0.5rem)]" />
        ) : (
          <MiniLineSpark values={item.series} className="-mx-1 h-12 w-[calc(100%+0.5rem)]" />
        )}
        <SplitList splits={item.splits} />
      </CardContent>
    </Card>
  );
}
