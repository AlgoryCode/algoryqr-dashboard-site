import { describe, expect, it } from "vitest";

import {
  defaultOrderListFilters,
  hiddenOrderFilterCount,
  isLateOrder,
  matchesOrderTab,
  orderStatusTone,
  orderTabCounts,
  parseOrderListFilters,
  serializeOrderListFilters,
  visibleOrderTabs,
} from "@/lib/order-list";
import type { OrderResponse } from "@/lib/ordering-api";

const NOW = new Date("2026-11-10T12:00:00");

function order(id: number, status: string, minutesAgo: number): OrderResponse {
  return {
    id,
    status,
    createdAt: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
  } as OrderResponse;
}

describe("late orders", () => {
  it("flags open orders past the kitchen limit only", () => {
    expect(isLateOrder(order(1, "PREPARING", 25), NOW.getTime())).toBe(true);
    expect(isLateOrder(order(2, "PREPARING", 5), NOW.getTime())).toBe(false);
    expect(isLateOrder(order(3, "DELIVERED", 90), NOW.getTime())).toBe(false);
    expect(isLateOrder(order(4, "CANCELLED", 90), NOW.getTime())).toBe(false);
  });
});

describe("tabs", () => {
  const orders = [
    order(1, "PENDING", 2),
    order(2, "PREPARING", 40),
    order(3, "READY", 1),
    order(4, "DELIVERED", 60),
    order(5, "CANCELLED", 10),
  ];

  it("counts each tab", () => {
    const counts = orderTabCounts(orders, NOW.getTime());
    expect(counts).toMatchObject({ late: 1, preparing: 1, ready: 1, served: 1, cancelled: 1, all: 5 });
    expect(counts.open).toBeGreaterThanOrEqual(3);
  });

  it("matches the late tab", () => {
    expect(matchesOrderTab(orders[1], "late", NOW.getTime())).toBe(true);
    expect(matchesOrderTab(orders[2], "late", NOW.getTime())).toBe(false);
  });

  it("hides empty tabs except the fixed ones and the selected one", () => {
    const counts = orderTabCounts([order(1, "DELIVERED", 60)], NOW.getTime());
    expect(visibleOrderTabs(counts, "cancelled")).toEqual(["open", "served", "cancelled", "all"]);
  });
});

describe("status tone", () => {
  it("colours open work and keeps finished orders neutral", () => {
    expect(orderStatusTone("PENDING")).toBe("orange");
    expect(orderStatusTone("KITCHEN_PREPARING")).toBe("violet");
    expect(orderStatusTone("READY")).toBe("green");
    expect(orderStatusTone("CANCELLED")).toBe("red");
    expect(orderStatusTone("SERVED")).toBe("muted");
  });
});

describe("address round trip", () => {
  it("leaves the address empty for the defaults", () => {
    expect(serializeOrderListFilters(defaultOrderListFilters(NOW), NOW).toString()).toBe("");
  });

  it("restores presets, custom ranges and the other filters", () => {
    const filters = {
      tab: "late" as const,
      branch: 5,
      range: { from: "2026-11-01", to: "2026-11-05" },
      channel: "UBER_EATS" as const,
      query: "masa 4",
      page: 3,
    };
    expect(parseOrderListFilters(serializeOrderListFilters(filters, NOW), NOW)).toEqual(filters);

    const all = { ...defaultOrderListFilters(NOW), range: { from: "", to: "" } };
    expect(serializeOrderListFilters(all, NOW).get("tarih")).toBe("tumu");
    expect(parseOrderListFilters(serializeOrderListFilters(all, NOW), NOW).range).toEqual({ from: "", to: "" });
  });

  it("ignores values it does not know", () => {
    expect(parseOrderListFilters(new URLSearchParams("durum=x&sube=abc&kaynak=fax&sayfa=0&bas=dun"), NOW)).toEqual(
      defaultOrderListFilters(NOW),
    );
  });

  it("counts the filters kept in the mobile sheet", () => {
    expect(hiddenOrderFilterCount(defaultOrderListFilters(), new Date())).toBe(0);
    expect(hiddenOrderFilterCount({ ...defaultOrderListFilters(), branch: 5, channel: "QR" }, new Date())).toBe(2);
  });
});
