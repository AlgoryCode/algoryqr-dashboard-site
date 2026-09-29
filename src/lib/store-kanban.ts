import { nextOrderActions, normalizeOrderStatus } from "@/lib/order-flow";
import type { StoreOrderAction, StoreOrderStatus, StoreOrderSummary } from "@/lib/store-api";
import { STORE_ORDER_STATUS_LABEL } from "@/lib/store-ui";

export const DEFAULT_STORE_SLA_MINUTES = 30;

export const STORE_KANBAN_COLUMNS = [
  { id: "NEW", title: "Yeni Siparişler", statuses: ["PENDING", "CONFIRMED"] },
  { id: "KITCHEN", title: "Hazırlanıyor", statuses: ["PREPARING", "READY"] },
  { id: "TRANSIT", title: "Kuryede / Dağıtımda", statuses: ["ON_THE_WAY"] },
  { id: "DONE", title: "Teslim Edildi", statuses: ["DELIVERED"] },
] as const;

export type StoreKanbanColumnId = (typeof STORE_KANBAN_COLUMNS)[number]["id"];

export type StoreKanbanTabId = "all" | StoreKanbanColumnId;

export type StoreKanbanGroups = Record<StoreKanbanColumnId, StoreOrderSummary[]>;

export type StoreKanbanPrimaryAction = {
  action: StoreOrderAction;
  label: string;
};

const COLUMN_STATUS_SET: Record<StoreKanbanColumnId, ReadonlySet<StoreOrderStatus>> = {
  NEW: new Set(["PENDING", "CONFIRMED"]),
  KITCHEN: new Set([
    "PREPARING",
    "READY",
    "KITCHEN_PREPARING",
    "KITCHEN_PREPARED",
    "KITCHEN_DELIVERED_TO_WAITER",
    "WAITER_TAKEN",
  ]),
  TRANSIT: new Set([
    "ON_THE_WAY",
    "KITCHEN_DELIVERED_TO_COURIER",
    "WAITER_DELIVERED_TO_COURIER",
    "COURIER_TAKEN",
  ]),
  DONE: new Set(["DELIVERED", "WAITER_DELIVERED_TO_CUSTOMER", "COURIER_DELIVERED_TO_CUSTOMER"]),
};

export function storeKanbanColumnFor(status: StoreOrderStatus): StoreKanbanColumnId | null {
  for (const column of STORE_KANBAN_COLUMNS) {
    if (COLUMN_STATUS_SET[column.id].has(status)) return column.id;
  }
  return null;
}

export function emptyStoreKanbanGroups(): StoreKanbanGroups {
  return { NEW: [], KITCHEN: [], TRANSIT: [], DONE: [] };
}

export function groupStoreKanbanOrders(orders: StoreOrderSummary[]): StoreKanbanGroups {
  const groups = emptyStoreKanbanGroups();
  for (const order of orders) {
    const column = storeKanbanColumnFor(order.status);
    if (column) groups[column].push(order);
  }
  return groups;
}

export function matchesStoreKanbanQuery(order: StoreOrderSummary, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return true;
  const haystack = [
    order.orderNo,
    order.customerName,
    order.customerPhone,
    order.courier?.fullName,
    order.courier?.phone,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  return haystack.includes(needle);
}

export function storeOrderElapsedMinutes(from: string | null | undefined, now: number): number | null {
  if (!from) return null;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / 60_000));
}

export function isStoreKanbanDelayed(
  order: StoreOrderSummary,
  slaMinutes: number,
  now: number,
): boolean {
  if (order.status === "DELIVERED" || order.status === "REJECTED" || order.status === "CANCELLED") {
    return false;
  }
  const minutes = storeOrderElapsedMinutes(order.createdAt, now);
  return minutes != null && minutes >= slaMinutes;
}

export function storeKanbanPrepProgress(
  createdAt: string,
  slaMinutes: number,
  now: number,
): { percent: number; remainingMinutes: number } {
  const elapsed = storeOrderElapsedMinutes(createdAt, now) ?? 0;
  const remainingMinutes = Math.max(0, slaMinutes - elapsed);
  const percent = slaMinutes <= 0 ? 100 : Math.min(95, Math.round((elapsed / slaMinutes) * 100));
  return { percent, remainingMinutes };
}

export function storeKanbanRemainingMinutes(
  createdAt: string,
  slaMinutes: number,
  now: number,
): number | null {
  const elapsed = storeOrderElapsedMinutes(createdAt, now);
  if (elapsed == null) return null;
  return slaMinutes - elapsed;
}

export function storeKanbanClock(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function storeKanbanSyncClock(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function storeKanbanSlaTargetLabel(
  createdAt: string,
  slaMinutes: number,
  now: number,
): string {
  const remaining = storeKanbanRemainingMinutes(createdAt, slaMinutes, now);
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime()) || remaining == null) return `${slaMinutes} dk SLA`;
  const deadline = new Date(start.getTime() + slaMinutes * 60_000);
  const clock = storeKanbanClock(deadline);
  if (remaining <= 0) return `${clock} (Kritik Termin)`;
  return `${clock} (${remaining} dk kaldı)`;
}

export function storeKanbanInitials(name: string | null | undefined): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "QR";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toLocaleUpperCase("tr-TR");
}

export function storeKanbanChipLabel(
  order: StoreOrderSummary,
  delayed: boolean,
  elapsedMinutes?: number | null,
  prepPercent?: number | null,
): string {
  if (delayed && (order.status === "PENDING" || order.status === "CONFIRMED")) {
    return elapsedMinutes != null ? `Onay Bekliyor (${elapsedMinutes} dk)` : "Onay Bekliyor";
  }
  if (order.status === "PENDING") return "Online Sipariş";
  if (order.status === "CONFIRMED") return "Onaylandı";
  if (order.status === "PREPARING") {
    return prepPercent != null ? `Hazırlık Aşaması (%${prepPercent})` : "Hazırlık Aşaması";
  }
  if (order.status === "READY") return "Sipariş Hazır";
  if (order.status === "ON_THE_WAY") return "Canlı Takipte";
  if (order.status === "DELIVERED") return "Başarılı";
  return STORE_ORDER_STATUS_LABEL[order.status];
}

export function storeKanbanPrimaryAction(
  order: StoreOrderSummary,
  delayed = false,
): StoreKanbanPrimaryAction | null {
  if (order.status === "PENDING") {
    return { action: "confirm", label: delayed ? "Hızlı Onay Ver" : "Onayla" };
  }
  const steps = nextOrderActions(order.status, {
    kitchenEnabled: true,
    courierEnabled: order.deliveryType === "DELIVERY",
    delivery: order.deliveryType === "DELIVERY",
  });
  const first = steps[0];
  if (!first) return null;
  if (order.deliveryType === "DELIVERY" && !order.courier && first.action.includes("Courier")) {
    return null;
  }
  return { action: first.action, label: first.label };
}

export function storeKanbanCanReject(order: StoreOrderSummary): boolean {
  return order.status === "PENDING";
}

export function storeKanbanAssignCourier(order: StoreOrderSummary): boolean {
  const status = normalizeOrderStatus(order.status, order.deliveryType === "DELIVERY");
  return (
    order.deliveryType === "DELIVERY" &&
    !order.courier &&
    (status === "KITCHEN_PREPARED" || status === "KITCHEN_DELIVERED_TO_COURIER")
  );
}

export function countOpenStoreOrders(openCounts: Partial<Record<StoreOrderStatus, number>>): number {
  return (
    (openCounts.PENDING ?? 0) +
    (openCounts.CONFIRMED ?? 0) +
    (openCounts.PREPARING ?? 0) +
    (openCounts.READY ?? 0) +
    (openCounts.ON_THE_WAY ?? 0) +
    (openCounts.KITCHEN_PREPARING ?? 0) +
    (openCounts.KITCHEN_PREPARED ?? 0) +
    (openCounts.KITCHEN_DELIVERED_TO_WAITER ?? 0) +
    (openCounts.KITCHEN_DELIVERED_TO_COURIER ?? 0) +
    (openCounts.WAITER_TAKEN ?? 0) +
    (openCounts.COURIER_TAKEN ?? 0) +
    (openCounts.WAITER_DELIVERED_TO_COURIER ?? 0)
  );
}
