import { describe, expect, it, beforeEach } from "vitest";

import {
  applyKitchenOrderFlow,
  canWaiterCollectPayment,
  clearOrderFlowMemory,
  courierOrderActions,
  forceOrderFlowStatus,
  isOrderCancellable,
  kitchenOrderActions,
  nextOrderActions,
  normalizeOrderStatus,
  orderBlocksWaiterPayment,
  orderCancelReasonLabel,
  orderCancelReasonText,
  resolveOrderStatus,
  serverReachedStatus,
  stampOrderFlow,
  waiterCanCollectOnOrders,
  waiterModeActions,
  waiterOrderActions,
  waiterServiceActions,
  waiterServiceColumn,
  waiterServiceStatusLabel,
} from "./order-flow";
import { ordersToDeliverOnBillClose, ordersToMarkPaidOnBillClose, ordersToRestoreOnPaymentReverse } from "./bill-auto-serve";

const kitchenOn = { kitchenEnabled: true, courierEnabled: true, delivery: false };
const deliveryOn = { kitchenEnabled: true, courierEnabled: true, delivery: true, addressPresent: true };
const kitchenOff = { kitchenEnabled: false, courierEnabled: true, delivery: false };
const packageKitchenOff = { kitchenEnabled: false, courierEnabled: true, delivery: true, addressPresent: true };
const courierOff = { kitchenEnabled: true, courierEnabled: false, delivery: true, addressPresent: true };
const pickupOn = { kitchenEnabled: true, courierEnabled: true, delivery: false, pickup: true };
const marketplace = { kitchenEnabled: true, courierEnabled: true, delivery: true, marketplace: true };

describe("order cancel", () => {
  it("allows cancelling until the courier has taken the package", () => {
    expect(isOrderCancellable("SUBMITTED")).toBe(true);
    expect(isOrderCancellable("CONFIRMED")).toBe(true);
    expect(isOrderCancellable("PREPARING")).toBe(true);
    expect(isOrderCancellable("READY")).toBe(true);
    expect(isOrderCancellable("AWAITING_COURIER", true)).toBe(true);
    expect(isOrderCancellable("ON_THE_WAY", true)).toBe(false);
    expect(isOrderCancellable("DELIVERED")).toBe(false);
    expect(isOrderCancellable("CANCELLED")).toBe(false);
  });

  it("formats the cancel reason for display and store notes", () => {
    expect(orderCancelReasonLabel({ cancelReason: "OUT_OF_STOCK", cancelReasonNote: "Köfte bitti" })).toBe(
      "Ürün kalmadı: Köfte bitti",
    );
    expect(orderCancelReasonLabel({ cancelReasonNote: "Müşteri vazgeçti" })).toBe("Müşteri vazgeçti");
    expect(orderCancelReasonText({ reason: "CUSTOMER_REQUEST" })).toBe("Müşteri isteği");
  });
});

describe("normalizeOrderStatus", () => {
  it("folds actor statuses into the short list", () => {
    expect(normalizeOrderStatus("CONFIRMED")).toBe("CONFIRMED");
    expect(normalizeOrderStatus("SUBMITTED")).toBe("PENDING");
    expect(normalizeOrderStatus("KITCHEN_PREPARING")).toBe("PREPARING");
    expect(normalizeOrderStatus("KITCHEN_PREPARED")).toBe("READY");
    expect(normalizeOrderStatus("KITCHEN_DELIVERED_TO_WAITER")).toBe("READY");
    expect(normalizeOrderStatus("WAITER_TAKEN")).toBe("READY");
    expect(normalizeOrderStatus("SERVED")).toBe("DELIVERED");
    expect(normalizeOrderStatus("KITCHEN_DELIVERED_TO_COURIER")).toBe("AWAITING_COURIER");
    expect(normalizeOrderStatus("WAITER_DELIVERED_TO_COURIER")).toBe("AWAITING_COURIER");
    expect(normalizeOrderStatus("COURIER_TAKEN")).toBe("ON_THE_WAY");
    expect(normalizeOrderStatus("COURIER_DELIVERED_TO_CUSTOMER")).toBe("DELIVERED");
    expect(normalizeOrderStatus("WAITER_DELIVERED_TO_CUSTOMER")).toBe("DELIVERED");
  });
});

describe("nextOrderActions", () => {
  it("keeps approval off the kitchen and stops a table ticket at ready", () => {
    expect(nextOrderActions("PENDING", kitchenOn)).toEqual([]);
    expect(nextOrderActions("CONFIRMED", kitchenOn).map((item) => item.status)).toEqual(["PREPARING"]);
    expect(nextOrderActions("PREPARING", kitchenOn).map((item) => item.action)).toEqual(["markKitchenPrepared"]);
    expect(nextOrderActions("READY", kitchenOn)).toEqual([]);
    expect(nextOrderActions("DELIVERED", kitchenOn)).toEqual([]);
  });

  it("releases a delivery from ready to the courier queue and no further backward step", () => {
    expect(nextOrderActions("READY", deliveryOn).map((item) => item.action)).toEqual([
      "markKitchenDeliveredToCourier",
    ]);
    expect(nextOrderActions("READY", { ...deliveryOn, addressPresent: false }).map((item) => item.action)).toEqual([
      "markKitchenDeliveredToCourier",
    ]);
    expect(nextOrderActions("AWAITING_COURIER", deliveryOn).map((item) => item.action)).toEqual(["markCourierTaken"]);
    expect(nextOrderActions("ON_THE_WAY", deliveryOn).map((item) => item.action)).toEqual([
      "markCourierDeliveredToCustomer",
      "markCourierRelease",
    ]);
  });

  it("does not send a table or a closed courier module onto the courier queue", () => {
    expect(nextOrderActions("READY", kitchenOn).some((item) => item.action === "markKitchenDeliveredToCourier")).toBe(
      false,
    );
    expect(nextOrderActions("READY", courierOff).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCustomer",
    ]);
    expect(
      nextOrderActions("CONFIRMED", { kitchenEnabled: false, courierEnabled: false, delivery: true }).map(
        (item) => item.action,
      ),
    ).toEqual(["markWaiterDeliveredToCustomer"]);
    expect(courierOrderActions("ON_THE_WAY", courierOff).map((item) => item.action)).toEqual([
      "markCourierDeliveredToCustomer",
    ]);
    expect(courierOrderActions("AWAITING_COURIER", courierOff).map((item) => item.action)).toEqual([
      "markCourierTaken",
    ]);
  });

  it("walks a kitchen-off package through ready before the courier", () => {
    expect(nextOrderActions("CONFIRMED", packageKitchenOff).map((item) => item.action)).toEqual(["markReady"]);
    expect(nextOrderActions("READY", packageKitchenOff).map((item) => item.status)).toEqual(["AWAITING_COURIER"]);
    expect(nextOrderActions("CONFIRMED", kitchenOff).map((item) => item.label)).toEqual(["Servis et"]);
  });

  it("hands a kitchen-off pickup to the customer in one step", () => {
    const pickupOff = { kitchenEnabled: false, courierEnabled: false, delivery: false, pickup: true };
    expect(nextOrderActions("CONFIRMED", pickupOff).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCustomer",
    ]);
    expect(waiterModeActions("PREPARING", kitchenOff).map((item) => item.action)).toEqual(["markKitchenPrepared"]);
    expect(nextOrderActions("CONFIRMED", packageKitchenOff).map((item) => item.action)).toEqual(["markReady"]);
  });

  it("accepts a server status only when it reached the step", () => {
    expect(serverReachedStatus("KITCHEN_PREPARED", "READY")).toBe(true);
    expect(serverReachedStatus("READY", "AWAITING_COURIER")).toBe(false);
    expect(serverReachedStatus("AWAITING_COURIER", "AWAITING_COURIER")).toBe(true);
  });

  it("hands a pickup to the customer from ready", () => {
    expect(nextOrderActions("READY", pickupOn).map((item) => item.action)).toEqual(["markWaiterDeliveredToCustomer"]);
    expect(waiterOrderActions("READY", pickupOn).map((item) => item.label)).toEqual(["Müşteriye ver"]);
  });

  it("lets the kitchen start confirmed tickets and finish marketplace tickets without a branch courier", () => {
    expect(kitchenOrderActions("CONFIRMED", kitchenOn).map((item) => item.action)).toEqual(["markKitchenPreparing"]);
    expect(kitchenOrderActions("PREPARING", kitchenOn).map((item) => item.action)).toEqual(["markKitchenPrepared"]);
    expect(kitchenOrderActions("CONFIRMED", kitchenOff)).toEqual([]);
    expect(nextOrderActions("READY", marketplace)).toEqual([]);
    expect(courierOrderActions("AWAITING_COURIER", marketplace)).toEqual([]);
    expect(kitchenOrderActions("CONFIRMED", marketplace).map((item) => item.action)).toEqual([
      "markKitchenPreparing",
      "markKitchenPrepared",
    ]);
  });
});

describe("waiter payment", () => {
  it("opens for a ready table ticket and stays shut while the kitchen is still working", () => {
    expect(canWaiterCollectPayment("PREPARING")).toBe(false);
    expect(canWaiterCollectPayment("CONFIRMED", false, true)).toBe(false);
    expect(canWaiterCollectPayment("CONFIRMED", false, false)).toBe(true);
    expect(canWaiterCollectPayment("PREPARING", false, false)).toBe(true);
    expect(canWaiterCollectPayment("READY")).toBe(true);
    expect(canWaiterCollectPayment("DELIVERED")).toBe(false);
    expect(canWaiterCollectPayment("READY", true)).toBe(false);
    expect(orderBlocksWaiterPayment("PREPARING")).toBe(true);
    expect(orderBlocksWaiterPayment("CANCELLED")).toBe(false);
    expect(orderBlocksWaiterPayment("ON_THE_WAY", true)).toBe(false);
  });

  it("blocks a full close while any table ticket is still in the kitchen", () => {
    expect(waiterCanCollectOnOrders([{ status: "READY" }, { status: "PREPARING" }])).toBe(false);
    expect(waiterCanCollectOnOrders([{ status: "READY" }, { status: "DELIVERED" }])).toBe(true);
    expect(waiterCanCollectOnOrders([{ status: "CONFIRMED" }, { status: "PREPARING" }], false)).toBe(true);
    expect(waiterCanCollectOnOrders([{ status: "CONFIRMED" }], false)).toBe(true);
    expect(orderBlocksWaiterPayment("CONFIRMED", false, true, "WAITER")).toBe(false);
    expect(waiterCanCollectOnOrders([{ status: "CONFIRMED", orderSource: "WAITER" }], true)).toBe(true);
    expect(waiterCanCollectOnOrders([{ status: "PREPARING", orderSource: "QR" }], true)).toBe(false);
  });
});

describe("bill close and payment reversal", () => {
  const table = { id: 1, status: "READY", deliveryType: null, orderSource: "QR" };
  const cooking = { id: 2, status: "PREPARING", deliveryType: null, orderSource: "QR" };
  const pickup = { id: 3, status: "READY", deliveryType: "PICKUP", orderSource: "STORE" };
  const parcel = { id: 4, status: "READY", deliveryType: "DELIVERY", orderSource: "STORE" };

  it("marks only finished table orders delivered when the bill closes", () => {
    expect(ordersToDeliverOnBillClose([table, cooking, pickup, parcel], true).map((item) => item.id)).toEqual([1]);
    expect(ordersToDeliverOnBillClose([table, cooking, pickup, parcel], false).map((item) => item.id)).toEqual([1, 2]);
    expect(ordersToDeliverOnBillClose([{ ...table, status: "CONFIRMED" }], false).map((item) => item.id)).toEqual([1]);
    expect(ordersToDeliverOnBillClose([cooking], false).map((item) => item.id)).toEqual([2]);
    expect(
      ordersToMarkPaidOnBillClose(
        [{ id: 8, status: "CONFIRMED", deliveryType: null, orderSource: "WAITER" }],
        true,
      ).map((item) => item.id),
    ).toEqual([8]);
    expect(ordersToMarkPaidOnBillClose([table], true)).toEqual([]);
    expect(ordersToMarkPaidOnBillClose([{ ...table, status: "CONFIRMED" }], false).map((item) => item.id)).toEqual([1]);
  });

  it("sends a reversed table delivery back to the queue", () => {
    expect(
      ordersToRestoreOnPaymentReverse([{ ...table, status: "DELIVERED" }, pickup, parcel], true).map((item) => item.status),
    ).toEqual(["READY"]);
    expect(ordersToRestoreOnPaymentReverse([{ ...table, status: "DELIVERED" }], false)[0]?.status).toBe("CONFIRMED");
    expect(ordersToRestoreOnPaymentReverse([{ ...table, status: "PAID" }], false)[0]?.status).toBe("CONFIRMED");
  });
});

describe("kitchen-off table service", () => {
  it("serves a confirmed table order and treats a closed bill as paid", () => {
    const tableOff = { kitchenEnabled: false, courierEnabled: false, delivery: false };
    expect(waiterServiceActions("CONFIRMED")).toEqual([]);
    expect(nextOrderActions("CONFIRMED", tableOff).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCustomer",
    ]);
    expect(nextOrderActions("SERVED", tableOff)).toEqual([]);
    expect(nextOrderActions("PAID", tableOff)).toEqual([]);
    expect(waiterServiceColumn("SUBMITTED")).toBe("approve");
    expect(waiterServiceColumn("CONFIRMED")).toBe("service");
    expect(waiterServiceColumn("SERVED")).toBe("delivered");
    expect(waiterServiceColumn("PAID")).toBe("delivered");
    expect(waiterServiceStatusLabel("CONFIRMED")).toBe("Onaylandı");
    expect(waiterServiceStatusLabel("SERVED")).toBe("Servis edildi");
    expect(waiterServiceStatusLabel("PAID")).toBe("Ödeme alındı");
  });
});

describe("resolveOrderStatus", () => {
  beforeEach(() => {
    clearOrderFlowMemory();
  });

  it("keeps a dashboard status until the server catches up", () => {
    const stamped = stampOrderFlow({ id: 4, status: "READY", deliveryType: null }, "AWAITING_COURIER");
    expect(stamped.status).toBe("AWAITING_COURIER");
    expect(resolveOrderStatus({ id: 4, status: "READY" })).toBe("AWAITING_COURIER");
    expect(resolveOrderStatus({ id: 4, status: "ON_THE_WAY" })).toBe("ON_THE_WAY");
  });

  it("keeps a restored queue status after a payment reversal", () => {
    forceOrderFlowStatus(9, "READY");
    expect(resolveOrderStatus({ id: 9, status: "DELIVERED" })).toBe("READY");
    expect(resolveOrderStatus({ id: 9, status: "READY" })).toBe("READY");
    expect(resolveOrderStatus({ id: 9, status: "READY" })).toBe("READY");
  });
});

describe("applyKitchenOrderFlow", () => {
  beforeEach(() => {
    clearOrderFlowMemory();
  });

  it("keeps fresh confirmed tickets out of the preparing lane", () => {
    expect(applyKitchenOrderFlow({ id: 7, status: "CONFIRMED" }).status).toBe("CONFIRMED");
    expect(applyKitchenOrderFlow({ id: 7, status: "PREPARING" }).status).toBe("PREPARING");
  });

  it("honours a status the kitchen just wrote", () => {
    stampOrderFlow({ id: 8, status: "CONFIRMED", deliveryType: null }, "READY");
    expect(applyKitchenOrderFlow({ id: 8, status: "CONFIRMED" }).status).toBe("READY");
  });
});
