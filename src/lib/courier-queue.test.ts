import { describe, expect, it } from "vitest";

import type { CourierTicket } from "./store-courier";
import {
  courierColumnFor,
  courierKanbanColumnTitle,
  courierPrimaryAction,
  groupCourierOrders,
  isCourierTicketDelayed,
  matchesCourierKanbanQuery,
  mergeCourierOrders,
} from "./courier-queue";

function ticket(partial: Partial<CourierTicket> & Pick<CourierTicket, "id" | "status">): CourierTicket {
  return {
    orderNo: `S-${partial.id}`,
    customerName: "Ayşe",
    customerPhone: "0555",
    deliveryAddress: "Bağdat Cad.",
    totalAmount: 120,
    currency: "TRY",
    items: [{ productId: 1, productName: "Lahmacun", quantity: 2, options: [] }],
    createdAt: "2026-09-19T20:00:00.000Z",
    ...partial,
  };
}

describe("courier queue", () => {
  it("groups delivery tickets into courier columns", () => {
    const grouped = groupCourierOrders([
      ticket({ id: 1, status: "PREPARING" }),
      ticket({ id: 2, status: "READY" }),
      ticket({ id: 3, status: "ON_THE_WAY" }),
      ticket({ id: 4, status: "DELIVERED" }),
      ticket({ id: 5, status: "CONFIRMED" }),
    ]);
    expect(grouped.PREPARING.map((item) => item.id)).toEqual([1]);
    expect(grouped.READY.map((item) => item.id)).toEqual([2]);
    expect(grouped.ON_THE_WAY.map((item) => item.id)).toEqual([3]);
    expect(grouped.DELIVERED.map((item) => item.id)).toEqual([4]);
  });

  it("uses operational titles on the courier kanban", () => {
    expect(courierKanbanColumnTitle("PREPARING")).toBe("Mutfakta");
    expect(courierKanbanColumnTitle("READY")).toBe("Teslim Al");
    expect(courierKanbanColumnTitle("ON_THE_WAY")).toBe("Yolda");
    expect(courierKanbanColumnTitle("DELIVERED")).toBe("Teslim Edildi");
    expect(courierColumnFor("ON_THE_WAY")).toBe("ON_THE_WAY");
  });

  it("asks the courier to leave when ready and to confirm delivery on the way", () => {
    expect(courierPrimaryAction(ticket({ id: 1, status: "READY" }))?.action).toBe("dispatch");
    expect(courierPrimaryAction(ticket({ id: 2, status: "ON_THE_WAY" }))?.action).toBe("deliver");
    expect(courierPrimaryAction(ticket({ id: 3, status: "PREPARING" }))).toBeNull();
  });

  it("filters by order no, customer or address", () => {
    const order = ticket({
      id: 9,
      status: "READY",
      orderNo: "TR-9",
      customerName: "Burak",
      deliveryAddress: "Kadıköy",
    });
    expect(matchesCourierKanbanQuery(order, "tr-9")).toBe(true);
    expect(matchesCourierKanbanQuery(order, "burak")).toBe(true);
    expect(matchesCourierKanbanQuery(order, "kadıköy")).toBe(true);
    expect(matchesCourierKanbanQuery(order, "masa")).toBe(false);
  });

  it("does not mark preparing or delivered tickets as delayed", () => {
    const now = Date.parse("2026-09-19T21:00:00.000Z");
    expect(
      isCourierTicketDelayed(ticket({ id: 1, status: "PREPARING", createdAt: "2026-09-19T20:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isCourierTicketDelayed(ticket({ id: 2, status: "DELIVERED", createdAt: "2026-09-19T20:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isCourierTicketDelayed(
        ticket({
          id: 3,
          status: "READY",
          readyAt: "2026-09-19T20:00:00.000Z",
          createdAt: "2026-09-19T20:00:00.000Z",
        }),
        now,
      ),
    ).toBe(true);
  });

  it("merges waiter and store courier tickets by id", () => {
    const merged = mergeCourierOrders(
      [ticket({ id: 1, status: "READY", customerName: "A" })],
      [ticket({ id: 1, status: "ON_THE_WAY", customerName: "B" }), ticket({ id: 2, status: "READY" })],
    );
    expect(merged.map((item) => item.id)).toEqual([1, 2]);
    expect(merged[0]?.status).toBe("ON_THE_WAY");
  });
});
