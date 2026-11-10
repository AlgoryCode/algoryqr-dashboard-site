import type { DigitalMenuDirectoryItem } from "@/lib/digital-menu-directory";
import { listScopedMenuOrders } from "@/lib/branch-scope";
import {
  mergeManagedOrders,
  sortOrdersNewestFirst,
  storeOrderToManagedOrder,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { listStoreOrders } from "@/lib/store-api";

const DAY_MS = 86_400_000;

/**
 * How many days of orders the server must return to cover a range starting at `from`.
 * One extra day absorbs a server clock in another time zone; the list is still filtered to the exact range.
 */
export function orderDaysForRange(from: string | undefined, now = new Date()): number | undefined {
  if (!from) return undefined;
  const start = new Date(`${from}T00:00:00`).getTime();
  if (Number.isNaN(start)) return undefined;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - start) / DAY_MS)) + 2;
}

const STORE_PAGE_SIZE = 200;
/** Stops a runaway loop if the server keeps reporting another page. */
const STORE_PAGE_LIMIT = 50;

async function listAllStoreOrders(range?: { from?: string; to?: string }): Promise<OrderResponse[]> {
  const orders: OrderResponse[] = [];
  for (let page = 0; page < STORE_PAGE_LIMIT; page += 1) {
    const result = await listStoreOrders({
      from: range?.from || undefined,
      to: range?.to || undefined,
      page,
      size: STORE_PAGE_SIZE,
    });
    orders.push(...(result.content ?? []).map(storeOrderToManagedOrder));
    const more = result.hasNext ?? page + 1 < (result.totalPages ?? 0);
    if (!more) break;
  }
  return orders;
}

export type ManagedOrdersResult = {
  orders: OrderResponse[];
  /** Online store orders could not be loaded; the list holds menu orders only. */
  storeFailed: boolean;
};

export async function listAllManagedOrders(
  menus: DigitalMenuDirectoryItem[],
  range?: { from?: string; to?: string },
): Promise<ManagedOrdersResult> {
  const [menuOrders, store] = await Promise.all([
    menus.length > 0 ? listScopedMenuOrders(menus, orderDaysForRange(range?.from)) : Promise.resolve([] as OrderResponse[]),
    listAllStoreOrders(range).then(
      (orders) => ({ orders, failed: false }),
      () => ({ orders: [] as OrderResponse[], failed: true }),
    ),
  ]);
  return {
    orders: sortOrdersNewestFirst(mergeManagedOrders(menuOrders, store.orders)),
    storeFailed: store.failed,
  };
}

export function orderReference(order: OrderResponse): string {
  return order.orderNumber?.trim() || order.externalOrderId?.trim() || `#${order.id}`;
}
