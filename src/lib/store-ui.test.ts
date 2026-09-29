import { describe, expect, it } from "vitest";

import {
  availableStoreOrderTransitions,
  defaultWorkingHours,
  formatStoreAddress,
  formatStoreClock,
  formatStoreElapsed,
  storeKitchenFlowIndex,
  storeKitchenFlowSteps,
  toStoreTimeInputValue,
} from "./store-ui";

describe("availableStoreOrderTransitions", () => {
  it("offers confirm and reject on a new order", () => {
    expect(availableStoreOrderTransitions("PENDING", "DELIVERY").map((entry) => entry.action)).toEqual([
      "confirm",
      "reject",
    ]);
  });

  it("sends a confirmed order to the kitchen", () => {
    expect(availableStoreOrderTransitions("CONFIRMED", "DELIVERY").map((entry) => entry.action)).toEqual([
      "markKitchenPrepared",
      "cancel",
    ]);
  });

  it("drops courier handoff for pickup orders", () => {
    expect(availableStoreOrderTransitions("READY", "PICKUP").map((entry) => entry.action)).not.toContain(
      "markKitchenDeliveredToCourier",
    );
    expect(availableStoreOrderTransitions("READY", "DELIVERY").map((entry) => entry.action)).toContain(
      "markKitchenDeliveredToCourier",
    );
  });

  it("uses courier handover as the last ready action for delivery", () => {
    expect(availableStoreOrderTransitions("READY", "DELIVERY").map((entry) => entry.action)).toEqual([
      "markKitchenDeliveredToCourier",
      "markKitchenDeliveredToWaiter",
      "cancel",
    ]);
    expect(availableStoreOrderTransitions("READY", "DELIVERY")[0]?.label).toBe("Kuryeye teslim et");
    expect(availableStoreOrderTransitions("READY", "PICKUP").map((entry) => entry.action)).toEqual([
      "markKitchenDeliveredToWaiter",
      "cancel",
    ]);
  });

  it("builds kitchen-aligned merchant steps", () => {
    expect(storeKitchenFlowSteps("DELIVERY").map((step) => step.label)).toEqual([
      "Mutfak hazırlıyor",
      "Mutfak hazırladı",
      "Mutfak kuryeye verdi",
      "Kurye teslim aldı",
      "Kurye müşteriye teslim etti",
    ]);
    expect(storeKitchenFlowSteps("PICKUP").map((step) => step.status)).toEqual([
      "KITCHEN_PREPARING",
      "KITCHEN_PREPARED",
      "KITCHEN_DELIVERED_TO_WAITER",
      "WAITER_TAKEN",
      "WAITER_DELIVERED_TO_CUSTOMER",
    ]);
    expect(storeKitchenFlowIndex("PENDING", "DELIVERY")).toBe(-1);
    expect(storeKitchenFlowIndex("PREPARING", "DELIVERY")).toBe(0);
    expect(storeKitchenFlowIndex("ON_THE_WAY", "DELIVERY")).toBe(3);
  });

  it("formats elapsed kitchen time", () => {
    const now = Date.parse("2026-09-19T20:12:05.000Z");
    expect(formatStoreElapsed("2026-09-19T20:12:00.000Z", now)).toBe("5 sn");
    expect(formatStoreElapsed("2026-09-19T20:00:00.000Z", now)).toBe("12 dk");
    expect(formatStoreElapsed("2026-09-19T18:12:05.000Z", now)).toBe("2 sa");
  });

  it("formats a clock time", () => {
    expect(formatStoreClock("2026-09-20T10:08:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
    expect(formatStoreClock(null)).toBe("-");
  });

  it("offers nothing once the order is closed", () => {
    expect(availableStoreOrderTransitions("DELIVERED", "DELIVERY")).toHaveLength(0);
    expect(availableStoreOrderTransitions("CANCELLED", "DELIVERY")).toHaveLength(0);
  });
});

describe("defaultWorkingHours", () => {
  it("covers every weekday as open until end of day", () => {
    const hours = defaultWorkingHours();
    expect(hours).toHaveLength(7);
    expect(hours.every((hour) => !hour.closed && hour.closesAt === "23:59")).toBe(true);
  });
});

describe("toStoreTimeInputValue", () => {
  it("strips seconds so time inputs can display backend LocalTime values", () => {
    expect(toStoreTimeInputValue("10:00:00")).toBe("10:00");
    expect(toStoreTimeInputValue("23:59:00")).toBe("23:59");
    expect(toStoreTimeInputValue("10:00")).toBe("10:00");
    expect(toStoreTimeInputValue("")).toBe("");
    expect(toStoreTimeInputValue(null)).toBe("");
  });
});

describe("formatStoreAddress", () => {
  it("joins the filled parts only", () => {
    expect(
      formatStoreAddress({ addressText: "Bağdat Cad. 12", buildingNo: "3", district: "Kadıköy" }),
    ).toBe("Bağdat Cad. 12, No: 3, Kadıköy");
  });

  it("falls back to a dash when empty", () => {
    expect(formatStoreAddress({})).toBe("-");
  });
});
