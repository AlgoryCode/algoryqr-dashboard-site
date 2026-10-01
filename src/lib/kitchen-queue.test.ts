import { describe, expect, it } from "vitest";

import type { OrderResponse } from "@/lib/ordering-api";
import {
  formatKitchenElapsed,
  groupKitchenOrders,
  isKitchenTicketDelayed,
  kitchenAllowsCancel,
  kitchenAllowsNote,
  kitchenColumnTitle,
  kitchenCourierHandover,
  kitchenElapsedMinutes,
  kitchenHandoverTarget,
  kitchenInProgressBannerText,
  kitchenInProgressCount,
  kitchenKanbanColumnTitle,
  kitchenOrderOrigin,
  kitchenOrderOriginLabel,
  kitchenPrepProgress,
  kitchenProgressByTable,
  kitchenProgressForTable,
  kitchenReadyHandoverLabel,
  kitchenSkipsPreparing,
  kitchenTableLabel,
  kitchenTicketElapsedLabel,
  kitchenTicketFlowIndex,
  kitchenTicketFlowSteps,
  kitchenUsesCourier,
  matchesKitchenKanbanQuery,
  mergeKitchenOrders,
  readKitchenOrderList,
  servedBillIds,
  withoutClosedBillTickets,
  readyOrdersBannerText,
  sortReadyOrders,
  tableKitchenSubtitleParts,
} from "./kitchen-queue";

function order(partial: Partial<OrderResponse> & Pick<OrderResponse, "id" | "status">): OrderResponse {
  return {
    tableName: null,
    ...partial,
  };
}

describe("kitchen queue", () => {
  it("groups orders into KDS columns", () => {
    const grouped = groupKitchenOrders([
      order({ id: 1, status: "CONFIRMED" }),
      order({ id: 2, status: "PREPARING" }),
      order({ id: 3, status: "READY" }),
      order({ id: 4, status: "SERVED" }),
      order({ id: 5, status: "SUBMITTED" }),
      order({ id: 6, status: "ON_THE_WAY", orderSource: "STORE" }),
    ]);
    expect(grouped.CONFIRMED.map((item) => item.id)).toEqual([1]);
    expect(grouped.PREPARING.map((item) => item.id)).toEqual([2]);
    expect(grouped.READY.map((item) => item.id)).toEqual([3]);
    expect(grouped.SERVED.map((item) => item.id)).toEqual([4, 6]);
  });

  it("puts cancelled tickets in their own column and never flags them late", () => {
    const cancelled = order({ id: 7, status: "CANCELLED", confirmedAt: "2026-09-29T08:00:00.000Z" });
    const grouped = groupKitchenOrders([cancelled, order({ id: 8, status: "REJECTED" })]);
    expect(grouped.CANCELLED.map((item) => item.id)).toEqual([7, 8]);
    expect(kitchenKanbanColumnTitle("CANCELLED")).toBe("İptal Edilenler");
    expect(isKitchenTicketDelayed(cancelled, Date.parse("2026-09-29T12:00:00.000Z"))).toBe(false);
  });

  it("tells courier handovers apart from waiter handovers", () => {
    expect(kitchenHandoverTarget("KITCHEN_DELIVERED_TO_COURIER")).toBe("COURIER");
    expect(kitchenHandoverTarget("COURIER_TAKEN")).toBe("COURIER");
    expect(kitchenHandoverTarget("KITCHEN_DELIVERED_TO_WAITER")).toBeNull();
    expect(kitchenHandoverTarget("SERVED")).toBe("WAITER");
    expect(kitchenHandoverTarget("DELIVERED")).toBe("WAITER");
    expect(kitchenHandoverTarget("READY")).toBeNull();
  });

  it("never hands table orders to a courier, but does for phone, online and integrations", () => {
    const tableOrders = [
      { orderSource: "QR", tableName: "Masa 1", tableId: 3 },
      { orderSource: "WAITER", tableName: "Bahçe 4", tableId: 9 },
    ];
    for (const table of tableOrders) {
      expect(kitchenCourierHandover(table, true).kind).toBe("unavailable");
    }
    expect(kitchenCourierHandover({ orderSource: "PHONE", deliveryType: "DELIVERY" }, true).kind).toBe("staff");
    expect(kitchenCourierHandover({ orderSource: "STORE", deliveryType: "DELIVERY" }, true).kind).toBe("staff");
    expect(kitchenCourierHandover({ orderSource: "UBER_EATS" }, true).kind).toBe("platform");
    expect(kitchenCourierHandover({ orderSource: "YEMEKSEPETI" }, true).kind).toBe("platform");
  });

  it("sends only addressed store deliveries to a courier account", () => {
    expect(kitchenCourierHandover({ orderSource: "STORE", deliveryType: "DELIVERY" }, true)).toEqual({ kind: "staff" });
    expect(kitchenCourierHandover({ orderSource: "PHONE", deliveryType: "DELIVERY" }, true)).toEqual({ kind: "staff" });
    expect(kitchenCourierHandover({ orderSource: "UBER_EATS" }, true)).toEqual({ kind: "platform" });
    expect(kitchenCourierHandover({ orderSource: "QR", tableName: "Masa 1", tableId: 3 }, true)).toEqual({
      kind: "unavailable",
      reason: "Masa siparişinde teslimat adresi yok",
    });
    expect(kitchenCourierHandover({ orderSource: "STORE", deliveryType: "PICKUP" }, true).kind).toBe("unavailable");
    expect(
      kitchenCourierHandover(
        { orderSource: "STORE", deliveryType: "DELIVERY", deliveryAddress: "" },
        true,
      ),
    ).toEqual({ kind: "staff" });
    expect(kitchenCourierHandover({ orderSource: "STORE", deliveryType: "DELIVERY" }, false)).toEqual({
      kind: "unavailable",
      reason: "Bu şubede kurye kapalı",
    });
  });

  it("only lets the kitchen cancel its own order sources", () => {
    expect(kitchenAllowsCancel("TABLE")).toBe(true);
    expect(kitchenAllowsCancel("ONLINE")).toBe(true);
    expect(kitchenAllowsCancel("UBER_EATS")).toBe(false);
    expect(kitchenAllowsCancel("YEMEKSEPETI")).toBe(false);
  });

  it("labels kitchen handover separately from customer serve", () => {
    expect(kitchenColumnTitle("CONFIRMED", "kitchen")).toBe("Onaylandı");
    expect(kitchenColumnTitle("PREPARING", "kitchen")).toBe("Mutfakta");
    expect(kitchenColumnTitle("READY", "kitchen")).toBe("Hazır");
    expect(kitchenColumnTitle("SERVED", "kitchen")).toBe("Garsona teslim");
    expect(kitchenColumnTitle("SERVED", "owner")).toBe("Müşteriye teslim");
    expect(kitchenColumnTitle("SERVED", "waiter")).toBe("Müşteriye teslim");
  });

  it("uses operational titles on the kitchen kanban", () => {
    expect(kitchenKanbanColumnTitle("CONFIRMED")).toBe("Yeni Siparişler");
    expect(kitchenKanbanColumnTitle("PREPARING")).toBe("Hazırlanıyor");
    expect(kitchenKanbanColumnTitle("READY")).toBe("Hazır");
    expect(kitchenKanbanColumnTitle("SERVED")).toBe("Teslim Edildi");
  });

  it("filters the kitchen kanban by ticket no, customer, table or item", () => {
    const ticket = order({
      id: 4092,
      status: "CONFIRMED",
      orderNumber: "TR-4092",
      customerName: "Burak Yılmaz",
      tableName: "Masa 4",
      items: [{ productId: 1, productName: "Double Burger", quantity: 2 }],
    });
    expect(matchesKitchenKanbanQuery(ticket, "4092")).toBe(true);
    expect(matchesKitchenKanbanQuery(ticket, "burak")).toBe(true);
    expect(matchesKitchenKanbanQuery(ticket, "burger")).toBe(true);
    expect(matchesKitchenKanbanQuery(ticket, "kurye")).toBe(false);
  });

  it("marks open tickets delayed after the SLA window", () => {
    const now = Date.parse("2026-09-19T20:25:00.000Z");
    const late = order({ id: 1, status: "CONFIRMED", confirmedAt: "2026-09-19T20:00:00.000Z" });
    const onTime = order({ id: 2, status: "PREPARING", confirmedAt: "2026-09-19T20:10:00.000Z" });
    const done = order({
      id: 3,
      status: "SERVED",
      confirmedAt: "2026-09-19T20:00:00.000Z",
      servedAt: "2026-09-19T20:24:00.000Z",
    });
    expect(kitchenElapsedMinutes(late, now)).toBe(25);
    expect(isKitchenTicketDelayed(late, now)).toBe(true);
    expect(isKitchenTicketDelayed(onTime, now)).toBe(false);
    expect(isKitchenTicketDelayed(done, now)).toBe(false);
    expect(kitchenPrepProgress(late, now)).toEqual({ percent: 95, remainingMinutes: 0 });
    expect(kitchenPrepProgress(onTime, now).remainingMinutes).toBe(5);
  });

  it("mirrors merchant kitchen steps on each ticket", () => {
    expect(kitchenTicketFlowSteps("ONLINE").map((step) => step.label)).toEqual([
      "Onaylandı",
      "Hazırlanıyor",
      "Hazır",
      "Kurye bekliyor",
      "Yolda",
      "Teslim edildi",
    ]);
    expect(kitchenTicketFlowSteps("ONLINE", "PICKUP").map((step) => step.status)).toEqual([
      "CONFIRMED",
      "PREPARING",
      "READY",
      "DELIVERED",
    ]);
    expect(kitchenTicketFlowSteps("TABLE").map((step) => step.label)).toEqual([
      "Onaylandı",
      "Hazırlanıyor",
      "Hazır",
      "Tamamlandı",
    ]);
    expect(kitchenTicketFlowSteps("UBER_EATS").map((step) => step.status)).toEqual([
      "CONFIRMED",
      "PREPARING",
      "READY",
    ]);
    expect(kitchenTicketFlowIndex("PENDING", "ONLINE")).toBe(-1);
    expect(kitchenTicketFlowIndex("PREPARING", "ONLINE")).toBe(1);
    expect(kitchenTicketFlowIndex("ON_THE_WAY", "ONLINE")).toBe(4);
    expect(kitchenTicketFlowIndex("DELIVERED", "ONLINE", "PICKUP")).toBe(3);
    expect(kitchenTicketFlowIndex("SERVED", "TABLE")).toBe(3);
    expect(kitchenTicketFlowIndex("PREPARING", "UBER_EATS")).toBe(1);
  });

  it("sorts ready meals by ready time then id", () => {
    expect(
      sortReadyOrders([
        order({ id: 3, status: "READY", readyAt: "2026-09-19T12:10:00.000Z" }),
        order({ id: 1, status: "PREPARING", readyAt: "2026-09-19T11:00:00.000Z" }),
        order({ id: 2, status: "READY", readyAt: "2026-09-19T12:05:00.000Z" }),
        order({ id: 4, status: "READY", readyAt: "2026-09-19T12:05:00.000Z" }),
      ]).map((item) => item.id),
    ).toEqual([2, 4, 3]);
  });

  it("builds a waiter banner for ready tables", () => {
    expect(readyOrdersBannerText([])).toBeNull();
    expect(
      readyOrdersBannerText([order({ id: 1, status: "READY", tableName: "Masa 6" })]),
    ).toBe("Masa 6 yemeği hazır");
    expect(
      readyOrdersBannerText([
        order({ id: 1, status: "READY", tableName: "Masa 6" }),
        order({ id: 2, status: "READY", tableName: "Bahçe 2" }),
      ]),
    ).toBe("Masa 6, Bahçe 2 yemekleri hazır");
  });

  it("builds a waiter banner for kitchen in-progress tables", () => {
    expect(kitchenInProgressBannerText([])).toBeNull();
    expect(
      kitchenInProgressBannerText([order({ id: 1, status: "CONFIRMED", tableName: "Masa 3" })]),
    ).toBe("Masa 3 onaylandı");
    expect(
      kitchenInProgressBannerText([order({ id: 1, status: "PREPARING", tableName: "Bahçe 1" })]),
    ).toBe("Bahçe 1 mutfakta");
    expect(
      kitchenInProgressBannerText([
        order({ id: 1, status: "CONFIRMED", tableName: "Masa 3" }),
        order({ id: 2, status: "PREPARING", tableName: "Bahçe 1" }),
        order({ id: 3, status: "READY", tableName: "Masa 6" }),
      ]),
    ).toBe("2 sipariş mutfakta");
  });

  it("summarizes kitchen steps per table including ready meals", () => {
    const grouped = kitchenProgressByTable([
      order({ id: 1, status: "READY", tableId: 10, tableName: "masa-1" }),
      order({ id: 2, status: "PREPARING", tableId: 10, tableName: "masa-1" }),
      order({ id: 3, status: "CONFIRMED", tableId: 10, tableName: "masa-1" }),
      order({ id: 2, status: "PREPARING", tableId: 10, tableName: "masa-1" }),
      order({ id: 4, status: "PREPARING", tableId: 11, tableName: "masa-2" }),
      order({ id: 5, status: "SUBMITTED", tableId: 10, tableName: "masa-1" }),
    ]);
    const table1 = kitchenProgressForTable({ tableId: 10, tableName: "masa-1" }, grouped);
    expect(table1).toEqual({ confirmedCount: 1, preparingCount: 1, readyCount: 1 });
    expect(kitchenInProgressCount(table1)).toBe(2);
    expect(tableKitchenSubtitleParts(table1, 1)).toEqual([
      "1 yemek hazır",
      "1 mutfakta",
      "1 onaylandı",
      "1 onay bekliyor",
    ]);
    expect(kitchenProgressForTable({ tableId: 11, tableName: "masa-2" }, grouped)).toEqual({
      confirmedCount: 0,
      preparingCount: 1,
      readyCount: 0,
    });
  });

  it("falls back to table name when order has no tableId", () => {
    const grouped = kitchenProgressByTable([
      order({ id: 1, status: "CONFIRMED", tableName: "Bahçe 1" }),
    ]);
    expect(kitchenProgressForTable({ tableId: 99, tableName: "Bahçe 1" }, grouped)).toEqual({
      confirmedCount: 1,
      preparingCount: 0,
      readyCount: 0,
    });
  });

  it("does not copy kitchen steps to another table that shares the same name", () => {
    const grouped = kitchenProgressByTable([
      order({ id: 1, status: "PREPARING", tableId: 10, tableName: "masa-1" }),
      order({ id: 2, status: "READY", tableId: 10, tableName: "masa-1" }),
    ]);
    expect(kitchenProgressForTable({ tableId: 10, tableName: "masa-1" }, grouped)).toEqual({
      confirmedCount: 0,
      preparingCount: 1,
      readyCount: 1,
    });
    expect(kitchenProgressForTable({ tableId: 99, tableName: "masa-1" }, grouped)).toEqual({
      confirmedCount: 0,
      preparingCount: 0,
      readyCount: 0,
    });
  });

  it("uses latest table status when live kitchen orders have not arrived", () => {
    const grouped = kitchenProgressByTable([]);
    expect(
      kitchenProgressForTable(
        { tableId: 4, tableName: "masa-1", latestPendingStatus: "PREPARING", readyOrderCount: 1 },
        grouped,
      ),
    ).toEqual({ confirmedCount: 0, preparingCount: 1, readyCount: 1 });
  });

  it("labels kitchen tickets by source channel", () => {
    expect(kitchenOrderOrigin({ tableName: "Masa 4" })).toBe("TABLE");
    expect(kitchenOrderOriginLabel("TABLE")).toBe("Masa");
    expect(kitchenTableLabel({ tableName: "Masa 4", tableId: 4 })).toBe("Masa 4");
    expect(kitchenUsesCourier("TABLE")).toBe(false);
    expect(kitchenSkipsPreparing("TABLE")).toBe(false);
    expect(kitchenAllowsNote("TABLE")).toBe(true);
    expect(kitchenReadyHandoverLabel("TABLE")).toBe("Garsona teslim bekleniyor");

    expect(kitchenOrderOrigin({ orderSource: "UBER_EATS", tableName: "Uber Eats" })).toBe("UBER_EATS");
    expect(kitchenOrderOriginLabel("UBER_EATS")).toBe("Uber Eats");
    expect(kitchenSkipsPreparing("UBER_EATS")).toBe(true);
    expect(kitchenUsesCourier("UBER_EATS")).toBe(true);
    expect(kitchenReadyHandoverLabel("UBER_EATS")).toBe("Kurye teslimi bekleniyor");
    expect(
      kitchenTableLabel({
        orderSource: "UBER_EATS",
        tableName: "Uber Eats",
        customerName: "Ayşe",
      }),
    ).toBe("Ayşe");

    expect(kitchenOrderOrigin({ orderSource: "STORE" })).toBe("ONLINE");
    expect(kitchenOrderOrigin({ orderSource: "PHONE" })).toBe("PHONE");
    expect(kitchenOrderOriginLabel("PHONE")).toBe("Telefon");
    expect(kitchenUsesCourier("PHONE")).toBe(true);
    expect(kitchenReadyHandoverLabel("PHONE")).toBe("Kurye teslimi bekleniyor");
    expect(kitchenOrderOrigin({ orderSource: "ONLINE_ORDER" })).toBe("ONLINE");
    expect(kitchenOrderOrigin({ tableName: "Online sipariş" })).toBe("TABLE");
    expect(kitchenOrderOriginLabel("ONLINE")).toBe("Online");
    expect(kitchenTableLabel({ orderSource: "STORE", customerName: "Ali" })).toBe("Ali");
    expect(kitchenAllowsNote("ONLINE")).toBe(true);
    expect(kitchenUsesCourier("ONLINE")).toBe(true);
    expect(kitchenUsesCourier("ONLINE", "PICKUP")).toBe(false);
    expect(kitchenReadyHandoverLabel("ONLINE")).toBe("Kurye teslimi bekleniyor");
    expect(kitchenReadyHandoverLabel("ONLINE", "PICKUP")).toBe("Gel-al teslimi bekleniyor");

    expect(kitchenOrderOrigin({ orderSource: "YEMEKSEPETI" })).toBe("YEMEKSEPETI");
    expect(kitchenOrderOrigin({ orderSource: "YEMEK_SEPETI" })).toBe("YEMEKSEPETI");
    expect(kitchenOrderOrigin({ tableName: "Yemeksepeti" })).toBe("TABLE");
    expect(kitchenOrderOriginLabel("YEMEKSEPETI")).toBe("Yemeksepeti");
    expect(kitchenAllowsNote("YEMEKSEPETI")).toBe(false);
    expect(kitchenSkipsPreparing("YEMEKSEPETI")).toBe(true);
    expect(kitchenTableLabel({ orderSource: "YEMEKSEPETI", customerName: "Ece" })).toBe("Ece");
  });

  it("formats kitchen ticket duration from arrival time", () => {
    const now = Date.parse("2026-09-19T20:12:00.000Z");
    expect(formatKitchenElapsed("2026-09-19T20:11:50.000Z", now)).toBe("10 sn");
    expect(formatKitchenElapsed("2026-09-19T20:00:00.000Z", now)).toBe("12 dk");
    expect(
      kitchenTicketElapsedLabel(
        { confirmedAt: "2026-09-19T20:00:00.000Z", servedAt: "2026-09-19T20:08:00.000Z" },
        now,
      ),
    ).toBe("8 dk");
  });

  it("drops served tickets for a closed bill and leaves other tables", () => {
    const orders = [
      order({ id: 1, status: "SERVED", tableId: 69, tableName: "masa-1", billId: 14 }),
      order({ id: 2, status: "READY", tableId: 69, tableName: "masa-1", billId: 14 }),
      order({ id: 3, status: "SERVED", tableId: 70, tableName: "masa-2", billId: 20 }),
      order({ id: 4, status: "PREPARING", tableId: 70, tableName: "masa-2", billId: 20 }),
      order({ id: 5, status: "SERVED", tableId: 69, tableName: "masa-1" }),
    ];

    expect(servedBillIds(orders)).toEqual([14, 20]);
    expect(withoutClosedBillTickets(orders, new Set([14])).map((item) => item.id)).toEqual([2, 3, 4, 5]);
  });

  it("merges table and online tickets without colliding on the same id", () => {
    const merged = mergeKitchenOrders(
      [order({ id: 11, status: "SERVED", tableName: "Masa 1", createdAt: "2026-09-19T19:00:00.000Z" })],
      [
        order({
          id: 11,
          status: "CONFIRMED",
          orderSource: "STORE",
          customerName: "Ece",
          createdAt: "2026-09-19T18:00:00.000Z",
        }),
      ],
    );
    expect(merged.map((item) => `${item.orderSource ?? "QR"}:${item.id}`)).toEqual(["STORE:11", "QR:11"]);
  });

  it("unwraps kitchen queue payloads from either a list or named collections", () => {
    expect(readKitchenOrderList([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(readKitchenOrderList({ content: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(readKitchenOrderList({ tableOrders: [{ id: 3 }], storeOrders: [{ id: 4 }] })).toEqual([
      { id: 3 },
      { id: 4 },
    ]);
  });
});
