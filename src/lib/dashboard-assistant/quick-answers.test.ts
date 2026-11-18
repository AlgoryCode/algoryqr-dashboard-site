import { describe, expect, it } from "vitest";

import type { MenuRevenueReportResponse } from "@/lib/api";
import {
  answerQuickPrompt,
  insightPrompts,
} from "@/lib/dashboard-assistant/quick-answers";
import {
  assistantRangesFrom,
  buildSalesPeriodSnapshot,
  businessToday,
  type AssistantSalesCachePayload,
} from "@/lib/dashboard-assistant/sales-snapshot";

function report(revenue: number, orders: number, partial: Partial<MenuRevenueReportResponse> = {}) {
  return {
    from: "2026-11-12",
    to: "2026-11-18",
    kpis: { totalRevenue: revenue, orderCount: orders, itemCount: orders * 2, currency: "TRY" },
    daily: [],
    products: [],
    categories: [],
    hourly: [],
    channels: [],
    ...partial,
  } as MenuRevenueReportResponse;
}

const WEEK = report(8000, 80, {
  products: [
    { productId: 1, name: "Fıstıklı Baklava", quantity: 40, revenue: 4800 },
    { productId: 2, name: "Çay", quantity: 120, revenue: 2400 },
    { productId: 3, name: "Künefe", quantity: 4, revenue: 800 },
  ],
  hourly: [
    { hour: 13, revenue: 1500, orderCount: 15 },
    { hour: 19, revenue: 3200, orderCount: 30 },
  ],
});
const PREVIOUS_WEEK = report(10000, 90, {
  products: [
    { productId: 1, name: "Fıstıklı Baklava", quantity: 45, revenue: 5400 },
    { productId: 2, name: "Çay", quantity: 110, revenue: 2200 },
    { productId: 3, name: "Künefe", quantity: 12, revenue: 2400 },
  ],
});
const MONTH = report(30000, 300, {
  unsold: { count: 3, products: [{ productId: 9, name: "Sütlaç" }, { productId: 10, name: "Kazandibi" }] },
});

function payload(): AssistantSalesCachePayload {
  return {
    version: 1,
    branchId: 1,
    menuId: null,
    branchName: "Merkez",
    menuName: null,
    fetchedAt: "2026-11-18T10:00:00Z",
    periods: [
      buildSalesPeriodSnapshot("1d", report(0, 0), report(1500, 15)),
      buildSalesPeriodSnapshot("7d", WEEK, PREVIOUS_WEEK),
      buildSalesPeriodSnapshot("30d", MONTH, null),
    ],
  };
}

describe("assistant quick answers", () => {
  it("answers the ready chips from the summary", () => {
    const data = payload();
    expect(answerQuickPrompt("today_revenue", data)).toContain("Bugün henüz tamamlanan sipariş yok");
    expect(answerQuickPrompt("today_revenue", data)).toContain("Dün tüm gün");
    expect(answerQuickPrompt("top_products", data)).toMatch(/1\. Çay: 120 adet/);
    expect(answerQuickPrompt("peak_hour", data)).toContain("19:00–20:00");
    const summary = answerQuickPrompt("week_summary", data)!;
    expect(summary).toContain("80 sipariş");
    expect(summary).toContain("%20 azaldı");
  });

  it("explains a weekly drop with orders, basket and the products that fell", () => {
    const answer = answerQuickPrompt("week_change", payload())!;
    expect(answer).toContain("%20 azaldı");
    expect(answer).toContain("sipariş sayısı %11,1 azaldı");
    expect(answer).toMatch(/En çok düşen ürünler: Künefe .*Fıstıklı Baklava/);
    expect(answer).not.toContain("Çay (");
  });

  it("lists products that never sold in 30 days", () => {
    expect(answerQuickPrompt("unsold", payload())).toContain("3 ürün hiç satılmadı: Sütlaç, Kazandibi ve 1 ürün daha");
  });

  it("suggests insight chips only when the data says so", () => {
    expect(insightPrompts(payload()).map((chip) => chip.label)).toEqual([
      "Bu hafta ciro neden düştü?",
      "Satmayan ürünler hangileri?",
    ]);
    const flat = payload();
    flat.periods[1] = buildSalesPeriodSnapshot("7d", WEEK, report(8200, 80));
    flat.periods[2] = buildSalesPeriodSnapshot("30d", report(1, 1), null);
    expect(insightPrompts(flat)).toEqual([]);
    expect(insightPrompts(null)).toEqual([]);
  });
});

describe("assistant ranges", () => {
  it("counts back from the business day with equal previous periods", () => {
    expect(assistantRangesFrom("2026-11-18")).toEqual([
      { period: "1d", current: { from: "2026-11-18", to: "2026-11-18" }, previous: { from: "2026-11-17", to: "2026-11-17" } },
      { period: "7d", current: { from: "2026-11-12", to: "2026-11-18" }, previous: { from: "2026-11-05", to: "2026-11-11" } },
      { period: "30d", current: { from: "2026-10-20", to: "2026-11-18" }, previous: { from: "2026-09-20", to: "2026-10-19" } },
    ]);
  });

  it("uses the Istanbul calendar day on a UTC server", () => {
    expect(businessToday("Europe/Istanbul", new Date("2026-11-18T22:30:00Z"))).toBe("2026-11-19");
  });
});
