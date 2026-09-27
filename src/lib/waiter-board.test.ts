import { describe, expect, it } from "vitest";

import type { OrderResponse } from "@/lib/ordering-api";

import {
  deliveredTablePayment,
  filterWaiterShiftBoard,
  groupDeliveredTables,
  groupWaiterShift,
  rememberWaiterDelivery,
  tableIdsAwaitingPayment,
} from "./waiter-board";

function order(partial: Partial<OrderResponse> & Pick<OrderResponse, "id" | "status">): OrderResponse {
  return { tableName: null, ...partial };
}

describe("groupWaiterShift", () => {
  it("keeps the shift in four steps and does not reopen delivered tickets", () => {
    const served = Array.from({ length: 14 }, (_, index) =>
      order({
        id: 100 + index,
        status: "SERVED",
        orderSource: "QR",
        tableName: "masa-1",
        orderNumber: String(100 + index),
        servedAt: "2026-09-27T04:00:00.000Z",
      }),
    );
    const board = groupWaiterShift({
      pending: [order({ id: 1, status: "PENDING", orderSource: "QR", tableName: "masa-2" })],
      kitchen: [
        order({ id: 2, status: "PREPARING", orderSource: "QR", tableName: "masa-3" }),
        order({ id: 3, status: "READY", orderSource: "QR", tableName: "masa-4", items: [{ productId: 1, productName: "Çay", quantity: 1 }] }),
        ...served,
      ],
      ready: [order({ id: 3, status: "READY", orderSource: "QR", tableName: "masa-4" })],
      today: served,
    });

    expect(board.approve.map((item) => item.id)).toEqual([1]);
    expect(board.cooking.map((item) => item.id)).toEqual([2]);
    expect(board.deliver.map((item) => item.id)).toEqual([3]);
    expect(board.deliver[0]?.items).toEqual([{ productId: 1, productName: "Çay", quantity: 1 }]);
    expect(board.delivered).toHaveLength(14);
    expect(board.delivered.map((item) => item.id)).not.toContain(3);
  });

  it("drops courier tickets and keeps counter pickup", () => {
    const board = groupWaiterShift({
      ready: [
        order({ id: 1, status: "READY", orderSource: "STORE", deliveryType: "DELIVERY" }),
        order({ id: 2, status: "READY", orderSource: "UBER_EATS" }),
        order({ id: 3, status: "READY", orderSource: "STORE", deliveryType: "PICKUP", customerName: "Ali" }),
      ],
    });
    expect(board.deliver.map((item) => item.id)).toEqual([3]);
  });

  it("lets the furthest status win when lists disagree", () => {
    const board = groupWaiterShift({
      pending: [order({ id: 8, status: "PENDING", orderSource: "QR", tableName: "masa-1" })],
      kitchen: [order({ id: 8, status: "CONFIRMED", orderSource: "QR", tableName: "masa-1" })],
      ready: [order({ id: 9, status: "READY", orderSource: "QR", tableName: "masa-2" })],
      today: [order({ id: 9, status: "SERVED", orderSource: "QR", tableName: "masa-2", servedAt: "2026-09-27T04:10:00.000Z" })],
    });
    expect(board.approve).toHaveLength(0);
    expect(board.cooking.map((item) => item.id)).toEqual([8]);
    expect(board.deliver).toHaveLength(0);
    expect(board.delivered.map((item) => item.id)).toEqual([9]);
  });

  it("moves a ticket the waiter just handed over even if the lists still say ready", () => {
    const ready = order({
      id: 136,
      status: "READY",
      orderSource: "QR",
      tableName: "masa-1",
      items: [{ productId: 9, productName: "Keremacun", quantity: 2 }],
    });
    const carried = rememberWaiterDelivery(ready, { id: 136, status: "SERVED", waiterName: "Ali" }, 136);
    const board = groupWaiterShift({
      ready: [ready],
      servedNow: [carried],
    });
    expect(board.deliver).toHaveLength(0);
    expect(board.delivered[0]).toMatchObject({
      id: 136,
      status: "SERVED",
      tableName: "masa-1",
      waiterName: "Ali",
      items: [{ productId: 9, productName: "Keremacun", quantity: 2 }],
    });
  });

  it("stacks delivered tickets for the same table under one rectangle", () => {
    const groups = groupDeliveredTables([
      order({ id: 143, status: "SERVED", orderSource: "QR", tableId: 20, tableName: "masa-1", orderNumber: "143" }),
      order({ id: 142, status: "SERVED", orderSource: "QR", tableId: 20, tableName: "masa-1", orderNumber: "142" }),
      order({ id: 9, status: "SERVED", orderSource: "QR", tableId: 21, tableName: "masa-2", orderNumber: "9" }),
    ]);
    expect(groups.map((group) => group.label)).toEqual(["masa-1", "masa-2"]);
    expect(groups[0]?.orders.map((item) => item.id)).toEqual([143, 142]);
    expect(groups[0]?.tableId).toBe(20);
  });

  it("filters the shift board to one table", () => {
    const board = groupWaiterShift({
      pending: [order({ id: 1, status: "PENDING", tableId: 10, tableName: "masa-1" })],
      ready: [order({ id: 2, status: "READY", tableId: 11, tableName: "masa-2" })],
    });
    const filtered = filterWaiterShiftBoard(board, 10);
    expect(filtered.approve.map((item) => item.id)).toEqual([1]);
    expect(filtered.deliver).toHaveLength(0);
    expect(filterWaiterShiftBoard(board, null)).toEqual(board);
  });

  it("blinks unpaid deliveries red and turns settled bills green", () => {
    const awaiting = new Set([68]);
    expect(
      deliveredTablePayment({
        tableId: 68,
        orders: [order({ id: 1, status: "SERVED", billId: 7 })],
        awaitingPaymentIds: awaiting,
        tablesLoaded: true,
      }),
    ).toBe("unpaid");
    expect(
      deliveredTablePayment({
        tableId: 69,
        orders: [
          order({ id: 144, status: "SERVED", billId: 18 }),
          order({ id: 143, status: "SERVED", billId: 17 }),
        ],
        awaitingPaymentIds: awaiting,
        tablesLoaded: true,
      }),
    ).toBe("paid");
    expect(
      deliveredTablePayment({
        tableId: 69,
        orders: [order({ id: 145, status: "SERVED", billId: null })],
        awaitingPaymentIds: awaiting,
        tablesLoaded: true,
      }),
    ).toBe("unpaid");
    expect(
      deliveredTablePayment({
        tableId: 69,
        orders: [order({ id: 144, status: "SERVED", billId: 18 })],
        awaitingPaymentIds: awaiting,
        tablesLoaded: false,
      }),
    ).toBe("unpaid");
  });

  it("marks only tables with an open bill as awaiting payment", () => {
    const ids = tableIdsAwaitingPayment([
      { tableId: 20, billStatus: "OPEN", openBillId: 14 },
      { tableId: 21, billStatus: "CLOSED", openBillId: null },
      { tableId: 22, billStatus: "EMPTY" },
      { tableId: 23, billStatus: null, openBillId: 30 },
    ]);
    expect([...ids].sort((a, b) => a - b)).toEqual([20, 23]);
  });

  it("hides a rejected ticket", () => {
    const board = groupWaiterShift({
      pending: [order({ id: 4, status: "PENDING", orderSource: "QR", tableName: "masa-1" })],
      dismissedIds: [4],
    });
    expect(board.approve).toHaveLength(0);
  });
});
