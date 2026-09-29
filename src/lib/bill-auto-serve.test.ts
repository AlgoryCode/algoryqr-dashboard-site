import { describe, expect, it } from "vitest";

import { readyOrdersToAutoServe } from "@/lib/bill-auto-serve";
import type { OrderResponse } from "@/lib/ordering-api";

function order(partial: Partial<OrderResponse> & Pick<OrderResponse, "id" | "status">): OrderResponse {
  return { tableName: null, ...partial };
}

const bill = {
  id: 9,
  tableId: 4,
  items: [{ sourceOrderId: 11 }, { sourceOrderId: null }],
};

describe("readyOrdersToAutoServe", () => {
  it("does not auto-advance tickets after payment", () => {
    const ready = [
      order({ id: 11, status: "WAITER_TAKEN", tableId: 4, orderSource: "QR" }),
      order({ id: 12, status: "KITCHEN_PREPARED", tableId: 4, orderSource: "WAITER" }),
    ];

    expect(readyOrdersToAutoServe(bill, ready)).toEqual([]);
    expect(readyOrdersToAutoServe(bill, ready, 11)).toEqual([]);
  });
});
