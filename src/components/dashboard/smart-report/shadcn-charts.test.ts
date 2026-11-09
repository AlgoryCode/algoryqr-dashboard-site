import { describe, expect, it } from "vitest";

import type { MenuAnalyticsReportResponse, MenuRevenueReportResponse } from "@/lib/api";

import {
  buildCiroWorthSeries,
  buildPulseArea,
  compactAmount,
  compactAxis,
  keepActivePoints,
  pulseHourLabel,
  pulseNowHour,
  pulseRadioLabels,
  todayIso,
  trimZeroEdges,
} from "./shadcn-charts";
import { buildCategorySales, buildCiroSparkKpis, buildTrafficSparkKpis } from "./shadcn-spark";

function revenue(partial: Partial<MenuRevenueReportResponse>): MenuRevenueReportResponse {
  return {
    from: "2026-09-12",
    to: "2026-09-12",
    kpis: { totalRevenue: 0, orderCount: 0, itemCount: 0 },
    daily: [],
    products: [],
    categories: [],
    ...partial,
  };
}

function visits(partial: Partial<MenuAnalyticsReportResponse> = {}): MenuAnalyticsReportResponse {
  return {
    from: "2026-09-01",
    to: "2026-09-12",
    kpis: { sessions: 10, menuOpens: 12, productViews: 24, categoryViews: 18, avgProductsPerSession: 2.4 },
    daily: [],
    hourly: [],
    devices: [],
    topProducts: [],
    topCategories: [],
    categoryProductTree: [],
    sampleJourneys: [],
    funnel: { menuOpens: 12, categoryViews: 18, productViews: 24 },
    ...partial,
  };
}

describe("pulse helpers", () => {
  it("todayIso_usesLocalCalendarDate", () => {
    expect(todayIso(() => new Date(2026, 8, 12, 15, 4))).toBe("2026-09-12");
  });

  it("pulseNowHour_whenReportIsToday_thenReturnClockHour", () => {
    const clock = () => new Date(2026, 8, 12, 11, 30);
    expect(pulseNowHour("2026-09-12", clock)).toBe(11);
    expect(pulseNowHour("2026-09-11", clock)).toBeNull();
  });

  it("pulseRadioLabels_whenToday_thenBugunDun", () => {
    const clock = () => new Date(2026, 8, 12, 8);
    expect(pulseRadioLabels("2026-09-12", "2026-09-12", clock)).toEqual({
      current: "Bugün",
      previous: "Dün",
    });
  });

  it("pulseHourLabel_padsHour", () => {
    expect(pulseHourLabel(4)).toBe("04:00");
    expect(pulseHourLabel(11)).toBe("11:00");
  });

  it("keepActivePoints_dropsIdleHours", () => {
    const points = keepActivePoints([
      { label: "00:00", current: 0, previous: 0 },
      { label: "12:00", current: 80, previous: 50 },
      { label: "13:00", current: 0, previous: 0 },
      { label: "19:00", current: 120, previous: 0 },
      { label: "23:00", current: 0, previous: 0 },
    ]);
    expect(points.map((point) => point.label)).toEqual(["12:00", "19:00"]);
  });

  it("trimZeroEdges_keepsMiddleZeros", () => {
    const points = trimZeroEdges([
      { label: "A", current: 0, previous: 0 },
      { label: "B", current: 10, previous: 0 },
      { label: "C", current: 0, previous: 0 },
      { label: "D", current: 20, previous: 5 },
      { label: "E", current: 0, previous: 0 },
    ]);
    expect(points.map((point) => point.label)).toEqual(["B", "C", "D"]);
  });

  it("buildPulseArea_usesActiveHoursOnSingleDay", () => {
    const points = buildPulseArea(
      revenue({
        from: "2026-09-12",
        to: "2026-09-12",
        hourly: [
          { hour: 12, revenue: 80 },
          { hour: 19, revenue: 220 },
        ],
      }),
      revenue({
        from: "2026-09-11",
        to: "2026-09-11",
        hourly: [{ hour: 12, revenue: 40 }],
      }),
    );
    expect(points).toEqual([
      { label: "12:00", current: 80, previous: 40 },
      { label: "19:00", current: 220, previous: 0 },
    ]);
  });

  it("buildCiroWorthSeries_whenPaymentSplitPresent_thenCarriesCashAndCard", () => {
    const daily = buildCiroWorthSeries(
      revenue({
        from: "2026-09-11",
        to: "2026-09-12",
        daily: [
          { date: "2026-09-11", revenue: 100, cashRevenue: 60, cardRevenue: 40 },
          { date: "2026-09-12", revenue: 50, cashRevenue: 0, cardRevenue: 50 },
        ],
      }),
    );
    expect(daily.map((point) => [point.value, point.cash, point.card])).toEqual([
      [100, 60, 40],
      [50, 0, 50],
    ]);

    const legacy = buildCiroWorthSeries(
      revenue({
        from: "2026-09-11",
        to: "2026-09-12",
        daily: [
          { date: "2026-09-11", revenue: 100 },
          { date: "2026-09-12", revenue: 50 },
        ],
      }),
    );
    expect(legacy.every((point) => point.cash === undefined && point.card === undefined)).toBe(true);
  });

  it("buildCiroWorthSeries_trimsIdleEdges", () => {
    const daily = buildCiroWorthSeries(
      revenue({
        from: "2026-09-10",
        to: "2026-09-13",
        daily: [
          { date: "2026-09-11", revenue: 40 },
          { date: "2026-09-12", revenue: 80 },
        ],
      }),
    );
    expect(daily.map((point) => point.value)).toEqual([40, 80]);

    const hourly = buildCiroWorthSeries(
      revenue({
        from: "2026-09-12",
        to: "2026-09-12",
        hourly: [
          { hour: 12, revenue: 30 },
          { hour: 14, revenue: 50 },
        ],
      }),
    );
    expect(hourly).toEqual([
      { label: "12:00", value: 30 },
      { label: "13:00", value: 0 },
      { label: "14:00", value: 50 },
    ]);
  });

  it("compactAxis_prefixesLira", () => {
    expect(compactAxis(0)).toBe("₺0");
    expect(compactAxis(15000)).toBe("₺15K");
  });
});

describe("spark and category helpers", () => {
  it("compactAmount_usesKAndM", () => {
    expect(compactAmount(250_000)).toBe("250K");
    expect(compactAmount(1_200_000)).toBe("1,2M");
    expect(compactAmount(80)).toBe("80");
  });

  it("buildCiroSparkKpis_mapsOrderItemAndAov", () => {
    const items = buildCiroSparkKpis(
      revenue({
        kpis: { totalRevenue: 200, orderCount: 4, itemCount: 8, avgOrderValue: 50 },
        paymentBreakdown: { cardRevenue: 150, cashRevenue: 50 },
        daily: [
          { date: "2026-09-11", revenue: 80, orderCount: 2 },
          { date: "2026-09-12", revenue: 120, orderCount: 2 },
        ],
      }),
      revenue({ kpis: { totalRevenue: 100, orderCount: 2, itemCount: 4, avgOrderValue: 50 } }),
      (value) => `₺${value}`,
    );
    expect(items.map((item) => item.title)).toEqual(["Kasada kalan", "Sabit gider", "Ort. sepet", "Kalem / sipariş"]);
    expect(items[0]?.value).toBe("₺200");
    expect(items[0]?.delta).toBe(100);
    expect(items[2]?.series).toEqual([40, 60]);
    expect(items[3]?.value).toBe("2");
  });

  it("buildCategorySales_rollsExtraSlicesIntoDiger", () => {
    const mix = buildCategorySales(
      revenue({
        categories: [
          { name: "Pizza", quantity: 10, revenue: 400 },
          { name: "Burger", quantity: 4, revenue: 200 },
          { name: "Tatlı", quantity: 3, revenue: 100 },
          { name: "İçecek", quantity: 8, revenue: 80 },
          { name: "Salata", quantity: 1, revenue: 20 },
        ],
      }),
      undefined,
      (value) => `₺${value}`,
    );
    expect(mix.compact).toBe("800");
    expect(mix.slices.map((slice) => slice.name)).toEqual(["Pizza", "İçecek", "Burger", "Tatlı", "Diğer"]);
    expect(mix.slices[0]?.percent).toBe(50);
    expect(mix.slices[4]?.display).toBe("20");
  });

  it("buildTrafficSparkKpis_usesSessionAndOpenSeries", () => {
    const items = buildTrafficSparkKpis(
      visits({
        daily: [
          { date: "2026-09-11", sessions: 4, menuOpens: 5, productViews: 8 },
          { date: "2026-09-12", sessions: 6, menuOpens: 7, productViews: 16 },
        ],
      }),
    );
    expect(items.map((item) => item.title)).toEqual([
      "Menü açılış",
      "Kategori bakışı",
      "Ürün görüntüleme",
      "Ürün / oturum",
    ]);
    expect(items[0]?.series).toEqual([5, 7]);
    expect(items[2]?.series).toEqual([8, 16]);
  });
});
