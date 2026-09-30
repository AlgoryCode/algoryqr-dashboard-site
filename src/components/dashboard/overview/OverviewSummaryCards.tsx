"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatBranchAmount } from "@/lib/branch-detail";
import {
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_STAT_TILE,
} from "@/lib/dashboard-surface";
import { percentDelta, type OverviewTodaySummary } from "@/lib/overview-dashboard";
import { cn } from "@/lib/utils";

type MetricKey = "revenue" | "orders" | "avgBasket";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "revenue", label: "Ciro" },
  { key: "orders", label: "Sipariş" },
  { key: "avgBasket", label: "Ortalama sepet" },
];

function formatMetric(key: MetricKey, value: number, currency: string): string {
  if (key === "orders") return Math.round(value).toLocaleString("tr-TR");
  return formatBranchAmount(value, currency);
}

function DeltaChip({ label, delta }: { label: string; delta: number | null }) {
  if (delta == null) {
    return <span className="text-xs text-muted-foreground">{label}: veri yok</span>;
  }
  const flat = Math.abs(delta) < 0.5;
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? "text-muted-foreground" : delta > 0 ? "text-emerald-600" : "text-red-600";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {label}
      <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", tone)}>
        <Icon className="size-3.5" aria-hidden />
        %{Math.abs(delta).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
      </span>
    </span>
  );
}

export function OverviewSummaryCards({
  summary,
  loading,
  error,
}: {
  summary: OverviewTodaySummary | null;
  loading: boolean;
  error: boolean;
}) {
  if (loading && !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {METRICS.map((metric) => (
          <Skeleton key={metric.key} className="h-[7.5rem] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        {error
          ? "Bugünün satış özeti şu an alınamadı."
          : "Satış özetini görmek için raporlama veya garson paneli modülü gerekir."}
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {METRICS.map((metric) => {
        const today = summary.today[metric.key];
        return (
          <article key={metric.key} className={DASHBOARD_STAT_TILE}>
            <p className={DASHBOARD_METRIC_LABEL}>{metric.label}</p>
            <p className={DASHBOARD_METRIC_VALUE}>{formatMetric(metric.key, today, summary.currency)}</p>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              <DeltaChip label="Dün" delta={percentDelta(today, summary.yesterday[metric.key])} />
              <DeltaChip
                label="Geçen hafta"
                delta={percentDelta(today, summary.lastWeek[metric.key])}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
