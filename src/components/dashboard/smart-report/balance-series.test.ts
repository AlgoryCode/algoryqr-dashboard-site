import { describe, expect, it } from "vitest";

import type { MenuRevenueReportResponse } from "@/lib/api";

import { buildBalanceSummary } from "./balance-series";

function revenue(partial: Partial<MenuRevenueReportResponse>): MenuRevenueReportResponse {
  return {
    from: "2026-09-01",
    to: "2026-09-04",
    kpis: { totalRevenue: 0, orderCount: 0, itemCount: 0 },
    daily: [],
    products: [],
    categories: [],
    ...partial,
  };
}

describe("buildBalanceSummary", () => {
  it("accumulatesIncomeAndSpreadsExpenseEvenly", () => {
    const summary = buildBalanceSummary(
      revenue({
        paymentBreakdown: { grossRevenue: 1000, fixedExpenseTotal: 400 },
        daily: [
          { date: "2026-09-01", revenue: 100 },
          { date: "2026-09-02", revenue: 300 },
          { date: "2026-09-04", revenue: 600 },
        ],
      }),
    );

    expect(summary.points.map((p) => p.income)).toEqual([100, 400, 400, 1000]);
    expect(summary.points.map((p) => p.expense)).toEqual([100, 200, 300, 400]);
    expect(summary.net).toBe(600);
    expect(summary.margin).toBe(60);
    expect(summary.breakEven).toBe(summary.points[1]?.label);
    expect(summary.shortfall).toBe(0);
  });

  it("reportsShortfallWhenExpenseIsNotCovered", () => {
    const summary = buildBalanceSummary(
      revenue({
        paymentBreakdown: { grossRevenue: 300, fixedExpenseTotal: 500, netRevenue: -200 },
        daily: [{ date: "2026-09-02", revenue: 300 }],
      }),
    );

    expect(summary.net).toBe(-200);
    expect(summary.breakEven).toBeNull();
    expect(summary.shortfall).toBe(200);
  });

  it("hasNoBreakEvenWithoutFixedExpense", () => {
    const summary = buildBalanceSummary(
      revenue({ paymentBreakdown: { grossRevenue: 300 }, daily: [{ date: "2026-09-02", revenue: 300 }] }),
    );

    expect(summary.expense).toBe(0);
    expect(summary.breakEven).toBeNull();
    expect(summary.shortfall).toBe(0);
    expect(summary.net).toBe(300);
  });

  it("usesActiveHoursForASingleDay", () => {
    const summary = buildBalanceSummary(
      revenue({
        from: "2026-09-02",
        to: "2026-09-02",
        paymentBreakdown: { grossRevenue: 300, fixedExpenseTotal: 100 },
        hourly: [
          { hour: 10, revenue: 100 },
          { hour: 12, revenue: 200 },
        ],
      }),
    );

    expect(summary.points).toHaveLength(3);
    expect(summary.points.map((p) => p.income)).toEqual([100, 100, 300]);
  });
});
