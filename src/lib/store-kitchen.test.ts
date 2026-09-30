import { describe, expect, it } from "vitest";

import {
  asKitchenTicket,
  asKitchenTickets,
  isOnlineKitchenSource,
  storeOrderToKitchenTicket,
} from "./store-kitchen";
import { isPhoneCustomerName, markPhoneCustomerName } from "./phone-order";
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
        productName: "Keremacun",
        unitPrice: 110,
        quantity: 1,
        note: "Acılı",
        options: [{ groupId: 1, groupName: "Boy", optionId: 2, optionName: "Büyük", priceDelta: 0 }],
        lineTotal: 110,
      },
    ],
    history: [],
    ...partial,
  };
}

describe("store kitchen mapping", () => {
  it("copies online order fields onto a kitchen ticket", () => {
    const ticket = storeOrderToKitchenTicket(storeOrder({ id: 11, status: "CONFIRMED" }));
    expect(ticket).toMatchObject({
      id: 11,
      orderSource: "STORE",
      orderNumber: "A-11",
      customerName: "Ayşe",
      customerPhone: "0555 111 22 33",
      deliveryType: "DELIVERY",
      deliveryAddress: "Bağdat Cad. 12, Kadıköy",
      note: "Zili çalma",
      status: "KITCHEN_PREPARING",
    });
    expect(ticket.items?.[0]).toMatchObject({
      quantity: 1,
      productName: "Keremacun",
      note: "Acılı",
      selectedOptions: [{ optionName: "Büyük" }],
    });
  });

  it("keeps confirmed store orders in the kitchen's new column", () => {
    expect(asKitchenTicket(storeOrder({ id: 13, status: "CONFIRMED" }))?.status).toBe("CONFIRMED");
  });

  it("normalizes store-shaped kitchen queue payloads", () => {
    const ticket = asKitchenTicket(storeOrder({ id: 7, status: "PREPARING" }));
    expect(ticket?.orderSource).toBe("STORE");
    expect(ticket?.items?.[0]?.selectedOptions?.[0]?.optionName).toBe("Büyük");
    expect(asKitchenTickets({ content: [storeOrder({ id: 7, status: "PREPARING" })] }).map((item) => item.id)).toEqual([
      7,
    ]);
  });

  it("keeps waiter tickets as-is", () => {
    const ticket = asKitchenTicket({
      id: 99,
      status: "SERVED",
      tableName: "Masa",
      customerName: "Misafir",
    });
    expect(ticket).toMatchObject({ id: 99, tableName: "Masa", status: "SERVED" });
    expect(isOnlineKitchenSource(ticket?.orderSource)).toBe(false);
    expect(isOnlineKitchenSource("STORE")).toBe(true);
    expect(isOnlineKitchenSource("PHONE")).toBe(true);
  });

  it("tags phone orders separately from online orders", () => {
    const ticket = storeOrderToKitchenTicket(
      storeOrder({
        id: 12,
        status: "CONFIRMED",
        customerName: markPhoneCustomerName("Ali Veli"),
      }),
    );
    expect(isPhoneCustomerName(markPhoneCustomerName("Ali Veli"))).toBe(true);
    expect(ticket.orderSource).toBe("PHONE");
    expect(ticket.customerName).toBe("Ali Veli");
    expect(isOnlineKitchenSource(ticket.orderSource)).toBe(true);
  });
});
