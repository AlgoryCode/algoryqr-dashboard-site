import { describe, expect, it } from "vitest";

import type { AssistantReportResponse } from "./types";
import { buildAssistantReportView, formatMinutes } from "./view";

const base: AssistantReportResponse = {
  branchId: 1,
  from: "2026-11-10",
  to: "2026-11-12",
  menu: {
    chatSessions: 10,
    chatOpens: 12,
    recommendationRequests: 20,
    recommendationsShown: 18,
    productClicks: 9,
    productAdds: 4,
    crossSellShown: 6,
    crossSellAdds: 2,
    ordersWithAssistant: 3,
    assistantUnits: 5,
    assistantRevenue: "390.00",
    orderCount: 12,
    orderRevenue: "3900.00",
    daily: [{ date: "2026-11-11", units: 5, revenue: "390.00" }],
    topProducts: [{ productId: 7, productName: "Latte", units: 3, revenue: "240.00" }],
  },
  dashboard: {
    questions: 4,
    answered: 3,
    failed: 1,
    activeDays: 2,
    estimatedMinutesSaved: 10,
    averageResponseMs: 2450,
    topics: [{ topic: "REVENUE", questions: 2, minutesSaved: 8 }],
    daily: [{ date: "2026-11-12", questions: 4, minutesSaved: 10 }],
  },
};

describe("buildAssistantReportView", () => {
  it("derives shares and rates from the API numbers", () => {
    const view = buildAssistantReportView(base);
    expect(view.menu.revenue).toBe(390);
    expect(view.menu.revenueSharePercent).toBeCloseTo(10);
    expect(view.menu.orderSharePercent).toBeCloseTo(25);
    expect(view.menu.adds).toBe(6);
    expect(view.menu.addRatePercent).toBeCloseTo(60);
    expect(view.dashboard.answeredPercent).toBeCloseTo(75);
    expect(view.dashboard.averageResponseSeconds).toBe(2.5);
  });

  it("fills every day of the range", () => {
    const view = buildAssistantReportView(base);
    expect(view.menu.daily.map((row) => row.revenue)).toEqual([0, 390, 0]);
    expect(view.dashboard.daily.map((row) => row.questions)).toEqual([0, 0, 4]);
  });

  it("reports no activity and no division by zero for an empty period", () => {
    const view = buildAssistantReportView({
      ...base,
      menu: {
        ...base.menu,
        chatSessions: 0,
        chatOpens: 0,
        productAdds: 0,
        crossSellAdds: 0,
        assistantUnits: 0,
        assistantRevenue: 0,
        orderCount: 0,
        orderRevenue: 0,
        ordersWithAssistant: 0,
        daily: [],
        topProducts: [],
      },
      dashboard: { ...base.dashboard, questions: 0, answered: 0, averageResponseMs: null, daily: [], topics: [] },
    });
    expect(view.menu.hasActivity).toBe(false);
    expect(view.menu.addRatePercent).toBe(0);
    expect(view.menu.revenueSharePercent).toBe(0);
    expect(view.dashboard.hasActivity).toBe(false);
    expect(view.dashboard.averageResponseSeconds).toBeNull();
  });
});

describe("formatMinutes", () => {
  it.each([
    [0, "0 dk"],
    [45, "45 dk"],
    [60, "1 sa"],
    [125, "2 sa 5 dk"],
  ])("%d → %s", (minutes, label) => {
    expect(formatMinutes(minutes)).toBe(label);
  });
});
