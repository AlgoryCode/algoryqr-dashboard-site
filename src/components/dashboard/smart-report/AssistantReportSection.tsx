"use client";

import { useMemo } from "react";
import { Bot, Clock, MessageSquareText, ShoppingBag, Sparkles, TrendingUp } from "lucide-react";

import {
  InsightStrip,
  RankedListCard,
  ReportSection,
  formatPercent,
  type RankedRow,
  type ReportInsight,
} from "@/components/dashboard/reports/ReportData";
import { ReportStateCard } from "@/components/dashboard/reports/ReportShell";
import { ASSISTANT_TOPIC_LABEL, type AssistantUsageTopic } from "@/lib/assistant-usage";
import {
  buildAssistantReportView,
  formatMinutes,
  type AssistantReportResponse,
} from "@/reporting/assistant";

import { money } from "./chart-config";
import { SparkKpiStrip } from "./charts/SparkKpiStrip";
import { TrendAreaChart } from "./charts/TrendAreaChart";

function count(value: number): string {
  return value.toLocaleString("tr-TR");
}

/** Raporlar → Asistan: menüdeki asistanın getirdiği satış ve dashboard asistanının kazandırdığı zaman. */
export function AssistantReportSection({ report }: { report: AssistantReportResponse }) {
  const view = useMemo(() => buildAssistantReportView(report), [report]);
  const currency = report.currency || "TRY";
  const m = (value: number) => money(value, currency);
  const { menu, dashboard } = view;

  const insights: ReportInsight[] = [
    {
      icon: TrendingUp,
      label: "Asistan önerileriyle ek satış",
      value: m(menu.revenue),
      hint: menu.revenue > 0 ? `Toplam siparişlerin ${formatPercent(menu.revenueSharePercent, 1)} kadarı` : "Bu dönemde yok",
      tone: menu.revenue > 0 ? "positive" : "default",
    },
    {
      icon: ShoppingBag,
      label: "Asistanlı sipariş",
      value: count(menu.orders),
      hint: menu.orders > 0 ? `Siparişlerin ${formatPercent(menu.orderSharePercent)}'ı` : undefined,
    },
    {
      icon: MessageSquareText,
      label: "Dashboard asistanına sorulan",
      value: `${count(dashboard.questions)} soru`,
      hint: dashboard.questions > 0 ? `${count(dashboard.activeDays)} farklı günde` : "Bu dönemde yok",
    },
    {
      icon: Clock,
      label: "Kazanılan zaman (tahmini)",
      value: formatMinutes(dashboard.minutesSaved),
      hint: dashboard.answered > 0 ? `${count(dashboard.answered)} cevaplanan soru` : undefined,
      tone: dashboard.minutesSaved > 0 ? "positive" : "default",
    },
  ];

  const productRows: RankedRow[] = useMemo(() => {
    const peak = Math.max(1, ...menu.topProducts.map((row) => row.revenue));
    return menu.topProducts.map((row) => ({
      key: String(row.productId),
      name: row.name,
      primary: money(row.revenue, currency),
      secondary: `${count(row.units)} adet asistan önerisiyle`,
      bar: (row.revenue / peak) * 100,
      sortValues: { revenue: row.revenue, units: row.units },
    }));
  }, [currency, menu.topProducts]);

  const topicRows: RankedRow[] = useMemo(() => {
    const peak = Math.max(1, ...dashboard.topics.map((row) => row.questions));
    return dashboard.topics.map((row) => ({
      key: row.topic,
      name: ASSISTANT_TOPIC_LABEL[row.topic as AssistantUsageTopic] ?? row.topic,
      primary: `${count(row.questions)} soru`,
      secondary: `≈ ${formatMinutes(row.minutesSaved)} kazanç`,
      bar: (row.questions / peak) * 100,
      sortValues: { questions: row.questions },
    }));
  }, [dashboard.topics]);

  return (
    <div className="space-y-6">
      <InsightStrip items={insights} />

      <ReportSection
        title="Menüdeki Akıllı Asistan"
        description="Misafirin asistan önerisiyle sepete ekleyip sipariş verdiği ürünler. Taslak, reddedilen ve iptal edilen siparişler sayılmaz."
      >
        {menu.hasActivity ? (
          <>
            <SparkKpiStrip
              items={[
                {
                  title: "Ek satış",
                  value: m(menu.revenue),
                  delta: null,
                  icon: "wallet",
                  series: menu.daily.map((row) => row.revenue),
                },
                {
                  title: "Asistanla eklenen ürün",
                  value: `${count(menu.units)} adet`,
                  delta: null,
                  icon: "card",
                  series: menu.daily.map((row) => row.units),
                  splits: [{ label: "Siparişe giden", value: `${count(menu.orders)} sipariş` }],
                },
                {
                  title: "Asistan sohbeti",
                  value: count(menu.chatSessions),
                  delta: null,
                  icon: "users",
                  series: [],
                  splits: [{ label: "Sohbet açılışı", value: count(report.menu.chatOpens) }],
                },
                {
                  title: "Sepete ekleme oranı",
                  value: formatPercent(menu.addRatePercent),
                  delta: null,
                  icon: "repeat",
                  series: [],
                  splits: [
                    { label: "Sepete eklenen öneri", value: count(menu.adds) },
                    { label: "Birlikte iyi gider", value: count(menu.crossSellAdds) },
                  ],
                },
              ]}
            />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <TrendAreaChart
                title="Günlük ek satış"
                description="Asistan önerisiyle siparişe giden ürünlerin tutarı"
                value={m(menu.revenue)}
                data={menu.daily.map((row) => ({ label: row.label, revenue: row.revenue }))}
                series={[{ key: "revenue", label: "Ek satış" }]}
              />
              <RankedListCard
                title="Asistanın en çok sattırdığı ürünler"
                icon={Sparkles}
                rows={productRows}
                emptyText="Asistan önerisiyle siparişe giden ürün yok."
              />
            </div>
          </>
        ) : (
          <ReportStateCard
            icon={Bot}
            title="Menüdeki asistan bu dönemde kullanılmadı"
            description="Misafirler menüde asistana sorup önerilen ürünü sepete eklediğinde, siparişe dönen tutar burada görünür."
          />
        )}
      </ReportSection>

      <ReportSection
        title="Dashboard Asistanı"
        description="Bu şube için asistana sorduğunuz sorular. Kazanılan zaman, aynı bilgiyi raporlardan bulmanın ortalama süresiyle tahmin edilir (konuya göre 2–4 dk)."
      >
        {dashboard.hasActivity ? (
          <>
            <SparkKpiStrip
              items={[
                {
                  title: "Sorulan soru",
                  value: count(dashboard.questions),
                  delta: null,
                  icon: "users",
                  series: dashboard.daily.map((row) => row.questions),
                  splits: [{ label: "Kullanılan gün", value: count(dashboard.activeDays) }],
                },
                {
                  title: "Asistanın hallettiği",
                  value: count(dashboard.answered),
                  delta: null,
                  icon: "repeat",
                  series: [],
                  splits: [{ label: "Cevaplanma oranı", value: formatPercent(dashboard.answeredPercent) }],
                },
                {
                  title: "Kazanılan zaman (tahmini)",
                  value: formatMinutes(dashboard.minutesSaved),
                  delta: null,
                  icon: "wallet",
                  series: dashboard.daily.map((row) => row.minutesSaved),
                },
                {
                  title: "Ortalama yanıt süresi",
                  value:
                    dashboard.averageResponseSeconds != null
                      ? `${dashboard.averageResponseSeconds.toLocaleString("tr-TR")} sn`
                      : "—",
                  delta: null,
                  icon: "card",
                  series: [],
                },
              ]}
            />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <TrendAreaChart
                title="Günlük kullanım"
                description="Sorulan soru ve tahmini kazanılan dakika"
                value={`${count(dashboard.questions)} soru`}
                data={dashboard.daily.map((row) => ({
                  label: row.label,
                  questions: row.questions,
                  minutesSaved: row.minutesSaved,
                }))}
                series={[
                  { key: "questions", label: "Soru" },
                  { key: "minutesSaved", label: "Kazanılan dk", dashed: true },
                ]}
              />
              <RankedListCard
                title="Neler soruldu"
                icon={MessageSquareText}
                rows={topicRows}
                emptyText="Bu dönemde soru yok."
              />
            </div>
          </>
        ) : (
          <ReportStateCard
            icon={MessageSquareText}
            title="Dashboard asistanı bu dönemde kullanılmadı"
            description="Ciro, sipariş veya personelle ilgili sorularınızı asistana sorun; kaç soruyu hallettiği ve size kazandırdığı süre burada birikir."
          />
        )}
      </ReportSection>
    </div>
  );
}
