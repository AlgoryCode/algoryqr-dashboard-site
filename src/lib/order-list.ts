import {
  dateRangeForPreset,
  detectDateRangePreset,
  todayDateRange,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-filter";
import { readList, writeList } from "@/lib/filter-params";
import { KITCHEN_KANBAN_SLA_MINUTES } from "@/lib/kitchen-queue";
import {
  isOpenOrderStatus,
  matchesStatusFilter,
  ORDER_CHANNELS,
  orderTimestamp,
  type OrderChannel,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

export const ORDER_PAGE_SIZE = 25;

/** Same limit the kitchen screen uses before it flags a ticket. */
export const ORDER_LATE_MINUTES = KITCHEN_KANBAN_SLA_MINUTES;

export const ORDER_TABS = ["open", "late", "pending", "preparing", "ready", "served", "cancelled", "all"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const ORDER_TAB_LABEL: Record<OrderTab, string> = {
  open: "Aktif",
  late: "Gecikmiş",
  pending: "Onay bekliyor",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  served: "Tamamlanan",
  cancelled: "İptal",
  all: "Tümü",
};

/** Tabs that stay visible even when empty, so the row never jumps around. */
const ALWAYS_VISIBLE_TABS = new Set<OrderTab>(["open", "served", "all"]);

export type OrderListFilters = {
  tab: OrderTab;
  /** Empty means every branch. */
  branches: number[];
  range: DateRangeValue;
  /** Empty means every source. */
  channels: OrderChannel[];
  query: string;
  page: number;
};

export function defaultOrderListFilters(now = new Date()): OrderListFilters {
  return { tab: "open", branches: [], range: dateRangeForPreset("today", now), channels: [], query: "", page: 1 };
}

export function orderAgeMinutes(order: OrderResponse, now = Date.now()): number | null {
  const timestamp = orderTimestamp(order);
  if (timestamp == null) return null;
  return Math.max(0, Math.floor((now - timestamp) / 60_000));
}

export function isLateOrder(order: OrderResponse, now = Date.now()): boolean {
  if (!isOpenOrderStatus(order.status)) return false;
  const age = orderAgeMinutes(order, now);
  return age != null && age >= ORDER_LATE_MINUTES;
}

export function matchesOrderTab(order: OrderResponse, tab: OrderTab, now = Date.now()): boolean {
  if (tab === "late") return isLateOrder(order, now);
  return matchesStatusFilter(order.status, tab);
}

export function orderTabCounts(orders: OrderResponse[], now = Date.now()): Record<OrderTab, number> {
  const counts = Object.fromEntries(ORDER_TABS.map((tab) => [tab, 0])) as Record<OrderTab, number>;
  for (const order of orders) {
    for (const tab of ORDER_TABS) {
      if (matchesOrderTab(order, tab, now)) counts[tab] += 1;
    }
  }
  return counts;
}

export function visibleOrderTabs(counts: Record<OrderTab, number>, selected: OrderTab): OrderTab[] {
  return ORDER_TABS.filter((tab) => ALWAYS_VISIBLE_TABS.has(tab) || tab === selected || counts[tab] > 0);
}

export { orderStatusTone } from "@/lib/badge-tones";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRESET_PARAM: Partial<Record<DateRangePreset, string>> = {
  all: "tumu",
  yesterday: "dun",
  "7d": "7g",
  "30d": "30g",
};
const PARAM_PRESET = Object.fromEntries(Object.entries(PRESET_PARAM).map(([preset, param]) => [param, preset])) as Record<
  string,
  Exclude<DateRangePreset, "custom" | "today">
>;

export function parseOrderListFilters(params: URLSearchParams, now = new Date()): OrderListFilters {
  const defaults = defaultOrderListFilters(now);
  const tab = params.get("durum");
  const page = Number(params.get("sayfa"));
  const preset = PARAM_PRESET[params.get("tarih") ?? ""];
  const from = params.get("bas") ?? "";
  const to = params.get("bit") ?? "";

  let range = defaults.range;
  if (preset) range = dateRangeForPreset(preset, now);
  else if (DATE_PATTERN.test(from) && DATE_PATTERN.test(to)) range = from <= to ? { from, to } : { from: to, to: from };

  return {
    tab: ORDER_TABS.includes(tab as OrderTab) ? (tab as OrderTab) : defaults.tab,
    branches: readList(params, "sube")
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0),
    range,
    channels: readList(params, "kaynak", ORDER_CHANNELS),
    query: params.get("ara") ?? "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeOrderListFilters(filters: OrderListFilters, now = new Date()): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== "open") params.set("durum", filters.tab);
  writeList(params, "sube", filters.branches.map(String));
  const preset = detectDateRangePreset(filters.range, now);
  if (preset === "custom") {
    params.set("bas", filters.range.from);
    params.set("bit", filters.range.to);
  } else if (preset !== "today") {
    params.set("tarih", PRESET_PARAM[preset] ?? "tumu");
  }
  writeList(params, "kaynak", filters.channels);
  if (filters.query.trim()) params.set("ara", filters.query.trim());
  if (filters.page > 1) params.set("sayfa", String(filters.page));
  return params;
}

/** Filters a mobile user cannot see without opening the filter sheet. */
export function hiddenOrderFilterCount(filters: OrderListFilters, now = new Date()): number {
  const today = todayDateRange();
  const dateChanged =
    detectDateRangePreset(filters.range, now) !== "today" ||
    filters.range.from !== today.from ||
    filters.range.to !== today.to;
  return [filters.branches.length > 0, filters.channels.length > 0, dateChanged].filter(Boolean).length;
}
