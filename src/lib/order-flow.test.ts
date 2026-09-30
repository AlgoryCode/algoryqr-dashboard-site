import { describe, expect, it, beforeEach } from "vitest";

import {
  applyKitchenOrderFlow,
  canWaiterCollectPayment,
  clearOrderFlowMemory,
  courierOrderActions,
  isOrderCancellable,
  kitchenOrderActions,
  nextOrderActions,
  normalizeOrderStatus,
  orderCancelReasonLabel,
  orderCancelReasonText,
  orderBlocksWaiterPayment,
  resolveOrderStatus,
  stampOrderFlow,
  waiterCanCollectOnOrders,
  waiterOrderActions,
  waiterServiceActions,
  waiterServiceColumn,
  waiterServiceStatusLabel,
} from "./order-flow";

const kitchenOn = { kitchenEnabled: true, courierEnabled: true, delivery: false };
const deliveryOn = { kitchenEnabled: true, courierEnabled: true, delivery: true };
const kitchenOff = { kitchenEnabled: false, courierEnabled: true, delivery: false };
const courierOff = { kitchenEnabled: true, courierEnabled: false, delivery: true };

describe("order cancel", () => {
  it("allows cancelling until the ticket leaves the kitchen", () => {
    expect(isOrderCancellable("SUBMITTED")).toBe(true);
    expect(isOrderCancellable("CONFIRMED")).toBe(true);
    expect(isOrderCancellable("PREPARING")).toBe(true);
    expect(isOrderCancellable("READY")).toBe(true);
    expect(isOrderCancellable("KITCHEN_DELIVERED_TO_WAITER")).toBe(true);
    expect(isOrderCancellable("SERVED")).toBe(false);
    expect(isOrderCancellable("COURIER_TAKEN", true)).toBe(false);
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

describe("table orders and couriers", () => {
  it("offers no courier step for a table order on the kitchen or waiter screen", () => {
    const courierActions = new Set(["markKitchenDeliveredToCourier", "markWaiterDeliveredToCourier"]);
    for (const status of ["KITCHEN_PREPARED", "WAITER_TAKEN"]) {
      expect(kitchenOrderActions(status, kitchenOn).some((item) => courierActions.has(item.action))).toBe(false);
      expect(waiterOrderActions(status, kitchenOn).some((item) => courierActions.has(item.action))).toBe(false);
    }
  });
});

describe("normalizeOrderStatus", () => {
  it("maps legacy kitchen and handover statuses", () => {
    expect(normalizeOrderStatus("CONFIRMED")).toBe("KITCHEN_PREPARING");
    expect(normalizeOrderStatus("PREPARING")).toBe("KITCHEN_PREPARING");
    expect(normalizeOrderStatus("READY")).toBe("KITCHEN_PREPARED");
    expect(normalizeOrderStatus("SERVED")).toBe("WAITER_TAKEN");
    expect(normalizeOrderStatus("ON_THE_WAY")).toBe("COURIER_TAKEN");
    expect(normalizeOrderStatus("DELIVERED", true)).toBe("COURIER_DELIVERED_TO_CUSTOMER");
    expect(normalizeOrderStatus("DELIVERED", false)).toBe("WAITER_DELIVERED_TO_CUSTOMER");
    expect(normalizeOrderStatus("PENDING")).toBe("PENDING");
    expect(normalizeOrderStatus("KITCHEN_PREPARED")).toBe("KITCHEN_PREPARED");
  });
});

describe("nextOrderActions", () => {
  it("walks a table order through the kitchen and the waiter", () => {
    expect(nextOrderActions("PENDING", kitchenOn).map((item) => item.action)).toEqual([
      "markKitchenPreparing",
    ]);
    expect(nextOrderActions("KITCHEN_PREPARING", kitchenOn).map((item) => item.status)).toEqual([
      "KITCHEN_PREPARED",
    ]);
    expect(nextOrderActions("KITCHEN_PREPARED", kitchenOn).map((item) => item.action)).toEqual([
      "markKitchenDeliveredToWaiter",
    ]);
    expect(nextOrderActions("KITCHEN_DELIVERED_TO_WAITER", kitchenOn).map((item) => item.action)).toEqual([
      "markWaiterTaken",
    ]);
    expect(nextOrderActions("WAITER_TAKEN", kitchenOn).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCustomer",
    ]);
    expect(nextOrderActions("WAITER_DELIVERED_TO_CUSTOMER", kitchenOn)).toEqual([]);
  });

  it("offers both courier handoffs when the kitchen and courier are open", () => {
    expect(nextOrderActions("READY", deliveryOn).map((item) => item.action)).toEqual([
      "markKitchenDeliveredToCourier",
      "markKitchenDeliveredToWaiter",
    ]);
    expect(nextOrderActions("WAITER_TAKEN", deliveryOn).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCourier",
    ]);
    expect(nextOrderActions("COURIER_TAKEN", deliveryOn).map((item) => item.status)).toEqual([
      "COURIER_DELIVERED_TO_CUSTOMER",
    ]);
  });

  it("skips the kitchen when it is closed", () => {
    expect(nextOrderActions("PENDING", kitchenOff).map((item) => item.status)).toEqual(["WAITER_TAKEN"]);
    expect(nextOrderActions("KITCHEN_PREPARING", kitchenOff).map((item) => item.action)).toEqual([
      "markWaiterTaken",
    ]);
    expect(kitchenOrderActions("PENDING", kitchenOff)).toEqual([]);
    expect(nextOrderActions("WAITER_TAKEN", kitchenOff).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCustomer",
    ]);
  });

  it("drops courier actions when the courier is closed", () => {
    expect(nextOrderActions("KITCHEN_PREPARED", courierOff).map((item) => item.action)).toEqual([
      "markKitchenDeliveredToWaiter",
    ]);
    expect(courierOrderActions("COURIER_TAKEN", courierOff)).toEqual([]);
    expect(nextOrderActions("WAITER_TAKEN", courierOff).map((item) => item.action)).toEqual([
      "markWaiterDeliveredToCustomer",
    ]);
  });

  it("lets the kitchen pick up confirmed tickets before marking them ready", () => {
    expect(kitchenOrderActions("CONFIRMED", kitchenOn).map((item) => item.action)).toEqual([
      "markKitchenPreparing",
    ]);
    expect(kitchenOrderActions("PREPARING", kitchenOn).map((item) => item.action)).toEqual([
      "markKitchenPrepared",
    ]);
    expect(kitchenOrderActions("CONFIRMED", kitchenOff)).toEqual([]);
  });

  it("splits actions by actor", () => {
    expect(kitchenOrderActions("KITCHEN_PREPARED", deliveryOn).map((item) => item.action)).toEqual([
      "markKitchenDeliveredToCourier",
      "markKitchenDeliveredToWaiter",
    ]);
    expect(waiterOrderActions("KITCHEN_DELIVERED_TO_WAITER", kitchenOn).map((item) => item.action)).toEqual([
      "markWaiterTaken",
    ]);
    expect(courierOrderActions("KITCHEN_DELIVERED_TO_COURIER", deliveryOn).map((item) => item.action)).toEqual([
      "markCourierTaken",
    ]);
  });
});

describe("waiter payment", () => {
  it("opens only after the waiter has taken the order", () => {
    expect(canWaiterCollectPayment("KITCHEN_PREPARING")).toBe(false);
    expect(canWaiterCollectPayment("KITCHEN_DELIVERED_TO_WAITER")).toBe(false);
    expect(canWaiterCollectPayment("READY")).toBe(false);
    expect(canWaiterCollectPayment("WAITER_TAKEN")).toBe(true);
    expect(canWaiterCollectPayment("SERVED")).toBe(true);
    expect(canWaiterCollectPayment("WAITER_DELIVERED_TO_CUSTOMER")).toBe(true);
    expect(canWaiterCollectPayment("WAITER_DELIVERED_TO_COURIER")).toBe(true);
    expect(orderBlocksWaiterPayment("KITCHEN_PREPARED")).toBe(true);
    expect(orderBlocksWaiterPayment("CANCELLED")).toBe(false);
  });

  it("blocks the bill while any ticket is still in the kitchen", () => {
    expect(
      waiterCanCollectOnOrders([
        { status: "WAITER_TAKEN" },
        { status: "KITCHEN_PREPARING" },
      ]),
    ).toBe(false);
    expect(
      waiterCanCollectOnOrders([{ status: "WAITER_TAKEN" }, { status: "WAITER_DELIVERED_TO_CUSTOMER" }]),
    ).toBe(true);
  });

  it("lets the waiter close the bill at any stage when the kitchen is off", () => {
    expect(waiterCanCollectOnOrders([{ status: "CONFIRMED" }, { status: "PREPARING" }], false)).toBe(true);
  });
});

describe("kitchen-off table service", () => {
  it("offers preparing and delivered as optional steps from confirmed", () => {
    expect(waiterServiceActions("CONFIRMED")).toEqual(["markServicePreparing", "markServiceDelivered"]);
    expect(waiterServiceActions("KITCHEN_PREPARING")).toEqual(["markServiceDelivered"]);
    expect(waiterServiceActions("READY")).toEqual(["markServiceDelivered"]);
    expect(waiterServiceActions("SERVED")).toEqual([]);
    expect(waiterServiceActions("SUBMITTED")).toEqual([]);
  });

  it("treats a served order as delivered to the customer", () => {
    expect(waiterServiceColumn("SUBMITTED")).toBe("approve");
    expect(waiterServiceColumn("CONFIRMED")).toBe("service");
    expect(waiterServiceColumn("PREPARING")).toBe("service");
    expect(waiterServiceColumn("SERVED")).toBe("delivered");
    expect(waiterServiceColumn("WAITER_DELIVERED_TO_CUSTOMER")).toBe("delivered");
    expect(waiterServiceStatusLabel("CONFIRMED")).toBe("Onaylandı");
    expect(waiterServiceStatusLabel("PREPARING")).toBe("Hazırlanıyor");
    expect(waiterServiceStatusLabel("SERVED")).toBe("Teslim edildi");
  });
});

describe("resolveOrderStatus", () => {
  beforeEach(() => {
    clearOrderFlowMemory();
  });

  it("keeps a dashboard status until the server catches up", () => {
    const stamped = stampOrderFlow({ id: 4, status: "READY", deliveryType: null }, "KITCHEN_DELIVERED_TO_WAITER");
    expect(stamped.status).toBe("KITCHEN_DELIVERED_TO_WAITER");
    expect(resolveOrderStatus({ id: 4, status: "READY" })).toBe("KITCHEN_DELIVERED_TO_WAITER");
    expect(resolveOrderStatus({ id: 4, status: "SERVED" })).toBe("WAITER_TAKEN");
  });
});

describe("applyKitchenOrderFlow", () => {
  beforeEach(() => {
    clearOrderFlowMemory();
  });

  it("keeps fresh confirmed tickets out of the preparing lane", () => {
    expect(applyKitchenOrderFlow({ id: 7, status: "CONFIRMED" }).status).toBe("CONFIRMED");
    expect(applyKitchenOrderFlow({ id: 7, status: "PREPARING" }).status).toBe("KITCHEN_PREPARING");
  });

  it("honours a status the kitchen just wrote", () => {
    stampOrderFlow({ id: 8, status: "CONFIRMED", deliveryType: null }, "KITCHEN_PREPARED");
    expect(applyKitchenOrderFlow({ id: 8, status: "CONFIRMED" }).status).toBe("KITCHEN_PREPARED");
  });
});
