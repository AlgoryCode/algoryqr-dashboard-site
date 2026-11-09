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

export async function listAllManagedOrders(
  menus: DigitalMenuDirectoryItem[],
  range?: { from?: string; to?: string },
): Promise<OrderResponse[]> {
  const [menuOrders, storePage] = await Promise.all([
    menus.length > 0 ? listScopedMenuOrders(menus, orderDaysForRange(range?.from)) : Promise.resolve([] as OrderResponse[]),
    listStoreOrders({
      from: range?.from || undefined,
      to: range?.to || undefined,
      page: 0,
      size: 200,
    }).catch(() => null),
  ]);
  const storeOrders = (storePage?.content ?? []).map(storeOrderToManagedOrder);
  return sortOrdersNewestFirst(mergeManagedOrders(menuOrders, storeOrders));
}

export function orderReference(order: OrderResponse): string {
  return order.orderNumber?.trim() || order.externalOrderId?.trim() || `#${order.id}`;
}
