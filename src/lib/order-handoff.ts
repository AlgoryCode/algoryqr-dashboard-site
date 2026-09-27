import { ApiError } from "@/lib/api/errors";
import { canMarkServedToCustomer, orderChannel } from "@/lib/order-management";
import {
  markMerchantKitchenServed,
  OrderingApiError,
  type OrderResponse,
} from "@/lib/ordering-api";
import { advanceStoreOrder } from "@/lib/store-api";
import { isOnlineKitchenSource } from "@/lib/store-kitchen";

export async function markOrderDeliveredToCustomer(
  menuId: number | null,
  order: OrderResponse,
): Promise<void> {
  if (!canMarkServedToCustomer(order)) {
    throw new Error("Bu sipariş müşteriye teslim için hazır değil.");
  }
  if (orderChannel(order) === "ONLINE" || isOnlineKitchenSource(order.orderSource)) {
    await advanceStoreOrder(order.id, "deliver");
    return;
  }
  if (menuId == null) throw new OrderingApiError(0, "Menü seçilmedi");
  await markMerchantKitchenServed(menuId, order.id);
}

export function handoffErrorMessage(error: unknown): string {
  if (error instanceof OrderingApiError || error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Müşteriye teslim işaretlenemedi.";
}
