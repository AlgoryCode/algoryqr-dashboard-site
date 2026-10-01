import { describe, expect, it } from "vitest";

import {
  asCourierTicket,
  asCourierTickets,
  isCourierDeliveryOrder,
  storeOrderToCourierTicket,
} from "./store-courier";
import type { StoreOrderDetail } from "./store-api";

function storeOrder(partial: Partial<StoreOrderDetail> & Pick<StoreOrderDetail, "id" | "status">): StoreOrderDetail {
  return {
    orderNo: `A-${partial.id}`,
    deliveryType: "DELIVERY",
    paymentMethod: "CASH_ON_DELIVERY",
    paymentStatus: "PENDING",
    customerName: "Ayşe",
    customerPhone: "0555 111 22 33",
    totalAmount: 120,
    currency: "TRY",
    itemCount: 1,
    createdAt: "2026-09-19T20:00:00.000Z",
    publicToken: "token",
    address: {
      addressText: "Bağdat Cad. 12",
      district: "Kadıköy",
    },
    note: "Zili çalma",
    subtotal: 110,
    deliveryFee: 10,
    discountAmount: 0,
    items: [
      {
        productId: 8,
        productName: "Lahmacun",
        unitPrice: 110,
        quantity: 1,
        note: "Acılı",
        options: [{ groupId: 1, groupName: "Boy", optionId: 2, optionName: "Büyük", priceDelta: 0 }],
        lineTotal: 110,
      },
    ],
    history: [],
    courier: { id: 3, fullName: "Ali Kurye", phone: "0532" },
    ...partial,
  };
}

describe("store courier mapping", () => {
  it("copies delivery fields onto a courier ticket", () => {
    const ticket = storeOrderToCourierTicket(storeOrder({ id: 11, status: "READY" }));
    expect(ticket).toMatchObject({
      id: 11,
      orderNo: "A-11",
      customerName: "Ayşe",
      customerPhone: "0555 111 22 33",
      deliveryAddress: "Bağdat Cad. 12, Kadıköy",
      note: "Zili çalma",
      status: "READY",
      courierName: "Ali Kurye",
      paymentMethod: "CASH_ON_DELIVERY",
    });
    expect(ticket.items[0]).toMatchObject({
      quantity: 1,
      productName: "Lahmacun",
      note: "Acılı",
      options: ["Büyük"],
    });
  });

  it("keeps pickup orders out of the courier board", () => {
    expect(
      isCourierDeliveryOrder(storeOrder({ id: 1, status: "READY", deliveryType: "PICKUP" })),
    ).toBe(false);
    expect(asCourierTicket(storeOrder({ id: 1, status: "READY", deliveryType: "PICKUP" }))).toBeNull();
    expect(isCourierDeliveryOrder(storeOrder({ id: 2, status: "READY" }))).toBe(true);
  });

  it("drops kitchen-only statuses", () => {
    expect(asCourierTicket(storeOrder({ id: 4, status: "CONFIRMED" }))).toBeNull();
    expect(asCourierTickets({ content: [storeOrder({ id: 7, status: "ON_THE_WAY" })] }).map((item) => item.id)).toEqual([
      7,
    ]);
  });
});
