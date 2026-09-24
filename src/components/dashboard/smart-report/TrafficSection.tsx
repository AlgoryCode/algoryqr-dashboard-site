"use client";

import { useMemo } from "react";

import type { MenuAnalyticsReportResponse } from "@/lib/api";

import { HighlightBarChart } from "./charts/HighlightBarChart";
import { RankListCard } from "./charts/RadialProgressChart";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { GrossVolumeCard, RetentionStepChart } from "./charts/ZentraOverview";
import { buildTrafficSparkKpis } from "./shadcn-spark";
import { buildTrafficView } from "./traffic-view";

export default function TrafficSection({ visits }: { visits: MenuAnalyticsReportResponse }) {
  const view = useMemo(() => buildTrafficView(visits), [visits]);

  return (
    <div className="space-y-4">
      <SparkKpiStrip items={buildTrafficSparkKpis(visits)} />
      <div className="grid gap-3 lg:grid-cols-2">
        <GrossVolumeCard title="Cihaz" value={view.deviceTotal} rows={view.deviceRows} />
        {view.hourly.length > 0 ? <RetentionStepChart title="Bakış saati" data={view.hourly} /> : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <RankListCard title="En çok bakılan ürünler" items={view.topProducts} />
        <HighlightBarChart title="Kategoriye bakış" data={view.categoryBars} />
      </div>
    </div>
  );
}
