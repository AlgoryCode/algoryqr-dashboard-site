import { describe, expect, it, beforeEach } from "vitest";

import {
  canWaiterCollectPayment,
  clearOrderFlowMemory,
  courierOrderActions,
  kitchenOrderActions,
  nextOrderActions,
  normalizeOrderStatus,
  orderBlocksWaiterPayment,
  resolveOrderStatus,
  stampOrderFlow,
  waiterCanCollectOnOrders,
  waiterOrderActions,
} from "./order-flow";

const kitchenOn = { kitchenEnabled: true, courierEnabled: true, delivery: false };
const deliveryOn = { kitchenEnabled: true, courierEnabled: true, delivery: true };
const kitchenOff = { kitchenEnabled: false, courierEnabled: true, delivery: false };
const courierOff = { kitchenEnabled: true, courierEnabled: false, delivery: true };

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
