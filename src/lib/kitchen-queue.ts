import type { OrderResponse } from "@/lib/ordering-api";

export type KitchenBoardMode = "kitchen" | "owner" | "waiter";

/** Shared with merchant “Mutfak adımları” so both screens use the same vocabulary. */
export const KITCHEN_FLOW_STEP_LABEL = {
  CONFIRMED: "Onaylandı",
  PREPARING: "Mutfakta",
  READY: "Hazır",
  COURIER: "Kurye teslimi",
  DELIVERED: "Teslim edildi",
  WAITER_HANDOVER: "Garsona teslim",
} as const;

export const KITCHEN_COLUMNS = [
  { id: "CONFIRMED", title: KITCHEN_FLOW_STEP_LABEL.CONFIRMED },
  { id: "PREPARING", title: KITCHEN_FLOW_STEP_LABEL.PREPARING },
  { id: "READY", title: KITCHEN_FLOW_STEP_LABEL.READY },
  { id: "SERVED", title: KITCHEN_FLOW_STEP_LABEL.WAITER_HANDOVER },
] as const;

export type KitchenColumnId = (typeof KITCHEN_COLUMNS)[number]["id"];

export type KitchenFlowStep = {
  status: string;
  label: string;
};

export function kitchenColumnTitle(columnId: KitchenColumnId, mode: KitchenBoardMode): string {
  if (columnId === "SERVED") {
    return mode === "kitchen" ? KITCHEN_FLOW_STEP_LABEL.WAITER_HANDOVER : "Müşteriye teslim";
  }
  const column = KITCHEN_COLUMNS.find((item) => item.id === columnId);
  return column?.title ?? columnId;
}

/** Operational kanban titles on the kitchen display (separate from merchant step labels). */
export const KITCHEN_KANBAN_SLA_MINUTES = 20;

export const KITCHEN_KANBAN_COLUMN_TITLE: Record<KitchenColumnId, string> = {
  CONFIRMED: "Yeni Siparişler",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  SERVED: "Teslim Edildi",
};

export function kitchenKanbanColumnTitle(columnId: KitchenColumnId): string {
  return KITCHEN_KANBAN_COLUMN_TITLE[columnId];
}

export function matchesKitchenKanbanQuery(order: OrderResponse, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return true;
  const haystack = [
    order.orderNumber,
    order.externalOrderId,
    String(order.id),
    order.customerName,
    order.customerPhone,
    order.tableName,
    order.deliveryAddress,
    kitchenTableLabel(order),
    kitchenOrderOriginLabel(kitchenOrderOrigin(order)),
    ...(order.items ?? []).map((item) => item.productName),
  ]
    .filter((part): part is string => Boolean(part && String(part).trim()))
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  return haystack.includes(needle);
}

export function kitchenElapsedMinutes(
  order: Pick<OrderResponse, "confirmedAt" | "submittedAt" | "createdAt" | "servedAt">,
  now: number,
): number | null {
  const start = kitchenTicketStartedAt(order);
  if (!start) return null;
  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return null;
  const end = order.servedAt ? new Date(order.servedAt).getTime() : now;
  const endMs = Number.isNaN(end) ? now : end;
  return Math.max(0, Math.floor((endMs - startMs) / 60_000));
}

export function isKitchenTicketDelayed(
  order: Pick<OrderResponse, "status" | "confirmedAt" | "submittedAt" | "createdAt" | "servedAt">,
  now: number,
  slaMinutes = KITCHEN_KANBAN_SLA_MINUTES,
): boolean {
  if (order.status === "SERVED" || order.status === "ON_THE_WAY" || order.status === "DELIVERED") {
    return false;
  }
  const minutes = kitchenElapsedMinutes(order, now);
  return minutes != null && minutes >= slaMinutes;
}

export function kitchenPrepProgress(
  order: Pick<OrderResponse, "confirmedAt" | "submittedAt" | "createdAt">,
  now: number,
  slaMinutes = KITCHEN_KANBAN_SLA_MINUTES,
): { percent: number; remainingMinutes: number } {
  const elapsed = kitchenElapsedMinutes(order, now) ?? 0;
  const remainingMinutes = Math.max(0, slaMinutes - elapsed);
  const percent = slaMinutes <= 0 ? 100 : Math.min(95, Math.round((elapsed / slaMinutes) * 100));
  return { percent, remainingMinutes };
}

export type KitchenQueueGroups = Record<KitchenColumnId, OrderResponse[]>;

/** Served tickets whose bill is already closed leave the board. Other tables stay. */
export function servedBillIds(orders: OrderResponse[]): number[] {
  const ids = new Set<number>();
  for (const order of orders) {
    if (order.status !== "SERVED" || order.billId == null || order.billId <= 0) continue;
    ids.add(order.billId);
  }
  return [...ids].sort((a, b) => a - b);
}

export function withoutClosedBillTickets(
  orders: OrderResponse[],
  closedBillIds: ReadonlySet<number>,
): OrderResponse[] {
  if (closedBillIds.size === 0) return orders;
  return orders.filter((order) => {
    if (order.status !== "SERVED") return true;
    return order.billId == null || !closedBillIds.has(order.billId);
  });
}

export function groupKitchenOrders(orders: OrderResponse[]): KitchenQueueGroups {
  const groups: KitchenQueueGroups = {
    CONFIRMED: [],
    PREPARING: [],
    READY: [],
    SERVED: [],
  };
  for (const order of orders) {
    if (order.status === "CONFIRMED") groups.CONFIRMED.push(order);
    else if (order.status === "PREPARING") groups.PREPARING.push(order);
    else if (order.status === "READY") groups.READY.push(order);
    else if (order.status === "SERVED" || order.status === "ON_THE_WAY") groups.SERVED.push(order);
  }
  return groups;
}

export function kitchenTableLabel(order: Pick<OrderResponse, "tableName" | "tableId" | "orderSource" | "customerName">): string {
  const origin = kitchenOrderOrigin(order);
  if (origin !== "TABLE") {
    const customer = order.customerName?.trim();
    if (customer) return customer;
    return kitchenOrderOriginLabel(origin);
  }
  const name = order.tableName?.trim();
  if (name) return name;
  if (order.tableId != null) return `Masa ${order.tableId}`;
  return "Masa";
}

export type KitchenOrderOrigin = "TABLE" | "ONLINE" | "PHONE" | "UBER_EATS" | "YEMEKSEPETI";

function normalizeKitchenSource(value?: string | null): string {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function kitchenOrderOrigin(
  order: Pick<OrderResponse, "orderSource" | "tableName" | "tableId">,
): KitchenOrderOrigin {
  const source = normalizeKitchenSource(order.orderSource);
  if (source === "UBER_EATS" || source === "UBEREATS" || source === "UBER") {
    return "UBER_EATS";
  }
  if (source === "YEMEKSEPETI" || source === "YEMEK_SEPETI" || source === "YS") {
    return "YEMEKSEPETI";
  }
  if (source === "PHONE") return "PHONE";
  if (
    source === "STORE" ||
    source === "ONLINE" ||
    source === "ONLINE_ORDER" ||
    source === "WEB" ||
    source === "ALGORY" ||
    source === "ALGORYQR"
  ) {
    return "ONLINE";
  }

  const name = order.tableName?.trim().toLocaleLowerCase("tr") ?? "";
  if (name.includes("uber")) return "UBER_EATS";
  if (name.includes("yemeksepeti") || name.includes("yemek sepeti")) return "YEMEKSEPETI";
  if (name.includes("online") || name === "mağaza" || name === "magaza") return "ONLINE";
  return "TABLE";
}

export function kitchenOrderOriginLabel(origin: KitchenOrderOrigin): string {
  switch (origin) {
    case "UBER_EATS":
      return "Uber Eats";
    case "YEMEKSEPETI":
      return "Yemeksepeti";
    case "ONLINE":
      return "Online";
    case "PHONE":
      return "Telefon";
    default:
      return "Masa";
  }
}

function isPickupDelivery(deliveryType?: string | null): boolean {
  const delivery = (deliveryType ?? "").trim().toUpperCase();
  return delivery === "PICKUP" || delivery === "STORE";
}

export function kitchenUsesCourier(origin: KitchenOrderOrigin, deliveryType?: string | null): boolean {
  if (origin === "TABLE") return false;
  if ((origin === "ONLINE" || origin === "PHONE") && isPickupDelivery(deliveryType)) return false;
  return true;
}

export function kitchenSkipsPreparing(origin: KitchenOrderOrigin): boolean {
  return origin === "UBER_EATS" || origin === "YEMEKSEPETI";
}

export function kitchenAllowsNote(origin: KitchenOrderOrigin): boolean {
  return origin === "TABLE" || origin === "ONLINE" || origin === "PHONE";
}

export function kitchenReadyHandoverLabel(origin: KitchenOrderOrigin, deliveryType?: string | null): string {
  if (kitchenUsesCourier(origin, deliveryType)) return "Kurye teslimi bekleniyor";
  if (origin === "TABLE") return "Garsona teslim bekleniyor";
  return "Gel-al teslimi bekleniyor";
}

export function kitchenTicketFlowSteps(
  origin: KitchenOrderOrigin,
  deliveryType?: string | null,
): KitchenFlowStep[] {
  const steps: KitchenFlowStep[] = [{ status: "CONFIRMED", label: KITCHEN_FLOW_STEP_LABEL.CONFIRMED }];
  if (!kitchenSkipsPreparing(origin)) {
    steps.push({ status: "PREPARING", label: KITCHEN_FLOW_STEP_LABEL.PREPARING });
  }
  steps.push({ status: "READY", label: KITCHEN_FLOW_STEP_LABEL.READY });
  if (kitchenUsesCourier(origin, deliveryType)) {
    steps.push({ status: "ON_THE_WAY", label: KITCHEN_FLOW_STEP_LABEL.COURIER });
    steps.push({ status: "DELIVERED", label: KITCHEN_FLOW_STEP_LABEL.DELIVERED });
    return steps;
  }
  if (origin === "TABLE") {
    steps.push({ status: "SERVED", label: KITCHEN_FLOW_STEP_LABEL.WAITER_HANDOVER });
    return steps;
  }
  steps.push({ status: "DELIVERED", label: KITCHEN_FLOW_STEP_LABEL.DELIVERED });
  return steps;
}

export function kitchenTicketFlowIndex(
  status: string | null | undefined,
  origin: KitchenOrderOrigin,
  deliveryType?: string | null,
): number {
  const normalized = (status ?? "").trim().toUpperCase();
  if (
    !normalized ||
    normalized === "PENDING" ||
    normalized === "SUBMITTED" ||
    normalized === "DRAFT" ||
    normalized === "REJECTED" ||
    normalized === "CANCELLED"
  ) {
    return -1;
  }
  const steps = kitchenTicketFlowSteps(origin, deliveryType);
  if (kitchenSkipsPreparing(origin) && normalized === "PREPARING") {
    return steps.findIndex((step) => step.status === "READY");
  }
  if (origin === "TABLE" && (normalized === "ON_THE_WAY" || normalized === "DELIVERED")) {
    return steps.findIndex((step) => step.status === "SERVED");
  }
  return steps.findIndex((step) => step.status === normalized);
}

export function kitchenTicketStartedAt(
  order: Pick<OrderResponse, "confirmedAt" | "submittedAt" | "createdAt">,
): string | null {
  return order.confirmedAt || order.submittedAt || order.createdAt || null;
}

export function formatKitchenElapsed(from?: string | null, now = Date.now()): string | null {
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

export function kitchenTicketElapsedLabel(
  order: Pick<OrderResponse, "confirmedAt" | "submittedAt" | "createdAt" | "servedAt">,
  now = Date.now(),
): string | null {
  const start = kitchenTicketStartedAt(order);
  if (!start) return null;
  const end = order.servedAt ? new Date(order.servedAt).getTime() : now;
  const endTime = Number.isNaN(end) ? now : end;
  return formatKitchenElapsed(start, endTime);
}

export function kitchenOrderKey(order: Pick<OrderResponse, "id" | "orderSource" | "tableName" | "tableId">): string {
  return `${kitchenOrderOrigin(order)}:${order.id}`;
}

export function readKitchenOrderList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  const namedLists = ["orders", "content", "items", "kitchenOrders"]
    .map((key) => record[key])
    .filter(Array.isArray);
  if (namedLists.length === 1) return namedLists[0];
  if (namedLists.length > 1) return namedLists.flat();

  const tableOrders = Array.isArray(record.tableOrders) ? record.tableOrders : [];
  const storeOrders = Array.isArray(record.storeOrders) ? record.storeOrders : [];
  if (tableOrders.length > 0 || storeOrders.length > 0) return [...tableOrders, ...storeOrders];
  return [];
}

export function mergeKitchenOrders(primary: OrderResponse[], extra: OrderResponse[]): OrderResponse[] {
  const byKey = new Map<string, OrderResponse>();
  for (const order of [...primary, ...extra]) {
    byKey.set(kitchenOrderKey(order), order);
  }
  return [...byKey.values()].sort((a, b) => {
    const aTime = orderTimestamp(a.confirmedAt || a.submittedAt || a.createdAt);
    const bTime = orderTimestamp(b.confirmedAt || b.submittedAt || b.createdAt);
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });
}

function orderTimestamp(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function sortReadyOrders(orders: OrderResponse[]): OrderResponse[] {
  return orders
    .filter((order) => order.status === "READY")
    .slice()
    .sort((a, b) => {
      const aTime = orderTimestamp(a.readyAt || a.preparedAt || a.submittedAt || a.createdAt);
      const bTime = orderTimestamp(b.readyAt || b.preparedAt || b.submittedAt || b.createdAt);
      if (aTime !== bTime) return aTime - bTime;
      return a.id - b.id;
    });
}

export function readyOrdersBannerText(orders: OrderResponse[]): string | null {
  const ready = orders.filter((order) => order.status === "READY");
  if (ready.length === 0) return null;
  const labels = [...new Set(ready.map((order) => kitchenTableLabel(order).toLocaleLowerCase("tr")))];
  if (labels.length === 1) {
    return `${kitchenTableLabel(ready[0])} yemeği hazır`;
  }
  const display = [...new Set(ready.map((order) => kitchenTableLabel(order)))];
  if (display.length <= 3) {
    return `${display.join(", ")} yemekleri hazır`;
  }
  return `${display.slice(0, 3).join(", ")} ve ${display.length - 3} masa daha yemeği hazır`;
}

export function kitchenInProgressOrders(orders: OrderResponse[]): OrderResponse[] {
  return orders.filter((order) => order.status === "CONFIRMED" || order.status === "PREPARING");
}

export function kitchenInProgressBannerText(orders: OrderResponse[]): string | null {
  const active = kitchenInProgressOrders(orders);
  if (active.length === 0) return null;
  if (active.length === 1) {
    const status = active[0].status === "PREPARING" ? "mutfakta" : "onaylandı";
    return `${kitchenTableLabel(active[0])} ${status}`;
  }
  return `${active.length} sipariş mutfakta`;
}

export type KitchenTableProgress = {
  confirmedCount: number;
  preparingCount: number;
  readyCount: number;
};

export type KitchenProgressByTable = {
  byId: Map<number, KitchenTableProgress>;
  byName: Map<string, KitchenTableProgress>;
};

export function emptyKitchenTableProgress(): KitchenTableProgress {
  return { confirmedCount: 0, preparingCount: 0, readyCount: 0 };
}

function bumpKitchenProgress(
  current: KitchenTableProgress | undefined,
  status: OrderResponse["status"],
): KitchenTableProgress | null {
  if (status !== "CONFIRMED" && status !== "PREPARING" && status !== "READY") return null;
  const next: KitchenTableProgress = { ...(current ?? emptyKitchenTableProgress()) };
  if (status === "CONFIRMED") next.confirmedCount += 1;
  else if (status === "PREPARING") next.preparingCount += 1;
  else next.readyCount += 1;
  return next;
}

export function kitchenProgressByTable(orders: OrderResponse[]): KitchenProgressByTable {
  const byId = new Map<number, KitchenTableProgress>();
  const byName = new Map<string, KitchenTableProgress>();
  const seen = new Set<number>();

  for (const order of orders) {
    if (seen.has(order.id)) continue;
    seen.add(order.id);

    if (order.tableId != null) {
      const next = bumpKitchenProgress(byId.get(order.tableId), order.status);
      if (next) byId.set(order.tableId, next);
      continue;
    }

    const name = order.tableName?.trim().toLocaleLowerCase("tr");
    if (name) {
      const next = bumpKitchenProgress(byName.get(name), order.status);
      if (next) byName.set(name, next);
    }
  }

  return { byId, byName };
}

export function kitchenProgressForTable(
  table: {
    tableId: number;
    tableName?: string | null;
    kitchenOrderCount?: number;
    readyOrderCount?: number;
    latestPendingStatus?: string | null;
  },
  grouped: KitchenProgressByTable,
): KitchenTableProgress {
  const named = table.tableName?.trim().toLocaleLowerCase("tr");
  const live = grouped.byId.get(table.tableId) ?? (named ? grouped.byName.get(named) : undefined);
  const latest = table.latestPendingStatus;
  return {
    confirmedCount: Math.max(live?.confirmedCount ?? 0, latest === "CONFIRMED" ? 1 : 0),
    preparingCount: Math.max(live?.preparingCount ?? 0, latest === "PREPARING" ? 1 : 0),
    readyCount: Math.max(
      table.readyOrderCount ?? 0,
      live?.readyCount ?? 0,
      latest === "READY" ? 1 : 0,
    ),
  };
}

export function kitchenInProgressCount(progress: KitchenTableProgress): number {
  return progress.confirmedCount + progress.preparingCount;
}

export function tableKitchenSubtitleParts(
  progress: KitchenTableProgress,
  pendingCount = 0,
): string[] {
  const parts: string[] = [];
  if (progress.readyCount > 0) parts.push(`${progress.readyCount} yemek hazır`);
  if (progress.preparingCount > 0) parts.push(`${progress.preparingCount} mutfakta`);
  if (progress.confirmedCount > 0) parts.push(`${progress.confirmedCount} onaylandı`);
  if (pendingCount > 0) parts.push(`${pendingCount} onay bekliyor`);
  return parts;
}
