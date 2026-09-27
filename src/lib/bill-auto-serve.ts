import { canMarkServedToCustomer } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

type ClosedBillForServe = {
  id: number;
  tableId: number;
  items?: { sourceOrderId?: number | null }[] | null;
};

/**
 * Ready tickets that should leave the waiter screen once the table bill is paid.
 * The "teslim edildi" tap is easy to skip after payment; those tickets are the ones
 * still sitting in the ready column for this bill.
 */
export function readyOrdersToAutoServe(
  bill: ClosedBillForServe,
  readyOrders: OrderResponse[],
  currentOrderId?: number | null,
): OrderResponse[] {
  const linkedIds = new Set<number>();
  for (const item of bill.items ?? []) {
    if (item.sourceOrderId != null && item.sourceOrderId > 0) linkedIds.add(item.sourceOrderId);
  }
  if (currentOrderId != null && currentOrderId > 0) linkedIds.add(currentOrderId);

  return readyOrders.filter((order) => {
    if (!canMarkServedToCustomer(order)) return false;
    if (linkedIds.has(order.id)) return true;
    if (order.billId != null && order.billId === bill.id) return true;
    return order.tableId != null && order.tableId === bill.tableId;
  });
}
