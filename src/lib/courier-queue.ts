import type { CourierTicket } from "@/lib/store-courier";

export const COURIER_FLOW_STEP_LABEL = {
  PREPARING: "Mutfakta",
  READY: "Hazır",
  ON_THE_WAY: "Yolda",
  DELIVERED: "Teslim edildi",
} as const;

export const COURIER_COLUMNS = [
  { id: "PREPARING", title: COURIER_FLOW_STEP_LABEL.PREPARING },
  { id: "READY", title: COURIER_FLOW_STEP_LABEL.READY },
  { id: "ON_THE_WAY", title: COURIER_FLOW_STEP_LABEL.ON_THE_WAY },
  { id: "DELIVERED", title: COURIER_FLOW_STEP_LABEL.DELIVERED },
] as const;

export type CourierColumnId = (typeof COURIER_COLUMNS)[number]["id"];

export const COURIER_KANBAN_SLA_MINUTES = 30;

export const COURIER_KANBAN_COLUMN_TITLE: Record<CourierColumnId, string> = {
  PREPARING: "Mutfakta",
  READY: "Teslim Al",
  ON_THE_WAY: "Yolda",
  DELIVERED: "Teslim Edildi",
};

export type CourierQueueGroups = Record<CourierColumnId, CourierTicket[]>;

export function courierKanbanColumnTitle(columnId: CourierColumnId): string {
  return COURIER_KANBAN_COLUMN_TITLE[columnId];
}

export function emptyCourierGroups(): CourierQueueGroups {
  return { PREPARING: [], READY: [], ON_THE_WAY: [], DELIVERED: [] };
}

export function courierColumnFor(status: string | null | undefined): CourierColumnId | null {
  const normalized = (status ?? "").trim().toUpperCase();
  if (normalized === "PREPARING") return "PREPARING";
  if (normalized === "READY") return "READY";
  if (normalized === "ON_THE_WAY") return "ON_THE_WAY";
  if (normalized === "DELIVERED") return "DELIVERED";
  return null;
}

export function groupCourierOrders(orders: CourierTicket[]): CourierQueueGroups {
  const groups = emptyCourierGroups();
  for (const order of orders) {
    const column = courierColumnFor(order.status);
    if (column) groups[column].push(order);
  }
  return groups;
}

export function courierOrderKey(order: Pick<CourierTicket, "id">): string {
  return `COURIER:${order.id}`;
}

export function mergeCourierOrders(primary: CourierTicket[], extra: CourierTicket[]): CourierTicket[] {
  const byKey = new Map<string, CourierTicket>();
  for (const order of [...primary, ...extra]) {
    byKey.set(courierOrderKey(order), order);
  }
  return [...byKey.values()].sort((a, b) => {
    const aTime = orderTimestamp(a.readyAt || a.createdAt);
    const bTime = orderTimestamp(b.readyAt || b.createdAt);
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });
}

function orderTimestamp(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function matchesCourierKanbanQuery(order: CourierTicket, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return true;
  const haystack = [
    order.orderNo,
    String(order.id),
    order.customerName,
    order.customerPhone,
    order.deliveryAddress,
    order.courierName,
    order.courierPhone,
    ...(order.items ?? []).map((item) => item.productName),
  ]
    .filter((part): part is string => Boolean(part && String(part).trim()))
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  return haystack.includes(needle);
}

export function courierTicketStartedAt(order: Pick<CourierTicket, "readyAt" | "createdAt" | "dispatchedAt">): string | null {
  return order.readyAt || order.createdAt || null;
}

export function courierElapsedMinutes(
  order: Pick<CourierTicket, "readyAt" | "createdAt" | "dispatchedAt" | "deliveredAt" | "status">,
  now: number,
): number | null {
  const start = order.status === "ON_THE_WAY" || order.status === "DELIVERED"
    ? order.dispatchedAt || courierTicketStartedAt(order)
    : courierTicketStartedAt(order);
  if (!start) return null;
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return null;
  const end = order.deliveredAt ? new Date(order.deliveredAt).getTime() : now;
  const endMs = Number.isNaN(end) ? now : end;
  return Math.max(0, Math.floor((endMs - startMs) / 60_000));
}

export function isCourierTicketDelayed(
  order: Pick<CourierTicket, "status" | "readyAt" | "createdAt" | "dispatchedAt" | "deliveredAt">,
  now: number,
  slaMinutes = COURIER_KANBAN_SLA_MINUTES,
): boolean {
  if (order.status === "DELIVERED" || order.status === "PREPARING") return false;
  const minutes = courierElapsedMinutes(order, now);
  return minutes != null && minutes >= slaMinutes;
}

export function formatCourierElapsed(from?: string | null, now = Date.now()): string | null {
  if (!from) return null;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return null;
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function courierTicketElapsedLabel(
  order: Pick<CourierTicket, "status" | "readyAt" | "createdAt" | "dispatchedAt" | "deliveredAt">,
  now = Date.now(),
): string | null {
  const start =
    order.status === "ON_THE_WAY" || order.status === "DELIVERED"
      ? order.dispatchedAt || courierTicketStartedAt(order)
      : courierTicketStartedAt(order);
  if (!start) return null;
  const end = order.deliveredAt ? new Date(order.deliveredAt).getTime() : now;
  const endTime = Number.isNaN(end) ? now : end;
  return formatCourierElapsed(start, endTime);
}

export function courierPrimaryAction(
  order: Pick<CourierTicket, "status">,
): { action: "dispatch" | "deliver"; label: string } | null {
  if (order.status === "READY") return { action: "dispatch", label: "Yola çık" };
  if (order.status === "ON_THE_WAY") return { action: "deliver", label: "Teslim edildi" };
  return null;
}
