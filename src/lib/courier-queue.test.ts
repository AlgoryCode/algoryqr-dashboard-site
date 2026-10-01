import { describe, expect, it } from "vitest";

import type { CourierTicket } from "./store-courier";
import {
  courierColumnFor,
  courierKanbanColumnTitle,
  courierCanAct,
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
  it("groups delivery tickets into courier columns (legacy statuses normalized)", () => {
    const grouped = groupCourierOrders([
      ticket({ id: 1, status: "KITCHEN_DELIVERED_TO_COURIER" }),
      ticket({ id: 2, status: "COURIER_TAKEN" }),
      ticket({ id: 3, status: "COURIER_DELIVERED_TO_CUSTOMER" }),
      ticket({ id: 4, status: "WAITER_DELIVERED_TO_COURIER" }),
    ]);
    expect(grouped.HANDOFF.map((item) => item.id)).toEqual([1, 4]);
    expect(grouped.TAKEN.map((item) => item.id)).toEqual([2]);
    expect(grouped.DELIVERED.map((item) => item.id)).toEqual([3]);
  });

  it("normalizes legacy statuses into new columns", () => {
    const grouped = groupCourierOrders([
      ticket({ id: 1, status: "READY" }),
      ticket({ id: 2, status: "ON_THE_WAY" }),
      ticket({ id: 3, status: "DELIVERED" }),
    ]);
    expect(grouped.HANDOFF.map((item) => item.id)).toEqual([]);
    expect(grouped.TAKEN.map((item) => item.id)).toEqual([2]);
    expect(grouped.DELIVERED.map((item) => item.id)).toEqual([3]);
  });

  it("uses operational titles on the courier kanban", () => {
    expect(courierKanbanColumnTitle("HANDOFF")).toBe("Teslim Al");
    expect(courierKanbanColumnTitle("TAKEN")).toBe("Yolda");
    expect(courierKanbanColumnTitle("DELIVERED")).toBe("Teslim Edildi");
    expect(courierColumnFor("COURIER_TAKEN")).toBe("TAKEN");
    expect(courierColumnFor("ON_THE_WAY")).toBe("TAKEN");
  });

  it("asks the courier to leave when handed off and to confirm delivery on the way", () => {
    expect(courierPrimaryAction(ticket({ id: 1, status: "KITCHEN_DELIVERED_TO_COURIER" }))?.action).toBe("dispatch");
    expect(courierPrimaryAction(ticket({ id: 1, status: "READY" }))).toBeNull();
    expect(courierPrimaryAction(ticket({ id: 2, status: "COURIER_TAKEN" }))?.action).toBe("deliver");
    expect(courierPrimaryAction(ticket({ id: 2, status: "ON_THE_WAY" }))?.action).toBe("deliver");
    expect(courierPrimaryAction(ticket({ id: 3, status: "KITCHEN_PREPARING" }))).toBeNull();
  });

  it("filters by order no, customer or address", () => {
    const order = ticket({
      id: 9,
      status: "KITCHEN_DELIVERED_TO_COURIER",
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
      isCourierTicketDelayed(ticket({ id: 1, status: "KITCHEN_PREPARING", createdAt: "2026-09-19T20:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isCourierTicketDelayed(ticket({ id: 2, status: "COURIER_DELIVERED_TO_CUSTOMER", createdAt: "2026-09-19T20:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isCourierTicketDelayed(
        ticket({
          id: 3,
          status: "KITCHEN_DELIVERED_TO_COURIER",
          readyAt: "2026-09-19T20:00:00.000Z",
          createdAt: "2026-09-19T20:00:00.000Z",
        }),
        now,
      ),
    ).toBe(true);
  });

  it("lets only the assigned courier move a package from handoff to delivered", () => {
    const assigned = ticket({ id: 4, status: "AWAITING_COURIER", courierStaffId: 9 });
    expect(courierPrimaryAction(assigned)?.action).toBe("dispatch");
    expect(courierPrimaryAction(ticket({ id: 5, status: "READY", courierStaffId: 9 }))).toBeNull();
    expect(courierCanAct(assigned, 9)?.action).toBe("dispatch");
    expect(courierCanAct(assigned, 3)).toBeNull();
    expect(courierCanAct(ticket({ id: 6, status: "ON_THE_WAY" }), 9)).toBeNull();
    expect(courierCanAct(ticket({ id: 7, status: "ON_THE_WAY", courierStaffId: 9 }), 9)?.action).toBe("deliver");
  });

  it("merges waiter and store courier tickets by id", () => {
    const merged = mergeCourierOrders(
      [ticket({ id: 1, status: "KITCHEN_DELIVERED_TO_COURIER", customerName: "A" })],
      [ticket({ id: 1, status: "COURIER_TAKEN", customerName: "B" }), ticket({ id: 2, status: "KITCHEN_DELIVERED_TO_COURIER" })],
    );
    expect(merged.map((item) => item.id)).toEqual([1, 2]);
    expect(merged[0]?.status).toBe("COURIER_TAKEN");
  });
});
