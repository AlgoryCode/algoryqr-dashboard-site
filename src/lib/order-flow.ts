/**
 * Sipariş akışı: aktör + eylem.
 * Mutfak veya kurye kapalıysa o aktörün geçişleri listede yoktur.
 * Eski API statüleri normalize edilir; dashboard'un yazdığı daha ileri statü
 * sunucu aynı enum'u dönene kadar oturum boyunca korunur.
 */

export const ORDER_FLOW_STATUSES = [
  "KITCHEN_PREPARING",
  "KITCHEN_PREPARED",
  "KITCHEN_DELIVERED_TO_WAITER",
  "KITCHEN_DELIVERED_TO_COURIER",
  "WAITER_TAKEN",
  "COURIER_TAKEN",
  "WAITER_DELIVERED_TO_CUSTOMER",
  "WAITER_DELIVERED_TO_COURIER",
  "COURIER_DELIVERED_TO_CUSTOMER",
] as const;

export type OrderFlowStatus = (typeof ORDER_FLOW_STATUSES)[number];

export type OrderFlowAction =
  | "markKitchenPreparing"
  | "markKitchenPrepared"
  | "markKitchenDeliveredToWaiter"
  | "markKitchenDeliveredToCourier"
  | "markWaiterTaken"
  | "markWaiterDeliveredToCustomer"
  | "markWaiterDeliveredToCourier"
  | "markCourierTaken"
  | "markCourierDeliveredToCustomer";

export type OrderFlowContext = {
  kitchenEnabled: boolean;
  courierEnabled: boolean;
  delivery: boolean;
};

export type OrderFlowStep = {
  action: OrderFlowAction;
  status: OrderFlowStatus;
  label: string;
};

const FLOW_STATUS_SET = new Set<string>(ORDER_FLOW_STATUSES);

export const ORDER_FLOW_STATUS_LABEL: Record<OrderFlowStatus, string> = {
  KITCHEN_PREPARING: "Mutfak hazırlıyor",
  KITCHEN_PREPARED: "Mutfak hazırladı",
  KITCHEN_DELIVERED_TO_WAITER: "Mutfak garsona verdi",
  KITCHEN_DELIVERED_TO_COURIER: "Mutfak kuryeye verdi",
  WAITER_TAKEN: "Garson teslim aldı",
  COURIER_TAKEN: "Kurye teslim aldı",
  WAITER_DELIVERED_TO_CUSTOMER: "Garson müşteriye teslim etti",
  WAITER_DELIVERED_TO_COURIER: "Garson kuryeye teslim etti",
  COURIER_DELIVERED_TO_CUSTOMER: "Kurye müşteriye teslim etti",
};

export const ORDER_FLOW_ACTION_LABEL: Record<OrderFlowAction, string> = {
  markKitchenPreparing: "Mutfağa al",
  markKitchenPrepared: "Hazır",
  markKitchenDeliveredToWaiter: "Garsona teslim et",
  markKitchenDeliveredToCourier: "Kuryeye teslim et",
  markWaiterTaken: "Teslim aldım",
  markWaiterDeliveredToCustomer: "Müşteriye teslim et",
  markWaiterDeliveredToCourier: "Kuryeye teslim et",
  markCourierTaken: "Teslim aldım",
  markCourierDeliveredToCustomer: "Müşteriye teslim et",
};

export const ORDER_FLOW_ACTION_STATUS: Record<OrderFlowAction, OrderFlowStatus> = {
  markKitchenPreparing: "KITCHEN_PREPARING",
  markKitchenPrepared: "KITCHEN_PREPARED",
  markKitchenDeliveredToWaiter: "KITCHEN_DELIVERED_TO_WAITER",
  markKitchenDeliveredToCourier: "KITCHEN_DELIVERED_TO_COURIER",
  markWaiterTaken: "WAITER_TAKEN",
  markWaiterDeliveredToCustomer: "WAITER_DELIVERED_TO_CUSTOMER",
  markWaiterDeliveredToCourier: "WAITER_DELIVERED_TO_COURIER",
  markCourierTaken: "COURIER_TAKEN",
  markCourierDeliveredToCustomer: "COURIER_DELIVERED_TO_CUSTOMER",
};

const KITCHEN_ACTIONS = new Set<OrderFlowAction>([
  "markKitchenPreparing",
  "markKitchenPrepared",
  "markKitchenDeliveredToWaiter",
  "markKitchenDeliveredToCourier",
]);

const WAITER_ACTIONS = new Set<OrderFlowAction>([
  "markWaiterTaken",
  "markWaiterDeliveredToCustomer",
  "markWaiterDeliveredToCourier",
]);

const COURIER_ACTIONS = new Set<OrderFlowAction>([
  "markCourierTaken",
  "markCourierDeliveredToCustomer",
]);

const PAYMENT_STATUSES = new Set<OrderFlowStatus>([
  "WAITER_TAKEN",
  "WAITER_DELIVERED_TO_CUSTOMER",
  "WAITER_DELIVERED_TO_COURIER",
]);

const CUSTOMER_DELIVERED = new Set<OrderFlowStatus>([
  "WAITER_DELIVERED_TO_CUSTOMER",
  "COURIER_DELIVERED_TO_CUSTOMER",
]);

/** Higher rank is further along. Equal ranks are different branches. */
const FLOW_RANK: Record<OrderFlowStatus, number> = {
  KITCHEN_PREPARING: 1,
  KITCHEN_PREPARED: 2,
  KITCHEN_DELIVERED_TO_WAITER: 3,
  KITCHEN_DELIVERED_TO_COURIER: 3,
  WAITER_TAKEN: 4,
  WAITER_DELIVERED_TO_COURIER: 5,
  COURIER_TAKEN: 5,
  WAITER_DELIVERED_TO_CUSTOMER: 6,
  COURIER_DELIVERED_TO_CUSTOMER: 6,
};

const writtenStatus = new Map<number, OrderFlowStatus>();

export function clearOrderFlowMemory(): void {
  writtenStatus.clear();
}

export function writeOrderFlowStatus(orderId: number, status: OrderFlowStatus): void {
  if (!Number.isFinite(orderId)) return;
  writtenStatus.set(orderId, status);
}

export function isOrderFlowStatus(status: string | null | undefined): status is OrderFlowStatus {
  return FLOW_STATUS_SET.has((status ?? "").trim().toUpperCase());
}

export function orderIsDelivery(order: {
  deliveryType?: string | null;
}): boolean {
  return (order.deliveryType ?? "").trim().toUpperCase() === "DELIVERY";
}

export function normalizeOrderStatus(
  status: string | null | undefined,
  delivery = false,
): string {
  const raw = (status ?? "").trim().toUpperCase();
  if (!raw) return raw;
  if (FLOW_STATUS_SET.has(raw)) return raw;
  switch (raw) {
    case "PREPARING":
    case "CONFIRMED":
      return "KITCHEN_PREPARING";
    case "READY":
      return "KITCHEN_PREPARED";
    case "SERVED":
      return "WAITER_TAKEN";
    case "ON_THE_WAY":
      return "COURIER_TAKEN";
    case "DELIVERED":
      return delivery ? "COURIER_DELIVERED_TO_CUSTOMER" : "WAITER_DELIVERED_TO_CUSTOMER";
    default:
      return raw;
  }
}

export function resolveOrderStatus(order: {
  id?: number;
  status: string | null | undefined;
  deliveryType?: string | null;
}): string {
  const delivery = orderIsDelivery(order);
  const normalized = normalizeOrderStatus(order.status, delivery);
  const orderId = order.id;
  if (orderId == null || !Number.isFinite(orderId)) return normalized;
  if (normalized === "CANCELLED" || normalized === "REJECTED") {
    writtenStatus.delete(orderId);
    return normalized;
  }
  const remembered = writtenStatus.get(orderId);
  if (!remembered) return normalized;
  const rememberedRank = FLOW_RANK[remembered];
  const serverRank = FLOW_RANK[normalized as OrderFlowStatus] ?? 0;
  if (normalized === remembered || serverRank >= rememberedRank) {
    writtenStatus.delete(orderId);
    return normalized;
  }
  return remembered;
}

export function applyOrderFlow<T extends { id?: number; status: string; deliveryType?: string | null }>(
  order: T,
): T {
  const status = resolveOrderStatus(order);
  if (status === order.status) return order;
  return { ...order, status };
}

export function stampOrderFlow<T extends { id: number; status: string; deliveryType?: string | null }>(
  order: T,
  status: OrderFlowStatus,
): T {
  writeOrderFlowStatus(order.id, status);
  return { ...order, status };
}

export function orderFlowStatusLabel(status: string | null | undefined, delivery = false): string {
  const normalized = normalizeOrderStatus(status, delivery);
  if (isOrderFlowStatus(normalized)) return ORDER_FLOW_STATUS_LABEL[normalized];
  switch (normalized) {
    case "PENDING":
    case "SUBMITTED":
      return "Onay bekliyor";
    case "CANCELLED":
      return "İptal edildi";
    case "REJECTED":
      return "Reddedildi";
    case "DRAFT":
      return "Taslak";
    default:
      return normalized || "—";
  }
}

export function orderFlowStep(action: OrderFlowAction): OrderFlowStep {
  return {
    action,
    status: ORDER_FLOW_ACTION_STATUS[action],
    label: ORDER_FLOW_ACTION_LABEL[action],
  };
}

function step(action: OrderFlowAction): OrderFlowStep {
  return orderFlowStep(action);
}

export function nextOrderActions(
  status: string | null | undefined,
  context: OrderFlowContext,
): OrderFlowStep[] {
  const current = normalizeOrderStatus(status, context.delivery);
  if (
    current === "CANCELLED" ||
    current === "REJECTED" ||
    current === "DRAFT" ||
    current === "WAITER_DELIVERED_TO_CUSTOMER" ||
    current === "COURIER_DELIVERED_TO_CUSTOMER"
  ) {
    return [];
  }

  if (!context.kitchenEnabled) {
    if (
      current === "PENDING" ||
      current === "SUBMITTED" ||
      current === "KITCHEN_PREPARING" ||
      current === "KITCHEN_PREPARED" ||
      current === "KITCHEN_DELIVERED_TO_WAITER" ||
      current === "KITCHEN_DELIVERED_TO_COURIER"
    ) {
      return [step("markWaiterTaken")];
    }
    if (current === "WAITER_TAKEN" || current === "WAITER_DELIVERED_TO_COURIER" || current === "COURIER_TAKEN") {
      return [step("markWaiterDeliveredToCustomer")];
    }
    return [];
  }

  if (current === "PENDING" || current === "SUBMITTED") {
    return [step("markKitchenPreparing")];
  }
  if (current === "KITCHEN_PREPARING") {
    return [step("markKitchenPrepared")];
  }
  if (current === "KITCHEN_PREPARED") {
    if (context.delivery && context.courierEnabled) {
      return [step("markKitchenDeliveredToCourier"), step("markKitchenDeliveredToWaiter")];
    }
    return [step("markKitchenDeliveredToWaiter")];
  }
  if (current === "KITCHEN_DELIVERED_TO_WAITER") {
    return [step("markWaiterTaken")];
  }
  if (current === "KITCHEN_DELIVERED_TO_COURIER") {
    return context.courierEnabled ? [step("markCourierTaken")] : [step("markWaiterTaken")];
  }
  if (current === "WAITER_TAKEN") {
    if (context.delivery && context.courierEnabled) {
      return [step("markWaiterDeliveredToCourier")];
    }
    return [step("markWaiterDeliveredToCustomer")];
  }
  if (current === "WAITER_DELIVERED_TO_COURIER") {
    return context.courierEnabled ? [step("markCourierTaken")] : [step("markWaiterDeliveredToCustomer")];
  }
  if (current === "COURIER_TAKEN") {
    return context.courierEnabled ? [step("markCourierDeliveredToCustomer")] : [step("markWaiterDeliveredToCustomer")];
  }
  return [];
}

export function kitchenOrderActions(
  status: string | null | undefined,
  context: OrderFlowContext,
): OrderFlowStep[] {
  return nextOrderActions(status, context).filter((item) => KITCHEN_ACTIONS.has(item.action));
}

export function waiterOrderActions(
  status: string | null | undefined,
  context: OrderFlowContext,
): OrderFlowStep[] {
  return nextOrderActions(status, context).filter((item) => WAITER_ACTIONS.has(item.action));
}

export function courierOrderActions(
  status: string | null | undefined,
  context: OrderFlowContext,
): OrderFlowStep[] {
  if (!context.courierEnabled) return [];
  return nextOrderActions(status, context).filter((item) => COURIER_ACTIONS.has(item.action));
}

export function canWaiterCollectPayment(status: string | null | undefined, delivery = false): boolean {
  const normalized = normalizeOrderStatus(status, delivery);
  return isOrderFlowStatus(normalized) && PAYMENT_STATUSES.has(normalized);
}

export function orderBlocksWaiterPayment(status: string | null | undefined, delivery = false): boolean {
  const normalized = normalizeOrderStatus(status, delivery);
  if (
    normalized === "CANCELLED" ||
    normalized === "REJECTED" ||
    normalized === "DRAFT" ||
    normalized === "WAITER_DELIVERED_TO_CUSTOMER" ||
    normalized === "COURIER_DELIVERED_TO_CUSTOMER"
  ) {
    return false;
  }
  return !canWaiterCollectPayment(normalized, delivery);
}

export function waiterCanCollectOnOrders(
  orders: ReadonlyArray<{ status: string | null | undefined; deliveryType?: string | null }>,
): boolean {
  return orders.every((order) => !orderBlocksWaiterPayment(order.status, orderIsDelivery(order)));
}

export function isCustomerDeliveredStatus(status: string | null | undefined, delivery = false): boolean {
  const normalized = normalizeOrderStatus(status, delivery);
  return isOrderFlowStatus(normalized) && CUSTOMER_DELIVERED.has(normalized);
}

export function isOpenFlowStatus(status: string | null | undefined, delivery = false): boolean {
  const normalized = normalizeOrderStatus(status, delivery);
  if (!normalized || normalized === "DRAFT" || normalized === "CANCELLED" || normalized === "REJECTED") {
    return false;
  }
  if (isCustomerDeliveredStatus(normalized, delivery)) return false;
  return (
    normalized === "PENDING" ||
    normalized === "SUBMITTED" ||
    isOrderFlowStatus(normalized)
  );
}

export type KitchenFlowColumn = "KITCHEN_PREPARING" | "KITCHEN_PREPARED" | "KITCHEN_HANDED";

export function kitchenFlowColumn(status: string | null | undefined, delivery = false): KitchenFlowColumn | null {
  const normalized = normalizeOrderStatus(status, delivery);
  if (normalized === "KITCHEN_PREPARING") return "KITCHEN_PREPARING";
  if (normalized === "KITCHEN_PREPARED") return "KITCHEN_PREPARED";
  if (normalized === "KITCHEN_DELIVERED_TO_WAITER" || normalized === "KITCHEN_DELIVERED_TO_COURIER") {
    return "KITCHEN_HANDED";
  }
  return null;
}

export type WaiterFlowColumn = "approve" | "cooking" | "deliver" | "delivered";

export function waiterFlowColumn(status: string | null | undefined, delivery = false): WaiterFlowColumn | null {
  const normalized = normalizeOrderStatus(status, delivery);
  if (normalized === "PENDING" || normalized === "SUBMITTED") return "approve";
  if (normalized === "KITCHEN_PREPARING") return "cooking";
  if (normalized === "KITCHEN_PREPARED" || normalized === "KITCHEN_DELIVERED_TO_WAITER" || normalized === "WAITER_TAKEN") {
    return "deliver";
  }
  if (normalized === "WAITER_DELIVERED_TO_CUSTOMER" || normalized === "WAITER_DELIVERED_TO_COURIER") {
    return "delivered";
  }
  return null;
}

export type CourierFlowColumn = "HANDOFF" | "TAKEN" | "DELIVERED";

export function courierFlowColumn(status: string | null | undefined, delivery = true): CourierFlowColumn | null {
  const normalized = normalizeOrderStatus(status, delivery);
  if (
    normalized === "KITCHEN_PREPARED" ||
    normalized === "KITCHEN_DELIVERED_TO_COURIER" ||
    normalized === "WAITER_DELIVERED_TO_COURIER"
  ) {
    return "HANDOFF";
  }
  if (normalized === "COURIER_TAKEN") return "TAKEN";
  if (normalized === "COURIER_DELIVERED_TO_CUSTOMER") return "DELIVERED";
  return null;
}

export type OrderFlowLane = "kitchen" | "waiter" | "courier";

export function orderFlowLane(
  status: string | null | undefined,
  context: OrderFlowContext,
): OrderFlowLane | null {
  if (!isOpenFlowStatus(status, context.delivery)) return null;
  const normalized = normalizeOrderStatus(status, context.delivery);
  if (normalized === "COURIER_TAKEN" || normalized === "KITCHEN_DELIVERED_TO_COURIER" || normalized === "WAITER_DELIVERED_TO_COURIER") {
    return context.courierEnabled ? "courier" : "waiter";
  }
  if (normalized === "KITCHEN_PREPARING" || normalized === "KITCHEN_PREPARED") {
    return context.kitchenEnabled ? "kitchen" : "waiter";
  }
  if (
    normalized === "PENDING" ||
    normalized === "SUBMITTED" ||
    normalized === "KITCHEN_DELIVERED_TO_WAITER" ||
    normalized === "WAITER_TAKEN"
  ) {
    if ((normalized === "PENDING" || normalized === "SUBMITTED") && context.kitchenEnabled) {
      return "kitchen";
    }
    return "waiter";
  }
  return null;
}

export function orderFlowSteps(context: Pick<OrderFlowContext, "kitchenEnabled" | "courierEnabled" | "delivery">): Array<{
  status: string;
  label: string;
}> {
  if (!context.kitchenEnabled) {
    return [
      { status: "WAITER_TAKEN", label: ORDER_FLOW_STATUS_LABEL.WAITER_TAKEN },
      { status: "WAITER_DELIVERED_TO_CUSTOMER", label: ORDER_FLOW_STATUS_LABEL.WAITER_DELIVERED_TO_CUSTOMER },
    ];
  }
  const steps: Array<{ status: string; label: string }> = [
    { status: "KITCHEN_PREPARING", label: ORDER_FLOW_STATUS_LABEL.KITCHEN_PREPARING },
    { status: "KITCHEN_PREPARED", label: ORDER_FLOW_STATUS_LABEL.KITCHEN_PREPARED },
  ];
  if (context.delivery && context.courierEnabled) {
    steps.push(
      { status: "KITCHEN_DELIVERED_TO_COURIER", label: ORDER_FLOW_STATUS_LABEL.KITCHEN_DELIVERED_TO_COURIER },
      { status: "COURIER_TAKEN", label: ORDER_FLOW_STATUS_LABEL.COURIER_TAKEN },
      { status: "COURIER_DELIVERED_TO_CUSTOMER", label: ORDER_FLOW_STATUS_LABEL.COURIER_DELIVERED_TO_CUSTOMER },
    );
    return steps;
  }
  steps.push(
    { status: "KITCHEN_DELIVERED_TO_WAITER", label: ORDER_FLOW_STATUS_LABEL.KITCHEN_DELIVERED_TO_WAITER },
    { status: "WAITER_TAKEN", label: ORDER_FLOW_STATUS_LABEL.WAITER_TAKEN },
    { status: "WAITER_DELIVERED_TO_CUSTOMER", label: ORDER_FLOW_STATUS_LABEL.WAITER_DELIVERED_TO_CUSTOMER },
  );
  return steps;
}

export function orderFlowStepIndex(
  status: string | null | undefined,
  context: OrderFlowContext,
): number {
  const normalized = normalizeOrderStatus(status, context.delivery);
  if (normalized === "PENDING" || normalized === "SUBMITTED" || normalized === "DRAFT" || normalized === "REJECTED" || normalized === "CANCELLED") {
    return -1;
  }
  const steps = orderFlowSteps(context);
  return steps.findIndex((stepItem) => stepItem.status === normalized);
}

/** Store HTTP segments. Empty means the dashboard only stamps the status. */
export function storeHttpStepsFor(
  action: OrderFlowAction,
  currentStatus: string | null | undefined,
  delivery: boolean,
): string[] {
  const status = normalizeOrderStatus(currentStatus, delivery);
  switch (action) {
    case "markKitchenPreparing":
      return status === "PENDING" || status === "SUBMITTED" ? ["confirm", "preparing"] : ["preparing"];
    case "markKitchenPrepared":
      return ["ready"];
    case "markCourierTaken":
      return ["dispatch"];
    case "markCourierDeliveredToCustomer":
    case "markWaiterDeliveredToCustomer":
      return ["deliver"];
    default:
      return [];
  }
}

export function waiterHttpStep(
  action: OrderFlowAction,
): { scope: "kitchen" | "waiter" | "courier"; path: string } | null {
  switch (action) {
    case "markKitchenPreparing":
      return { scope: "kitchen", path: "preparing" };
    case "markKitchenPrepared":
      return { scope: "kitchen", path: "ready" };
    case "markWaiterTaken":
      return { scope: "waiter", path: "served" };
    case "markCourierTaken":
      return { scope: "courier", path: "dispatch" };
    case "markCourierDeliveredToCustomer":
      return { scope: "courier", path: "deliver" };
    default:
      return null;
  }
}
