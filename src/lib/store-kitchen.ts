import { kitchenOrderOrigin, readKitchenOrderList } from "@/lib/kitchen-queue";
import type { OrderItemResponse, OrderResponse } from "@/lib/ordering-api";
import type { StoreOrderDetail, StoreOrderPage, StoreOrderSummary } from "@/lib/store-api";
import { formatStoreAddress } from "@/lib/store-ui";

const STORE_KITCHEN_STATUSES = ["CONFIRMED", "PREPARING", "READY", "ON_THE_WAY"] as const;

function readJson(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function fetchStore(path: string, init?: RequestInit): Promise<Response> {
  const request = () =>
    fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

  const first = await request();
  if (first.status !== 401) return first;

  const refreshed = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: "{}",
  });
  if (!refreshed.ok) return first;
  return request();
}

function messageFromUnknown(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeStoreOrder(raw: Record<string, unknown>): boolean {
  if (typeof raw.orderNo === "string") return true;
  if (raw.address != null && typeof raw.address === "object") return true;
  if (!Array.isArray(raw.items) || raw.items.length === 0) return false;
  return raw.items.some(
    (item) => isRecord(item) && "options" in item && !("selectedOptions" in item),
  );
}

function mapStoreItems(order: Partial<StoreOrderDetail>): OrderItemResponse[] {
  return (order.items ?? []).map((item) => ({
    productId: item.productId,
    productName: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    note: item.note,
    lineTotal: item.lineTotal,
    selectedOptions: (item.options ?? []).map((option) => ({
      groupId: option.groupId,
      groupName: option.groupName,
      optionId: option.optionId,
      optionName: option.optionName,
      priceDelta: option.priceDelta,
    })),
  }));
}

export function storeOrderToKitchenTicket(order: StoreOrderSummary | StoreOrderDetail): OrderResponse {
  const detail = order as Partial<StoreOrderDetail>;
  const address = detail.address ? formatStoreAddress(detail.address) : null;

  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderSource: "STORE",
    orderNumber: order.orderNo,
    deliveryType: order.deliveryType,
    deliveryAddress: address && address !== "-" ? address : null,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    note: detail.note ?? null,
    items: mapStoreItems(detail),
    submittedAt: order.createdAt,
    confirmedAt: detail.confirmedAt ?? null,
    readyAt: detail.readyAt ?? null,
    servedAt: detail.dispatchedAt ?? detail.deliveredAt ?? null,
    createdAt: order.createdAt,
  };
}

export function asKitchenTicket(raw: unknown): OrderResponse | null {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  if (looksLikeStoreOrder(raw)) {
    return storeOrderToKitchenTicket({ ...(raw as unknown as StoreOrderDetail), id });
  }
  return { ...(raw as unknown as OrderResponse), id };
}

export function asKitchenTickets(data: unknown): OrderResponse[] {
  return readKitchenOrderList(data)
    .map(asKitchenTicket)
    .filter((order): order is OrderResponse => order != null);
}

export function isOnlineKitchenSource(orderSource?: string | null): boolean {
  return kitchenOrderOrigin({ orderSource }) === "ONLINE";
}

export async function listStoreKitchenQueue(): Promise<OrderResponse[]> {
  const params = new URLSearchParams({ page: "0", size: "100" });
  for (const status of STORE_KITCHEN_STATUSES) {
    params.append("status", status);
  }

  const listResponse = await fetchStore(`/api/store/orders?${params}`, { method: "GET" });
  if (!listResponse.ok) return [];

  const listData = readJson(await listResponse.text());
  const content = Array.isArray((listData as StoreOrderPage | null)?.content)
    ? (listData as StoreOrderPage).content
    : Array.isArray(listData)
      ? (listData as StoreOrderSummary[])
      : [];

  return Promise.all(
    content.map(async (summary) => {
      const detailResponse = await fetchStore(`/api/store/orders/${summary.id}`, { method: "GET" });
      if (!detailResponse.ok) return storeOrderToKitchenTicket(summary);
      const detail = readJson(await detailResponse.text());
      if (!isRecord(detail)) return storeOrderToKitchenTicket(summary);
      return storeOrderToKitchenTicket(detail as unknown as StoreOrderDetail);
    }),
  );
}

export async function advanceStoreKitchenOrder(
  orderId: number,
  action: "preparing" | "ready",
): Promise<OrderResponse> {
  const response = await fetchStore(`/api/store/orders/${orderId}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = readJson(await response.text());
  if (!response.ok) {
    throw new Error(messageFromUnknown(data, "Sipariş güncellenemedi"));
  }
  if (!isRecord(data) || !Number.isFinite(Number(data.id))) {
    throw new Error("Sipariş güncellenemedi");
  }
  return storeOrderToKitchenTicket(data as unknown as StoreOrderDetail);
}
