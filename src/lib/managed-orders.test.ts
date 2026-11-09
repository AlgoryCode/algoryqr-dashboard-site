import { describe, expect, it } from "vitest";

import { orderDaysForRange, orderReference } from "./managed-orders";
import type { OrderResponse } from "./ordering-api";

function order(partial: Partial<OrderResponse>): OrderResponse {
  return { id: 9, status: "PENDING", ...partial };
}

describe("orderReference", () => {
  it("prefers order number, then external id, then local id", () => {
    expect(orderReference(order({ orderNumber: "A-12" }))).toBe("A-12");
    expect(orderReference(order({ externalOrderId: "UE-88" }))).toBe("UE-88");
    expect(orderReference(order({}))).toBe("#9");
  });
});

describe("orderDaysForRange", () => {
  const now = new Date(2026, 10, 9, 15, 0, 0);

  it("covers today with one spare day", () => {
    expect(orderDaysForRange("2026-11-09", now)).toBe(2);
  });

  it("grows with the length of the range", () => {
    expect(orderDaysForRange("2026-11-03", now)).toBe(8);
  });

  it("asks for everything when there is no start date", () => {
    expect(orderDaysForRange("", now)).toBeUndefined();
    expect(orderDaysForRange(undefined, now)).toBeUndefined();
    expect(orderDaysForRange("gecersiz", now)).toBeUndefined();
  });
});
