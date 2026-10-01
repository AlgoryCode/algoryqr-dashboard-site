import { describe, expect, it } from "vitest";

import type { StoreOrderSummary } from "@/lib/store-api";
import {
  countOpenStoreOrders,
  groupStoreKanbanOrders,
  isStoreKanbanDelayed,
  matchesStoreKanbanQuery,
  storeKanbanChipLabel,
  storeKanbanColumnFor,
  storeKanbanInitials,
  storeKanbanPrepProgress,
  storeKanbanAssignCourier,
  storeKanbanPrimaryAction,
  storeKanbanRemainingMinutes,
  storeKanbanSlaTargetLabel,
} from "./store-kanban";

function order(partial: Partial<StoreOrderSummary> & Pick<StoreOrderSummary, "status">): StoreOrderSummary {
  return {
    id: partial.id ?? 1,
    orderNo: partial.orderNo ?? "TR-1",
    status: partial.status,
    deliveryType: partial.deliveryType ?? "DELIVERY",
    paymentMethod: partial.paymentMethod ?? "CASH_ON_DELIVERY",
    paymentStatus: partial.paymentStatus ?? "PENDING",
    customerName: partial.customerName ?? "Ayşe",
    customerPhone: partial.customerPhone ?? "555",
    totalAmount: partial.totalAmount ?? 100,
    currency: partial.currency ?? "TRY",
    itemCount: partial.itemCount ?? 2,
    courier: partial.courier,
    createdAt: partial.createdAt ?? "2026-09-20T10:00:00.000Z",
  };
}

describe("store kanban grouping", () => {
  it("maps statuses onto the four delivery columns", () => {
    expect(storeKanbanColumnFor("PENDING")).toBe("NEW");
    expect(storeKanbanColumnFor("CONFIRMED")).toBe("NEW");
    expect(storeKanbanColumnFor("PREPARING")).toBe("KITCHEN");
    expect(storeKanbanColumnFor("READY")).toBe("KITCHEN");
    expect(storeKanbanColumnFor("ON_THE_WAY")).toBe("TRANSIT");
    expect(storeKanbanColumnFor("DELIVERED")).toBe("DONE");
    expect(storeKanbanColumnFor("CANCELLED")).toBeNull();
  });

  it("groups a mixed list without dropping cancelled into a column", () => {
    const grouped = groupStoreKanbanOrders([
      order({ id: 1, status: "PENDING" }),
      order({ id: 2, status: "PREPARING" }),
      order({ id: 3, status: "ON_THE_WAY" }),
      order({ id: 4, status: "DELIVERED" }),
      order({ id: 5, status: "CANCELLED" }),
    ]);
    expect(grouped.NEW).toHaveLength(1);
    expect(grouped.KITCHEN).toHaveLength(1);
    expect(grouped.TRANSIT).toHaveLength(1);
    expect(grouped.DONE).toHaveLength(1);
  });
});

describe("store kanban search and SLA", () => {
  it("matches order no, customer and courier", () => {
    const target = order({
      status: "ON_THE_WAY",
      orderNo: "TR-4081",
      customerName: "Emre Çelik",
      courier: { id: 9, fullName: "Ahmet T.", phone: "532" },
    });
    expect(matchesStoreKanbanQuery(target, "4081")).toBe(true);
    expect(matchesStoreKanbanQuery(target, "emre")).toBe(true);
    expect(matchesStoreKanbanQuery(target, "ahmet")).toBe(true);
    expect(matchesStoreKanbanQuery(target, "yok")).toBe(false);
  });

  it("flags open tickets past the SLA window", () => {
    const now = Date.parse("2026-09-20T10:40:00.000Z");
    const late = order({ status: "PENDING", createdAt: "2026-09-20T10:00:00.000Z" });
    const ok = order({ status: "PENDING", createdAt: "2026-09-20T10:30:00.000Z" });
    const delivered = order({ status: "DELIVERED", createdAt: "2026-09-20T09:00:00.000Z" });
    expect(isStoreKanbanDelayed(late, 30, now)).toBe(true);
    expect(isStoreKanbanDelayed(ok, 30, now)).toBe(false);
    expect(isStoreKanbanDelayed(delivered, 30, now)).toBe(false);
  });

  it("caps kitchen progress under 100%", () => {
    const now = Date.parse("2026-09-20T10:40:00.000Z");
    expect(storeKanbanPrepProgress("2026-09-20T10:00:00.000Z", 30, now)).toEqual({
      percent: 95,
      remainingMinutes: 0,
    });
    expect(storeKanbanPrepProgress("2026-09-20T10:15:00.000Z", 30, now)).toEqual({
      percent: 83,
      remainingMinutes: 5,
    });
  });
});

describe("store kanban card actions", () => {
  it("asks for a courier only when a delivery is ready and unassigned", () => {
    expect(storeKanbanAssignCourier(order({ status: "PENDING" }))).toBe(false);
    expect(storeKanbanAssignCourier(order({ status: "READY", deliveryType: "DELIVERY" }))).toBe(true);
    expect(
      storeKanbanAssignCourier(
        order({
          status: "READY",
          deliveryType: "DELIVERY",
          courier: { id: 1, fullName: "Ali", phone: "1" },
        }),
      ),
    ).toBe(false);
  });

  it("uses the next merchant step, and courier dispatch only after assignment", () => {
    expect(storeKanbanPrimaryAction(order({ status: "PENDING" }))?.action).toBe("confirm");
    expect(storeKanbanPrimaryAction(order({ status: "PENDING" }), true)?.label).toBe("Hızlı Onay Ver");
    expect(storeKanbanPrimaryAction(order({ status: "CONFIRMED" }))?.label).toBe("Hazırlamaya başla");
    expect(storeKanbanPrimaryAction(order({ status: "PREPARING" }))?.action).toBe("markKitchenPrepared");
    expect(storeKanbanPrimaryAction(order({ status: "READY", deliveryType: "DELIVERY" }))).toBeNull();
    expect(
      storeKanbanPrimaryAction(
        order({
          status: "READY",
          deliveryType: "DELIVERY",
          courier: { id: 1, fullName: "Ali", phone: "1" },
        }),
      )?.action,
    ).toBe("markKitchenDeliveredToCourier");
    expect(storeKanbanPrimaryAction(order({ status: "READY", deliveryType: "PICKUP" }))?.action).toBe(
      "markWaiterDeliveredToCustomer",
    );
    expect(
      storeKanbanPrimaryAction(
        order({
          status: "READY",
          deliveryType: "DELIVERY",
          courier: { id: 1, fullName: "Ali", phone: "1" },
        }),
        false,
        { courierEnabled: false },
      )?.action,
    ).toBe("markWaiterDeliveredToCustomer");
    expect(storeKanbanAssignCourier(order({ status: "READY", deliveryType: "DELIVERY" }), false)).toBe(false);
  });

  it("marks delayed new orders as waiting for approval", () => {
    expect(storeKanbanChipLabel(order({ status: "PENDING" }), true, 27)).toBe("Onay Bekliyor (27 dk)");
    expect(storeKanbanChipLabel(order({ status: "PREPARING" }), false, 8, 80)).toBe("Hazırlık Aşaması (%80)");
  });

  it("sums live open counts", () => {
    expect(countOpenStoreOrders({ PENDING: 3, PREPARING: 4, ON_THE_WAY: 5, DELIVERED: 6 })).toBe(12);
  });
});

describe("store kanban SLA labels", () => {
  it("counts remaining minutes against the deadline", () => {
    const now = Date.parse("2026-09-20T10:12:00.000Z");
    expect(storeKanbanRemainingMinutes("2026-09-20T10:00:00.000Z", 30, now)).toBe(18);
    expect(storeKanbanRemainingMinutes("2026-09-20T10:00:00.000Z", 30, Date.parse("2026-09-20T10:40:00.000Z"))).toBe(
      -10,
    );
  });

  it("flags a breached SLA as critical", () => {
    const now = Date.parse("2026-09-20T10:40:00.000Z");
    expect(storeKanbanSlaTargetLabel("2026-09-20T10:00:00.000Z", 30, now)).toContain("Kritik Termin");
    expect(storeKanbanSlaTargetLabel("2026-09-20T10:20:00.000Z", 30, now)).toContain("dk kaldı");
  });

  it("builds operator initials from the business name", () => {
    expect(storeKanbanInitials("Kadıköy Kebap")).toBe("KK");
    expect(storeKanbanInitials("")).toBe("QR");
  });
});
