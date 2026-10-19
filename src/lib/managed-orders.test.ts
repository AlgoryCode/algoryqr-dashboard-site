import { describe, expect, it } from "vitest";

import { orderReference } from "./managed-orders";
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
