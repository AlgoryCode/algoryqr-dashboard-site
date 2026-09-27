"use client";

import { useMemo } from "react";

import type { MenuAnalyticsReportResponse } from "@/lib/api";
import { computeChefFunnelMetrics } from "@/lib/chef/chef-funnel-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_METRIC_LABEL, DASHBOARD_METRIC_VALUE } from "@/lib/dashboard-surface";

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

export function ChefFunnelReportSection({ visits }: { visits: MenuAnalyticsReportResponse }) {
  const metrics = useMemo(() => computeChefFunnelMetrics(visits), [visits]);

  if (metrics.chatOpens === 0 && metrics.recommendationShown === 0) {
    return null;
  }

  const tiles = [
    { label: "Şef sohbet açılışı", value: String(metrics.chatOpens) },
    { label: "Öneri gösterimi", value: String(metrics.recommendationShown) },
    { label: "Öneriden sepete", value: pct(metrics.recommendationToAddRate) },
    { label: "Sohbet → sipariş", value: pct(metrics.chatToOrderRate) },
    { label: "Cross-sell gösterim", value: String(metrics.crossSellShown) },
    { label: "Cross-sell ekleme", value: String(metrics.crossSellAdds) },
    { label: "Beğeni", value: String(metrics.feedbackLikes) },
    { label: "Beğenmeme", value: String(metrics.feedbackDislikes) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Akıllı şef funnel (örnek oturumlar)</CardTitle>
        <p className="text-sm text-muted-foreground">
          `sampleJourneys` içindeki CHEF_* adımlarından hesaplanır. Tam hacim için analytics backend raporu
          önerilir.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className={DASHBOARD_STAT_TILE}>
              <p className={DASHBOARD_METRIC_LABEL}>{tile.label}</p>
              <p className={DASHBOARD_METRIC_VALUE}>{tile.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
