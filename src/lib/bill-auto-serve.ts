import type { OrderResponse } from "@/lib/ordering-api";

type ClosedBillForServe = {
  id: number;
  tableId: number;
  items?: { sourceOrderId?: number | null }[] | null;
};

/**
 * Payment no longer advances tickets. Garson teslim aldıktan sonra ödeme alır;
 * teslim müşteriye ayrıca işaretlenir.
 */
export function readyOrdersToAutoServe(
  _bill: ClosedBillForServe,
  _readyOrders: OrderResponse[],
  _currentOrderId?: number | null,
): OrderResponse[] {
  return [];
}
