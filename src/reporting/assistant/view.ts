import { eachIsoDate, formatReportingDate } from "../period";
import { revenueShare, toAmount } from "../numbers";
import type { AssistantReportResponse } from "./types";

export type AssistantReportView = {
  menu: {
    revenue: number;
    revenueSharePercent: number;
    orders: number;
    orderSharePercent: number;
    units: number;
    chatSessions: number;
    adds: number;
    /** Units added to the cart per assistant conversation, in percent. */
    addRatePercent: number;
    crossSellAdds: number;
    hasActivity: boolean;
    daily: { label: string; revenue: number; units: number }[];
    topProducts: { productId: number; name: string; units: number; revenue: number }[];
  };
  dashboard: {
    questions: number;
    answered: number;
    answeredPercent: number;
    activeDays: number;
    minutesSaved: number;
    averageResponseSeconds: number | null;
    hasActivity: boolean;
    daily: { label: string; questions: number; minutesSaved: number }[];
    topics: { topic: string; questions: number; minutesSaved: number }[];
  };
};

/** Turns the API report into chart-ready numbers; days without activity are filled with zeros. */
export function buildAssistantReportView(report: AssistantReportResponse): AssistantReportView {
  const days = eachIsoDate(report.from, report.to);
  const menu = report.menu;
  const dashboard = report.dashboard;

  const revenueByDay = new Map(menu.daily.map((row) => [row.date, row]));
  const usageByDay = new Map(dashboard.daily.map((row) => [row.date, row]));

  const revenue = toAmount(menu.assistantRevenue);
  const adds = menu.productAdds + menu.crossSellAdds;

  return {
    menu: {
      revenue,
      revenueSharePercent: revenueShare(revenue, toAmount(menu.orderRevenue)),
      orders: menu.ordersWithAssistant,
      orderSharePercent: revenueShare(menu.ordersWithAssistant, menu.orderCount),
      units: menu.assistantUnits,
      chatSessions: menu.chatSessions,
      adds,
      addRatePercent: menu.chatSessions > 0 ? (adds / menu.chatSessions) * 100 : 0,
      crossSellAdds: menu.crossSellAdds,
      hasActivity: menu.chatOpens > 0 || menu.assistantUnits > 0 || adds > 0,
      daily: days.map((date) => {
        const row = revenueByDay.get(date);
        return {
          label: formatReportingDate(date),
          revenue: row ? toAmount(row.revenue) : 0,
          units: row?.units ?? 0,
        };
      }),
      topProducts: menu.topProducts.map((row) => ({
        productId: row.productId,
        name: row.productName,
        units: row.units,
        revenue: toAmount(row.revenue),
      })),
    },
    dashboard: {
      questions: dashboard.questions,
      answered: dashboard.answered,
      answeredPercent: revenueShare(dashboard.answered, dashboard.questions),
      activeDays: dashboard.activeDays,
      minutesSaved: dashboard.estimatedMinutesSaved,
      averageResponseSeconds:
        dashboard.averageResponseMs != null ? Math.round(dashboard.averageResponseMs / 100) / 10 : null,
      hasActivity: dashboard.questions > 0,
      daily: days.map((date) => {
        const row = usageByDay.get(date);
        return {
          label: formatReportingDate(date),
          questions: row?.questions ?? 0,
          minutesSaved: row?.minutesSaved ?? 0,
        };
      }),
      topics: dashboard.topics.map((row) => ({ ...row })),
    },
  };
}

/** "45 dk", "2 sa 5 dk" — time saved, rounded to whole minutes. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} dk`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}
