import { isDeliveryOrder, orderLocationLabel, sortOrdersNewestFirst } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

export type WaiterShiftBoard = {
  approve: OrderResponse[];
  cooking: OrderResponse[];
  deliver: OrderResponse[];
  delivered: OrderResponse[];
};

/** Adisyon süreci sekmesinde yalnızca seçili masanın siparişleri. */
export function filterWaiterShiftBoard(
  board: WaiterShiftBoard,
  tableId: number | null | undefined,
): WaiterShiftBoard {
  if (tableId == null) return board;
  const forTable = (orders: OrderResponse[]) => orders.filter((order) => order.tableId === tableId);
  return {
    approve: forTable(board.approve),
    cooking: forTable(board.cooking),
    deliver: forTable(board.deliver),
    delivered: forTable(board.delivered),
  };
}

const RANK: Record<string, number> = {
  PENDING: 1,
  SUBMITTED: 2,
  CONFIRMED: 3,
  PREPARING: 4,
  READY: 5,
  SERVED: 6,
  DELIVERED: 7,
};

function statusOf(order: OrderResponse): string {
  return (order.status ?? "").trim().toUpperCase();
}

function rankOf(order: OrderResponse): number {
  return RANK[statusOf(order)] ?? 0;
}

/** Masa ve gel-al garsonun işi. Paket kuryede kalır. */
export function isWaiterServiceOrder(order: OrderResponse): boolean {
  return rankOf(order) > 0 && !isDeliveryOrder(order);
}

function preferRicher(current: OrderResponse, incoming: OrderResponse): OrderResponse {
  const incomingRank = rankOf(incoming);
  const currentRank = rankOf(current);
  const status = incomingRank >= currentRank ? incoming.status : current.status;
  return {
    ...current,
    ...incoming,
    status,
    items: incoming.items?.length ? incoming.items : current.items,
    tableName: incoming.tableName ?? current.tableName,
    tableId: incoming.tableId ?? current.tableId,
    orderNumber: incoming.orderNumber || current.orderNumber,
    waiterName: incoming.waiterName?.trim() ? incoming.waiterName : current.waiterName,
    customerName: incoming.customerName?.trim() ? incoming.customerName : current.customerName,
    note: incoming.note ?? current.note,
    kitchenNote: incoming.kitchenNote ?? current.kitchenNote,
    servedAt: incoming.servedAt ?? current.servedAt,
    readyAt: incoming.readyAt ?? current.readyAt,
    billId: incoming.billId ?? current.billId,
  };
}

function indexOrders(orders: OrderResponse[]): Map<number, OrderResponse> {
  const byId = new Map<number, OrderResponse>();
  for (const order of orders) {
    if (!isWaiterServiceOrder(order)) continue;
    const current = byId.get(order.id);
    byId.set(order.id, current ? preferRicher(current, order) : order);
  }
  return byId;
}

function bySubmittedAsc(orders: OrderResponse[]): OrderResponse[] {
  return sortOrdersNewestFirst(orders).reverse();
}

/**
 * Garson vardiyası:
 * onay (PENDING) → mutfak (SUBMITTED…PREPARING) → masaya götür (READY) → teslim edildi (SERVED/DELIVERED).
 * Aynı sipariş birden fazla listede gelse de en ileri durum kazanır; teslim edilmiş fiş açık işe dönmez.
 */
export function groupWaiterShift(input: {
  pending?: OrderResponse[];
  ready?: OrderResponse[];
  kitchen?: OrderResponse[];
  today?: OrderResponse[];
  servedNow?: OrderResponse[];
  dismissedIds?: number[];
}): WaiterShiftBoard {
  const dismissed = new Set(input.dismissedIds ?? []);
  const merged = indexOrders([
    ...(input.today ?? []),
    ...(input.kitchen ?? []),
    ...(input.pending ?? []),
    ...(input.ready ?? []),
  ]);

  for (const order of input.servedNow ?? []) {
    if (!Number.isFinite(order.id)) continue;
    const current = merged.get(order.id);
    const served = preferRicher(current ?? order, { ...order, status: "SERVED" });
    merged.set(order.id, served);
  }

  const approve: OrderResponse[] = [];
  const cooking: OrderResponse[] = [];
  const deliver: OrderResponse[] = [];
  const delivered: OrderResponse[] = [];

  for (const order of merged.values()) {
    if (dismissed.has(order.id)) continue;
    const rank = rankOf(order);
    if (rank <= 1) approve.push(order);
    else if (rank <= 4) cooking.push(order);
    else if (rank === 5) deliver.push(order);
    else delivered.push(order);
  }

  return {
    approve: bySubmittedAsc(approve),
    cooking: bySubmittedAsc(cooking),
    deliver: bySubmittedAsc(deliver),
    delivered: sortOrdersNewestFirst(delivered),
  };
}

export type DeliveredTableGroup = {
  key: string;
  label: string;
  tableId: number | null;
  orders: OrderResponse[];
};

export type DeliveredTablePayment = "unpaid" | "paid";

/**
 * Teslim edilen masa: açık hesap kırmızı, kapanmış hesap yeşil.
 * Adisyona bağlanmamış teslim kırmızı kalır; masa listesi gelmeden ödenmiş sayılmaz.
 */
export function deliveredTablePayment(input: {
  tableId: number | null;
  orders: ReadonlyArray<{ billId?: number | null }>;
  awaitingPaymentIds: ReadonlySet<number>;
  tablesLoaded: boolean;
}): DeliveredTablePayment {
  if (!input.tablesLoaded) return "unpaid";
  if (input.tableId != null && input.awaitingPaymentIds.has(input.tableId)) return "unpaid";
  const settled =
    input.orders.length > 0 && input.orders.every((order) => (order.billId ?? 0) > 0);
  return settled ? "paid" : "unpaid";
}

/** Açık adisyonu olan masalar. Hesap kapanana kadar ödeme alınmamış sayılır. */
export function tableIdsAwaitingPayment(
  tables: ReadonlyArray<{
    tableId: number;
    billStatus?: string | null;
    openBillId?: number | null;
  }>,
): Set<number> {
  const ids = new Set<number>();
  for (const table of tables) {
    if (!Number.isFinite(table.tableId)) continue;
    const status = (table.billStatus ?? "").trim().toUpperCase();
    const openBill = table.openBillId != null && table.openBillId > 0;
    if (status === "OPEN" || openBill) ids.add(table.tableId);
  }
  return ids;
}

/** Teslim edilen siparişleri aynı masanın adisyonunda toplar. */
export function groupDeliveredTables(orders: OrderResponse[]): DeliveredTableGroup[] {
  const groups: DeliveredTableGroup[] = [];
  const index = new Map<string, DeliveredTableGroup>();
  for (const order of orders) {
    const named = order.tableName?.trim();
    const key =
      order.tableId != null
        ? `id:${order.tableId}`
        : named
          ? `name:${named.toLocaleLowerCase("tr-TR")}`
          : `order:${order.id}`;
    const existing = index.get(key);
    if (existing) {
      existing.orders.push(order);
      if (existing.tableId == null && order.tableId != null) existing.tableId = order.tableId;
      continue;
    }
    const group: DeliveredTableGroup = {
      key,
      label: orderLocationLabel(order),
      tableId: order.tableId ?? null,
      orders: [order],
    };
    index.set(key, group);
    groups.push(group);
  }
  return groups;
}

/** Teslim yanıtı ürün ve masa satırını düşürürse kart kaybolmasın. */
export function rememberWaiterDelivery(
  previous: OrderResponse | undefined,
  updated: OrderResponse | undefined,
  orderId: number,
  servedAt = new Date().toISOString(),
): OrderResponse {
  const base: OrderResponse = previous ?? updated ?? { id: orderId, status: "SERVED" };
  return preferRicher(
    { ...base, id: orderId, status: "SERVED", servedAt: base.servedAt || servedAt },
    {
      ...(updated ?? {}),
      id: orderId,
      status: "SERVED",
      servedAt: updated?.servedAt || base.servedAt || servedAt,
    },
  );
}
