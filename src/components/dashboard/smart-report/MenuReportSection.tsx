"use client";

import { useMemo, useState } from "react";
import { Clock, Eye, Layers, Package, Smartphone, TrendingUp } from "lucide-react";

import {
  DetailBarList,
  InsightStrip,
  RankedListCard,
  ReportDetailSheet,
  ReportSection,
  formatPercent,
  hourRangeLabel,
  sharePercent,
  type RankedRow,
  type ReportInsight,
} from "@/components/dashboard/reports/ReportData";

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
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { TrendAreaChart } from "./charts/TrendAreaChart";
import { GrossVolumeCard, RetentionStepChart } from "./charts/ZentraOverview";
import { buildTrafficSparkKpis } from "./shadcn-spark";
import { buildTrafficView } from "./traffic-view";

function toRanked(rows: { key: string; name: string; views: number }[], total: number): RankedRow[] {
  const peak = Math.max(1, ...rows.map((row) => row.views));
  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    primary: `${row.views.toLocaleString("tr-TR")} görüntüleme`,
    secondary: formatPercent(sharePercent(row.views, total)),
    bar: (row.views / peak) * 100,
    sortValues: { views: row.views },
  }));
}

export function MenuReportSection({
  report,
  orderCount,
}: {
  report: MenuAnalyticsReportResponse;
  orderCount?: number | null;
}) {
  const [detail, setDetail] = useState<{ kind: "product" | "category"; key: string } | null>(null);
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

  const productStats = useMemo(
    () =>
      (report.topProducts ?? []).map((row, index) => ({
        key: String(row.productId ?? row.name),
        name: row.name,
        views: row.views,
        rank: index + 1,
      })),
    [report.topProducts],
  );
  const categoryStats = useMemo(
    () =>
      (report.topCategories ?? []).map((row, index) => ({
        key: String(row.categoryId ?? row.name),
        name: row.name,
        views: row.views,
        rank: index + 1,
      })),
    [report.topCategories],
  );
  const productViewTotal = productStats.reduce((sum, row) => sum + row.views, 0);
  const categoryViewTotal = categoryStats.reduce((sum, row) => sum + row.views, 0);

  const productRows = useMemo(() => toRanked(productStats, productViewTotal), [productStats, productViewTotal]);
  const categoryRows = useMemo(
    () => toRanked(categoryStats, categoryViewTotal),
    [categoryStats, categoryViewTotal],
  );

  const insights = useMemo((): ReportInsight[] => {
    const peakHour = [...(report.hourly ?? [])].sort((a, b) => b.views - a.views)[0];
    const topDevice = [...(report.devices ?? [])].sort((a, b) => b.value - a.value)[0];
    const deviceTotal = (report.devices ?? []).reduce((sum, row) => sum + row.value, 0);
    const topProduct = productStats[0];
    return [
      {
        icon: TrendingUp,
        label: "Menü dönüşümü",
        value: funnelStages.length > 0 ? formatPercent(funnelPct) : "",
        hint: "Açılıştan son adıma",
        tone: funnelPct >= 50 ? "positive" : funnelPct > 0 && funnelPct < 15 ? "warning" : "default",
      },
      {
        icon: Eye,
        label: "En çok bakılan ürün",
        value: topProduct?.name ?? "",
        hint: topProduct ? `${topProduct.views.toLocaleString("tr-TR")} görüntüleme` : undefined,
        onClick: topProduct ? () => setDetail({ kind: "product", key: topProduct.key }) : undefined,
      },
      {
        icon: Clock,
        label: "En yoğun saat",
        value: peakHour && peakHour.views > 0 ? hourRangeLabel(peakHour.hour) : "",
        hint: peakHour ? `${peakHour.views.toLocaleString("tr-TR")} görüntüleme` : undefined,
      },
      {
        icon: Smartphone,
        label: "En çok kullanılan cihaz",
        value: topDevice?.name ?? "",
        hint: topDevice ? formatPercent(sharePercent(topDevice.value, deviceTotal)) : undefined,
      },
    ];
  }, [funnelPct, funnelStages.length, productStats, report.devices, report.hourly]);

  const selectedProduct = detail?.kind === "product" ? productStats.find((row) => row.key === detail.key) : undefined;
  const selectedCategory =
    detail?.kind === "category" ? categoryStats.find((row) => row.key === detail.key) : undefined;
  const categoryChildren = useMemo(() => {
    if (!selectedCategory) return [];
    const node = (report.categoryProductTree ?? []).find((row) => row.name === selectedCategory.name);
    return (node?.children ?? [])
      .slice()
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map((child) => ({
        key: child.name,
        label: child.name,
        value: child.size,
        display: child.size.toLocaleString("tr-TR"),
      }));
  }, [report.categoryProductTree, selectedCategory]);

  if (view.empty) {
    return <ReportEmpty text="Bu menü için seçilen dönemde analitik kaydı yok." />;
  }

  const menuTitle = report.menuName?.trim() || "Seçili menü";

  return (
    <div className="space-y-6">
      <ReportSection
        title="Genel bakış"
        description={`${menuTitle}${report.branchName ? ` · ${report.branchName}` : ""} · menü etkileşimi`}
      >
        <SparkKpiStrip items={buildTrafficSparkKpis(report)} />
        <InsightStrip items={insights} />
      </ReportSection>

      <ReportSection title="Akış ve huni" description="Ziyaretçilerin menüde ne kadar ilerlediği">

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

      </ReportSection>

      <ReportSection title="Kitle" description="Hangi cihazdan ve hangi saatte bakılıyor">
      <div className="grid gap-3 lg:grid-cols-2">
        <GrossVolumeCard title="Cihaz" value={traffic.deviceTotal} rows={traffic.deviceRows} />
        {traffic.hourly.length > 0 ? (
          <RetentionStepChart title="Bakış saati" data={traffic.hourly} />
        ) : null}
      </div>

      </ReportSection>

      <ReportSection title="İçerik ilgisi" description="En çok ilgi gören ürün ve kategoriler">
      <div className="grid gap-3 lg:grid-cols-2">
        <RankedListCard
          title="En çok bakılan ürünler"
          description="Detay için ürüne dokunun"
          icon={Package}
          rows={productRows}
          limit={6}
          accent={CHART_COLORS.c2}
          searchPlaceholder="Ürün ara…"
          onRowClick={(row) => setDetail({ kind: "product", key: row.key })}
        />
        <RankedListCard
          title="Popüler kategoriler"
          description="Detay için kategoriye dokunun"
          icon={Layers}
          rows={categoryRows}
          limit={6}
          accent={CHART_COLORS.c4}
          searchPlaceholder="Kategori ara…"
          onRowClick={(row) => setDetail({ kind: "category", key: row.key })}
        />
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
      </ReportSection>

      <ReportDetailSheet
        open={selectedProduct != null}
        onClose={() => setDetail(null)}
        icon={Package}
        title={selectedProduct?.name ?? "Ürün"}
        description={selectedProduct ? `En çok bakılanlarda ${selectedProduct.rank}. sırada` : undefined}
        metrics={
          selectedProduct
            ? [
                { label: "Görüntüleme", value: selectedProduct.views.toLocaleString("tr-TR"), accent: true },
                { label: "Görüntüleme payı", value: formatPercent(sharePercent(selectedProduct.views, productViewTotal), 1), accent: true },
                {
                  label: "Menü açılışına oranı",
                  value: formatPercent(sharePercent(selectedProduct.views, report.funnel?.menuOpens ?? 0), 1),
                  hint: "Menüyü açanların ne kadarı baktı",
                },
                { label: "Sıra", value: `${selectedProduct.rank} / ${productStats.length}` },
              ]
            : []
        }
      />

      <ReportDetailSheet
        open={selectedCategory != null}
        onClose={() => setDetail(null)}
        icon={Layers}
        title={selectedCategory?.name ?? "Kategori"}
        description={selectedCategory ? `Popüler kategorilerde ${selectedCategory.rank}. sırada` : undefined}
        metrics={
          selectedCategory
            ? [
                { label: "Görüntüleme", value: selectedCategory.views.toLocaleString("tr-TR"), accent: true },
                { label: "Görüntüleme payı", value: formatPercent(sharePercent(selectedCategory.views, categoryViewTotal), 1), accent: true },
              ]
            : []
        }
      >
        <DetailBarList
          title="Bu kategoride en çok bakılan ürünler"
          rows={categoryChildren}
          accent={CHART_COLORS.c4}
          emptyText="Bu kategori için ürün kırılımı yok."
        />
      </ReportDetailSheet>
    </div>
  );
}
