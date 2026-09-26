"use client";

import { useMemo } from "react";

import type { MenuAnalyticsReportResponse } from "@/lib/api";
import {
  buildVisitReportView,
  visitDropoffStages,
  visitFunnelEndToEndPercent,
} from "@/reporting";

import { CHART_COLORS } from "./chart-config";
import { ReportEmpty } from "./ReportChartCard";
import { GapBarsCard } from "./charts/GapBarsCard";
import { NamedTableCard } from "./charts/NamedTableCard";
import { PeakTrackCard } from "./charts/NestedRingCard";
import { RankListCard } from "./charts/RadialProgressChart";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { TrendAreaChart } from "./charts/TrendAreaChart";
import { GrossVolumeCard, RetentionStepChart } from "./charts/ZentraOverview";
import { buildTrafficSparkKpis } from "./shadcn-spark";
import { buildTrafficView } from "./traffic-view";

export function MenuReportSection({
  report,
  orderCount,
}: {
  report: MenuAnalyticsReportResponse;
  orderCount?: number | null;
}) {
  const view = useMemo(() => buildVisitReportView(report), [report]);
  const traffic = useMemo(() => buildTrafficView(report), [report]);
  const funnelStages = useMemo(
    () => visitDropoffStages(report, orderCount ?? undefined),
    [orderCount, report],
  );
  const funnelPct = useMemo(() => visitFunnelEndToEndPercent(funnelStages), [funnelStages]);

  const dailyTrend = useMemo(
    () =>
      view.daily.map((row) => ({
        label: row.dateLabel,
        sessions: row.sessions,
        menuOpens: row.menuOpens,
        productViews: row.productViews,
      })),
    [view.daily],
  );

  const categoryDepth = useMemo(() => {
    const maxCat = Math.max(...view.topCategories.map((row) => row.views), 1);
    return view.topCategories.slice(0, 6).map((row, index) => ({
      name: row.name,
      value: row.views.toLocaleString("tr-TR"),
      active: index === 0,
      share: (row.views / maxCat) * 100,
    }));
  }, [view.topCategories]);

  const interestGap = useMemo(() => {
    const products = new Map(view.topProducts.map((row) => [row.name, row.views]));
    const categories = view.topCategories.slice(0, 6);
    const max = Math.max(
      ...categories.map((row) => row.views),
      ...categories.map((row) => products.get(row.name) ?? 0),
      1,
    );
    return categories.map((row) => ({
      name: row.name,
      left: (row.views / max) * 100,
      right: ((products.get(row.name) ?? 0) / max) * 100,
    }));
  }, [view.topCategories, view.topProducts]);

  const treeRows = useMemo(() => {
    return view.treeData.slice(0, 8).flatMap((node) => {
      const children = node.children.slice(0, 3);
      if (children.length === 0) {
        return [{ name: node.name, value: node.size, display: node.size.toLocaleString("tr-TR") }];
      }
      return children.map((child) => ({
        name: `${node.name} · ${child.name}`,
        value: child.size,
        display: child.size.toLocaleString("tr-TR"),
        hint: node.name,
      }));
    });
  }, [view.treeData]);

  const journeyRows = useMemo(() => {
    return (view.sampleJourneys ?? []).slice(0, 6).map((journey) => {
      const steps = journey.steps
        .slice(0, 4)
        .map((step) => step.name || step.type)
        .join(" → ");
      const started = new Date(journey.startedAt);
      const time = Number.isNaN(started.getTime())
        ? journey.startedAt
        : started.toLocaleString("tr-TR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
      return [time, steps || "—"];
    });
  }, [view.sampleJourneys]);

  if (view.empty) {
    return <ReportEmpty text="Bu menü için seçilen dönemde analitik kaydı yok." />;
  }

  const menuTitle = report.menuName?.trim() || "Seçili menü";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{menuTitle}</span>
        {report.branchName ? ` · ${report.branchName}` : null}
        {" · "}
        Menü etkileşimi, huni ve içerik ilgisi
      </p>

      <SparkKpiStrip items={buildTrafficSparkKpis(report)} />

      {dailyTrend.length > 0 ? (
        <TrendAreaChart
          title="Günlük menü akışı"
          description="Oturum, menü açılışı ve ürün görüntüleme"
          data={dailyTrend}
          series={[
            { key: "sessions", label: "Oturum", color: CHART_COLORS.c1 },
            { key: "menuOpens", label: "Menü açılışı", color: CHART_COLORS.c2 },
            { key: "productViews", label: "Ürün görüntüleme", color: CHART_COLORS.c3 },
          ]}
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <PeakTrackCard
          title="Menü hunisi"
          value={`%${funnelPct.toFixed(0)}`}
          chip="açılış → son adım"
          rows={funnelStages.map((stage) => ({
            name: stage.label,
            value: stage.value,
            display: stage.value.toLocaleString("tr-TR"),
          }))}
          accent={CHART_COLORS.c4}
        />
        {interestGap.length > 0 ? (
          <GapBarsCard
            title="Kategori ilgisi"
            leftLabel="Kategori bakışı"
            rightLabel="Üst ürün (aynı isim)"
            rows={interestGap}
          />
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <GrossVolumeCard title="Cihaz" value={traffic.deviceTotal} rows={traffic.deviceRows} />
        {traffic.hourly.length > 0 ? (
          <RetentionStepChart title="Bakış saati" data={traffic.hourly} />
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <RankListCard title="En çok bakılan ürünler" items={traffic.topProducts} />
        <RankListCard title="Popüler kategoriler" items={categoryDepth} />
      </div>

      {treeRows.length > 0 ? (
        <PeakTrackCard
          title="Kategori → ürün derinliği"
          chip="görüntüleme"
          rows={treeRows}
          accent={CHART_COLORS.c5}
        />
      ) : null}

      <NamedTableCard
        title="Örnek ziyaret yolları"
        columns={["Başlangıç", "Adımlar"]}
        rows={journeyRows}
      />
    </div>
  );
}
