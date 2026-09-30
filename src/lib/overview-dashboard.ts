import type { MenuRevenueReportResponse } from "@/lib/api";
import { isKitchenTicketDelayed } from "@/lib/kitchen-queue";
import { normalizeOrderStatus } from "@/lib/order-flow";
import { isOpenOrderStatus, orderTimestamp } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

export type OverviewDayKeys = {
  today: string;
  yesterday: string;
  lastWeek: string;
  weekStart: string;
};

export type OverviewDayTotals = {
  revenue: number;
  orders: number;
  avgBasket: number;
};

export type OverviewTodaySummary = {
  today: OverviewDayTotals;
  yesterday: OverviewDayTotals;
  lastWeek: OverviewDayTotals;
  currency: string;
};

export type OverviewOrderQueue = {
  pendingApproval: number;
  delayed: number;
  cancelledToday: number;
  open: number;
};

export type OverviewAlertTone = "danger" | "warning" | "info";

export type OverviewAlertKind =
  | "stock"
  | "reservation"
  | "feedback"
  | "debt"
  | "shift";

export type OverviewAlert = {
  id: string;
  kind: OverviewAlertKind;
  tone: OverviewAlertTone;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
};

export type OverviewShiftRow = {
  shiftId: number;
  openedAt: string;
  closedAt?: string | null;
  status: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDays(now: Date, days: number): Date {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function overviewDayKeys(now = new Date()): OverviewDayKeys {
  return {
    today: formatYmd(now),
    yesterday: formatYmd(shiftDays(now, -1)),
    lastWeek: formatYmd(shiftDays(now, -7)),
    weekStart: formatYmd(shiftDays(now, -6)),
  };
}

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dayTotals(revenue: number, orders: number): OverviewDayTotals {
  return { revenue, orders, avgBasket: orders > 0 ? revenue / orders : 0 };
}

export function summarizeDailyRevenue(
  reports: Array<Pick<MenuRevenueReportResponse, "daily" | "kpis">>,
  keys: Pick<OverviewDayKeys, "today" | "yesterday" | "lastWeek">,
): OverviewTodaySummary {
  const sums = {
    today: { revenue: 0, orders: 0 },
    yesterday: { revenue: 0, orders: 0 },
    lastWeek: { revenue: 0, orders: 0 },
  };
  let currency = "TRY";
  for (const report of reports) {
    if (report.kpis?.currency) currency = report.kpis.currency;
    for (const point of report.daily ?? []) {
      const date = point.date.slice(0, 10);
      const bucket =
        date === keys.today
          ? sums.today
          : date === keys.yesterday
            ? sums.yesterday
            : date === keys.lastWeek
              ? sums.lastWeek
              : null;
      if (!bucket) continue;
      bucket.revenue += toNumber(point.revenue);
      bucket.orders += point.orderCount ?? 0;
    }
  }
  return {
    today: dayTotals(sums.today.revenue, sums.today.orders),
    yesterday: dayTotals(sums.yesterday.revenue, sums.yesterday.orders),
    lastWeek: dayTotals(sums.lastWeek.revenue, sums.lastWeek.orders),
    currency,
  };
}

export function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function isAwaitingApproval(order: Pick<OrderResponse, "status">): boolean {
  const status = normalizeOrderStatus(order.status);
  return status === "PENDING" || status === "SUBMITTED";
}

function isCancelled(order: Pick<OrderResponse, "status">): boolean {
  const status = normalizeOrderStatus(order.status);
  return status === "CANCELLED" || status === "REJECTED";
}

function isSameLocalDay(timestamp: number, ymd: string): boolean {
  return formatYmd(new Date(timestamp)) === ymd;
}

export function summarizeOrderQueue(orders: OrderResponse[], now = Date.now()): OverviewOrderQueue {
  const today = formatYmd(new Date(now));
  let pendingApproval = 0;
  let delayed = 0;
  let cancelledToday = 0;
  let open = 0;
  for (const order of orders) {
    if (isCancelled(order)) {
      const changedAt = order.rejectedAt || order.updatedAt;
      const timestamp = changedAt ? new Date(changedAt).getTime() : orderTimestamp(order);
      if (timestamp != null && !Number.isNaN(timestamp) && isSameLocalDay(timestamp, today)) {
        cancelledToday += 1;
      }
      continue;
    }
    if (!isOpenOrderStatus(order.status)) continue;
    open += 1;
    if (isAwaitingApproval(order)) pendingApproval += 1;
    if (isKitchenTicketDelayed(order, now)) delayed += 1;
  }
  return { pendingApproval, delayed, cancelledToday, open };
}

export function unclosedPastShifts(shifts: OverviewShiftRow[], todayYmd: string): OverviewShiftRow[] {
  return shifts.filter(
    (shift) =>
      shift.status !== "CLOSED" && !shift.closedAt && shift.openedAt.slice(0, 10) < todayYmd,
  );
}

export function isNegativeFeedback(
  item: { score: number; createdAt?: string | null },
  sinceMs: number,
): boolean {
  if (item.score > 2) return false;
  if (!item.createdAt) return false;
  const at = new Date(item.createdAt).getTime();
  return Number.isFinite(at) && at >= sinceMs;
}

const TONE_RANK: Record<OverviewAlertTone, number> = { danger: 0, warning: 1, info: 2 };

export function sortOverviewAlerts(alerts: OverviewAlert[]): OverviewAlert[] {
  return [...alerts].sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}
