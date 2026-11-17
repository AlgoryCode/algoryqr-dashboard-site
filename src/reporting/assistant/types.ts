import type { AssistantUsageTopic } from "@/lib/assistant-usage";

/** GET /analytics/branch/{branchId}/assistant (qr-service AssistantReportDtos). */
export type AssistantReportResponse = {
  branchId: number;
  branchName?: string | null;
  from: string;
  to: string;
  currency?: string | null;
  menu: MenuAssistantReport;
  dashboard: DashboardAssistantReport;
};

export type MenuAssistantReport = {
  chatSessions: number;
  chatOpens: number;
  recommendationRequests: number;
  recommendationsShown: number;
  productClicks: number;
  productAdds: number;
  crossSellShown: number;
  crossSellAdds: number;
  ordersWithAssistant: number;
  assistantUnits: number;
  assistantRevenue: number | string;
  orderCount: number;
  orderRevenue: number | string;
  daily: { date: string; units: number; revenue: number | string }[];
  topProducts: { productId: number; productName: string; units: number; revenue: number | string }[];
};

export type DashboardAssistantReport = {
  questions: number;
  answered: number;
  failed: number;
  activeDays: number;
  estimatedMinutesSaved: number;
  averageResponseMs?: number | null;
  topics: { topic: AssistantUsageTopic; questions: number; minutesSaved: number }[];
  daily: { date: string; questions: number; minutesSaved: number }[];
};
