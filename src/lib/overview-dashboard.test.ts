import { describe, expect, it } from "vitest";

import type { OrderResponse } from "@/lib/ordering-api";
import {
  isNegativeFeedback,
  overviewDayKeys,
  percentDelta,
  sortOverviewAlerts,
  summarizeDailyRevenue,
  summarizeOrderQueue,
  unclosedPastShifts,
  type OverviewAlert,
} from "@/lib/overview-dashboard";

function order(partial: Partial<OrderResponse> & Pick<OrderResponse, "id" | "status">): OrderResponse {
  return { ...partial } as OrderResponse;
}

describe("overviewDayKeys", () => {
  it("returns today, yesterday and the same weekday last week", () => {
    const keys = overviewDayKeys(new Date(2026, 8, 29, 14, 0));
    expect(keys).toEqual({
      today: "2026-09-29",
      yesterday: "2026-09-28",
      lastWeek: "2026-09-22",
      weekStart: "2026-09-23",
    });
  });

  it("crosses month boundaries", () => {
    const keys = overviewDayKeys(new Date(2026, 9, 1, 9, 0));
    expect(keys.yesterday).toBe("2026-09-30");
    expect(keys.lastWeek).toBe("2026-09-24");
  });
});

describe("summarizeDailyRevenue", () => {
  const keys = { today: "2026-09-29", yesterday: "2026-09-28", lastWeek: "2026-09-22" };

  it("sums every branch report per day and derives the average basket", () => {
    const summary = summarizeDailyRevenue(
      [
        {
          kpis: { currency: "TRY" },
          daily: [
            { date: "2026-09-29", revenue: "300", orderCount: 3 },
            { date: "2026-09-28", revenue: 200, orderCount: 2 },
            { date: "2026-09-22", revenue: 100, orderCount: 1 },
            { date: "2026-09-25", revenue: 999, orderCount: 9 },
          ],
        },
        {
          kpis: {},
          daily: [{ date: "2026-09-29T00:00:00", revenue: 100, orderCount: 1 }],
        },
      ],
      keys,
    );
    expect(summary.today).toEqual({ revenue: 400, orders: 4, avgBasket: 100 });
    expect(summary.yesterday).toEqual({ revenue: 200, orders: 2, avgBasket: 100 });
    expect(summary.lastWeek).toEqual({ revenue: 100, orders: 1, avgBasket: 100 });
    expect(summary.currency).toBe("TRY");
  });

  it("keeps the average basket at zero when there are no orders", () => {
    const summary = summarizeDailyRevenue([{ kpis: {}, daily: [] }], keys);
    expect(summary.today.avgBasket).toBe(0);
  });
});

describe("percentDelta", () => {
  it("compares against the previous value", () => {
    expect(percentDelta(150, 100)).toBe(50);
    expect(percentDelta(50, 100)).toBe(-50);
  });

  it("returns null when there is nothing to compare with", () => {
    expect(percentDelta(100, 0)).toBeNull();
  });
});

describe("summarizeOrderQueue", () => {
  const now = new Date(2026, 8, 29, 14, 0).getTime();
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  it("counts approvals, delays and today's cancellations", () => {
    const queue = summarizeOrderQueue(
      [
        order({ id: 1, status: "PENDING", submittedAt: minutesAgo(2) }),
        order({ id: 2, status: "SUBMITTED", submittedAt: minutesAgo(40) }),
        order({ id: 3, status: "PREPARING", confirmedAt: minutesAgo(35), submittedAt: minutesAgo(36) }),
        order({ id: 4, status: "PREPARING", confirmedAt: minutesAgo(5), submittedAt: minutesAgo(6) }),
        order({ id: 5, status: "CANCELLED", submittedAt: minutesAgo(60), updatedAt: minutesAgo(30) }),
        order({
          id: 6,
          status: "REJECTED",
          submittedAt: minutesAgo(60 * 30),
          rejectedAt: minutesAgo(60 * 29),
        }),
        order({ id: 7, status: "WAITER_DELIVERED_TO_CUSTOMER", submittedAt: minutesAgo(90) }),
      ],
      now,
    );
    expect(queue.pendingApproval).toBe(2);
    expect(queue.delayed).toBe(2);
    expect(queue.cancelledToday).toBe(1);
    expect(queue.open).toBe(4);
  });
});

describe("unclosedPastShifts", () => {
  it("flags only shifts left open from an earlier day", () => {
    const shifts = unclosedPastShifts(
      [
        { shiftId: 1, openedAt: "2026-09-28T09:00:00", status: "OPEN" },
        { shiftId: 2, openedAt: "2026-09-29T09:00:00", status: "OPEN" },
        { shiftId: 3, openedAt: "2026-09-27T09:00:00", closedAt: "2026-09-27T23:00:00", status: "CLOSED" },
      ],
      "2026-09-29",
    );
    expect(shifts.map((shift) => shift.shiftId)).toEqual([1]);
  });
});

describe("isNegativeFeedback", () => {
  const since = new Date("2026-09-26T00:00:00Z").getTime();

  it("keeps recent low scores", () => {
    expect(isNegativeFeedback({ score: 2, createdAt: "2026-09-28T10:00:00Z" }, since)).toBe(true);
    expect(isNegativeFeedback({ score: 4, createdAt: "2026-09-28T10:00:00Z" }, since)).toBe(false);
    expect(isNegativeFeedback({ score: 1, createdAt: "2026-09-20T10:00:00Z" }, since)).toBe(false);
  });
});

describe("sortOverviewAlerts", () => {
  it("puts the most urgent alerts first", () => {
    const base = { kind: "stock", title: "", detail: "", href: "", actionLabel: "" } as const;
    const alerts: OverviewAlert[] = [
      { ...base, id: "a", tone: "info" },
      { ...base, id: "b", tone: "danger" },
      { ...base, id: "c", tone: "warning" },
    ];
    expect(sortOverviewAlerts(alerts).map((alert) => alert.id)).toEqual(["b", "c", "a"]);
  });
});
