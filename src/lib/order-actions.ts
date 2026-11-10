import { isBranchCourierEnabled, isBranchKitchenEnabled, type BranchItem } from "@/lib/branch";
import {
  forgetOrderFlowStatus,
  kitchenOrderActions,
  ORDER_FLOW_ACTION_STATUS,
  orderFlowContextFor,
  serverReachedStatus,
  type KitchenRevertTarget,
  type OrderCancelRequest,
  type OrderFlowAction,
  type OrderFlowStep,
} from "@/lib/order-flow";
import {
  cancelMerchantOrder,
  markMerchantKitchenPreparing,
  markMerchantKitchenReady,
  markMerchantKitchenServed,
  revertMerchantKitchenOrder,
  type OrderResponse,
} from "@/lib/ordering-api";
import {
  advanceStoreKitchenOrder,
  cancelStoreKitchenOrder,
  deliverStoreKitchenOrder,
  isOnlineKitchenSource,
  revertStoreKitchenOrder,
} from "@/lib/store-kitchen";

/** Steps the dashboard can save without a courier or waiter screen. */
const DASHBOARD_ACTIONS = new Set<OrderFlowAction>([
  "markKitchenPreparing",
  "markKitchenPrepared",
  "markReady",
  "markWaiterDeliveredToCustomer",
]);

/** The next step offered on an order row, following the same rules as the kitchen screen. */
export function nextDashboardOrderStep(order: OrderResponse, branch?: BranchItem | null): OrderFlowStep | null {
  const context = orderFlowContextFor(order, {
    kitchenEnabled: isBranchKitchenEnabled(branch),
    courierEnabled: isBranchCourierEnabled(branch),
  });
  return kitchenOrderActions(order.status, context).find((step) => DASHBOARD_ACTIONS.has(step.action)) ?? null;
}

export async function runOrderFlowAction(order: OrderResponse, action: OrderFlowAction): Promise<OrderResponse> {
  const target = ORDER_FLOW_ACTION_STATUS[action];
  if (action === "markWaiterDeliveredToCustomer") {
    if (isOnlineKitchenSource(order.orderSource)) return deliverStoreKitchenOrder(order.id);
    if (order.menuId == null) throw new Error("Sipariş güncellenemedi");
    const served = await markMerchantKitchenServed(order.menuId, order.id);
    if (!serverReachedStatus(served.status, "DELIVERED")) throw new Error("Sipariş güncellenemedi");
    forgetOrderFlowStatus(order.id);
    return { ...served, id: order.id };
  }
  if (action !== "markKitchenPreparing" && action !== "markKitchenPrepared" && action !== "markReady") {
    throw new Error("Bu adım kaydedilemedi");
  }
  const step = action === "markKitchenPreparing" ? "preparing" : "ready";
  if (isOnlineKitchenSource(order.orderSource)) {
    return advanceStoreKitchenOrder(order.id, step);
  }
  if (order.menuId == null) {
    throw new Error("Sipariş güncellenemedi");
  }
  const next =
    step === "preparing"
      ? await markMerchantKitchenPreparing(order.menuId, order.id, order.orderSource)
      : await markMerchantKitchenReady(order.menuId, order.id, order.orderSource);
  if (!serverReachedStatus(next.status, target)) {
    throw new Error("Sipariş güncellenemedi");
  }
  forgetOrderFlowStatus(order.id);
  return { ...next, id: order.id };
}

export async function cancelManagedOrder(order: OrderResponse, request: OrderCancelRequest): Promise<OrderResponse> {
  if (isOnlineKitchenSource(order.orderSource)) {
    return cancelStoreKitchenOrder(order.id, request);
  }
  if (order.menuId == null) {
    throw new Error("Sipariş iptal edilemedi");
  }
  return cancelMerchantOrder(order.menuId, order.id, request);
}

export async function revertManagedOrder(order: OrderResponse, to: KitchenRevertTarget): Promise<OrderResponse> {
  if (isOnlineKitchenSource(order.orderSource)) {
    return revertStoreKitchenOrder(order.id, to);
  }
  if (order.menuId == null) {
    throw new Error("Sipariş geri alınamadı");
  }
  return revertMerchantKitchenOrder(order.menuId, order.id, to, order.orderSource);
}
