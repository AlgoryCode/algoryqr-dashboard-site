import type { DigitalMenuDirectoryItem } from "@/lib/digital-menu-directory";
import { listScopedMenuOrders } from "@/lib/branch-scope";
import {
  mergeManagedOrders,
  sortOrdersNewestFirst,
  storeOrderToManagedOrder,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { listStoreOrders } from "@/lib/store-api";

export async function listAllManagedOrders(
  menus: DigitalMenuDirectoryItem[],
  range?: { from?: string; to?: string },
): Promise<OrderResponse[]> {
  const [menuOrders, storePage] = await Promise.all([
    menus.length > 0 ? listScopedMenuOrders(menus) : Promise.resolve([] as OrderResponse[]),
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
