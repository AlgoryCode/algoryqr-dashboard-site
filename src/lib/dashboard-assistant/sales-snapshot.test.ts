import { describe, expect, it } from "vitest";

import {
  buildSalesPeriodSnapshot,
  formatSalesContextForAgent,
  type AssistantSalesCachePayload,
} from "@/lib/dashboard-assistant/sales-snapshot";
import type { MenuRevenueReportResponse } from "@/lib/api";

function revenue(partial: Partial<MenuRevenueReportResponse>): MenuRevenueReportResponse {
  return {
    from: "2026-03-25",
    to: "2026-03-25",
    kpis: {
      totalRevenue: 1000,
      orderCount: 10,
      itemCount: 24,
      avgOrderValue: 100,
      currency: "TRY",
    },
    daily: [],
    products: [{ productId: 1, name: "Latte", quantity: 5, revenue: 400 }],
    categories: [],
    hourly: [{ hour: 14, revenue: 600, orderCount: 4 }],
    channels: [{ code: "IN_HOUSE", label: "İç satış", revenue: 1000, orderCount: 10, connected: true }],
    ...partial,
  };
}

describe("dashboard assistant sales snapshot", () => {
  it("builds period snapshot with peak hour and formats agent context", () => {
    const snapshot = buildSalesPeriodSnapshot("1d", revenue({}), null);
    expect(snapshot.peakHour?.hour).toBe(14);
    expect(snapshot.topProducts[0]?.name).toBe("Latte");

    const payload: AssistantSalesCachePayload = {
      version: 1,
      branchId: 3,
      menuId: null,
      branchName: "Merkez",
      menuName: null,
      fetchedAt: "2026-03-25T10:00:00.000Z",
      periods: [snapshot],
    };
    const text = formatSalesContextForAgent(payload);
    expect(text).toContain("Merkez");
    expect(text).toContain("Latte");
    expect(text).toContain("Yoğun saat");
  });
});
