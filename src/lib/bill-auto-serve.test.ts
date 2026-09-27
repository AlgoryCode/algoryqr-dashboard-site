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
  it("marks ready tickets for the paid table and leaves other tables alone", () => {
    const ready = [
      order({ id: 11, status: "READY", tableId: 4, orderSource: "QR" }),
      order({ id: 12, status: "READY", tableId: 4, orderSource: "WAITER" }),
      order({ id: 20, status: "READY", tableId: 8, orderSource: "QR" }),
    ];

    expect(readyOrdersToAutoServe(bill, ready).map((item) => item.id)).toEqual([11, 12]);
  });

  it("includes the open ticket and the bill id even when the table id is missing", () => {
    const ready = [
      order({ id: 30, status: "READY", orderSource: "QR", billId: 9 }),
      order({ id: 31, status: "READY", orderSource: "QR" }),
    ];

    expect(readyOrdersToAutoServe(bill, ready, 31).map((item) => item.id)).toEqual([30, 31]);
  });

  it("does not auto-serve kitchen, already served, or courier tickets", () => {
    const ready = [
      order({ id: 1, status: "PREPARING", tableId: 4, orderSource: "QR" }),
      order({ id: 2, status: "SERVED", tableId: 4, orderSource: "QR" }),
      order({ id: 3, status: "READY", tableId: 4, orderSource: "STORE", deliveryType: "DELIVERY" }),
    ];

    expect(readyOrdersToAutoServe(bill, ready)).toEqual([]);
  });
});
