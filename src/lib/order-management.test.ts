import { describe, expect, it } from "vitest";

import type { OrderResponse } from "@/lib/ordering-api";
import type { StoreOrderSummary } from "@/lib/store-api";
import {
  buildOrderChartCompare,
  buildOrderKpis,
  channelFlowRows,
  dailyOrderSeries,
  dailyRevenueSplit,
  delayedOpenOrders,
  filterManagedOrders,
  formatOrderHistoryDate,
  formatOrderWhenCompact,
  buildOpsLaneSnapshots,
  canMarkServedToCustomer,
  groupOpsLaneOrders,
  groupSalonByWaiter,
  salonTableOrderStatusLabel,
  integrationEarnings,
  isOpenOrderStatus,
  itemSummary,
  matchesOrderSearch,
  mergeManagedOrders,
  overlayStoreKitchenDetails,
  needsApprovalOrders,
  opsLaneForOrder,
  orderChannel,
  orderFlowStage,
  orderHistoryTitle,
  orderLocationLabel,
  orderManagementHomeHref,
  orderManagementPanelHref,
  restaurantLayoutFromOrderManagementHref,
  orderStatusLabel,
  parseOrderManagementPanel,
  sortOrdersNewestFirst,
  sourceEarnings,
  storeOrderToManagedOrder,
  sumOrderRevenue,
  tableChannelEarnings,
  tableSpotEarnings,
  topProductShares,
} from "./order-management";

function order(partial: Partial<OrderResponse> & Pick<OrderResponse, "id" | "status">): OrderResponse {
  return {
    tableName: null,
    ...partial,
  };
}

describe("order management channel + search", () => {
  it("maps every integration source to a channel", () => {
    expect(orderChannel(order({ id: 1, status: "CONFIRMED", orderSource: "QR" }))).toBe("QR");
    expect(orderChannel(order({ id: 2, status: "CONFIRMED", orderSource: "WAITER" }))).toBe("WAITER");
    expect(orderChannel(order({ id: 3, status: "CONFIRMED", orderSource: "STORE" }))).toBe("ONLINE");
    expect(orderChannel(order({ id: 4, status: "CONFIRMED", orderSource: "UBER_EATS" }))).toBe("UBER_EATS");
    expect(orderChannel(order({ id: 5, status: "CONFIRMED", orderSource: "YEMEKSEPETI" }))).toBe(
      "YEMEKSEPETI",
    );
    expect(orderChannel(order({ id: 6, status: "CONFIRMED", orderSource: "PHONE", deliveryType: "DELIVERY" }))).toBe(
      "PHONE",
    );
  });

  it("falls back to table / platform labels when source is missing", () => {
    expect(orderChannel(order({ id: 1, status: "CONFIRMED", tableName: "Masa 4" }))).toBe("QR");
    expect(orderChannel(order({ id: 2, status: "CONFIRMED", tableName: "Uber Eats" }))).toBe("UBER_EATS");
    expect(orderLocationLabel(order({ id: 3, status: "CONFIRMED", orderSource: "STORE", deliveryType: "PICKUP" }))).toBe(
      "Gel al",
    );
  });

  it("uses location when the customer name is too short for the history list", () => {
    expect(
      orderHistoryTitle(order({ id: 1, status: "CONFIRMED", customerName: "f", tableName: "Masa 4" })),
    ).toBe("Masa 4");
    expect(orderHistoryTitle(order({ id: 2, status: "CONFIRMED", customerName: "Ayşe Demir" }))).toBe("Ayşe Demir");
    expect(orderHistoryTitle(order({ id: 3, status: "CONFIRMED", customerName: "Misafir", tableName: "masa-1" }))).toBe(
      "masa-1",
    );
  });

  it("searches across customer, waiter, products, notes and ids", () => {
    const ticket = order({
      id: 88,
      status: "PREPARING",
      orderNumber: "TR-88",
      customerName: "Ayşe Demir",
      waiterName: "Can",
      note: "Az pişmiş",
      items: [{ productId: 1, productName: "Cheeseburger", quantity: 1 }],
    });
    expect(matchesOrderSearch(ticket, "ayşe")).toBe(true);
    expect(matchesOrderSearch(ticket, "can")).toBe(true);
    expect(matchesOrderSearch(ticket, "cheese")).toBe(true);
    expect(matchesOrderSearch(ticket, "tr-88")).toBe(true);
    expect(matchesOrderSearch(ticket, "az piş")).toBe(true);
    expect(matchesOrderSearch(ticket, "pizza")).toBe(false);
  });
});

describe("order management filters and metrics", () => {
  const sample: OrderResponse[] = [
    order({
      id: 1,
      status: "CONFIRMED",
      orderSource: "QR",
      totalAmount: 100,
      submittedAt: "2026-09-20T10:00:00",
      customerName: "Ali",
    }),
    order({
      id: 2,
      status: "PREPARING",
      orderSource: "UBER_EATS",
      totalAmount: 80,
      submittedAt: "2026-09-20T11:00:00",
      customerName: "Ece",
    }),
    order({
      id: 3,
      status: "CANCELLED",
      orderSource: "STORE",
      totalAmount: 50,
      submittedAt: "2026-09-19T09:00:00",
      customerName: "Mert",
    }),
    order({
      id: 4,
      status: "SERVED",
      orderSource: "WAITER",
      totalAmount: 40,
      submittedAt: "2026-09-20T12:00:00",
      customerName: "Selin",
    }),
  ];

  it("filters by date, channel, status and query together", () => {
    const filtered = filterManagedOrders(sample, {
      from: "2026-09-20",
      to: "2026-09-20",
      channel: "UBER_EATS",
      status: "preparing",
      query: "ece",
    });
    expect(filtered.map((item) => item.id)).toEqual([2]);
  });

  it("keeps cancelled orders out of revenue and served orders in", () => {
    expect(sumOrderRevenue(sample, false)).toBe(220);
    expect(orderFlowStage("SERVED")).toBe("DELIVERED");
    expect(orderFlowStage("REJECTED")).toBe("CLOSED");
  });

  it("builds kpis, channel flow for every integration and daily series", () => {
    const kpis = buildOrderKpis(sample, false);
    expect(kpis.totalOrders).toBe(4);
    expect(kpis.openOrders).toBe(2);
    expect(kpis.pendingOrders).toBe(1);
    expect(kpis.revenue).toBe(220);

    const channels = channelFlowRows(sample);
    expect(channels).toHaveLength(6);
    expect(channels.find((row) => row.channel === "YEMEKSEPETI")?.total).toBe(0);
    expect(channels.find((row) => row.channel === "UBER_EATS")?.stages.PREPARING).toBe(1);

    const daily = dailyOrderSeries(sample);
    expect(daily.map((point) => point.date)).toEqual(["2026-09-19", "2026-09-20"]);
    expect(daily[1].orders).toBe(3);
  });

  it("keeps period revenue when the live list is narrowed to open orders", () => {
    const period = filterManagedOrders(sample, { from: "2026-09-20", to: "2026-09-20" });
    const openList = filterManagedOrders(sample, {
      from: "2026-09-20",
      to: "2026-09-20",
      status: "open",
    });
    expect(buildOrderKpis(period, false).revenue).toBe(220);
    expect(sumOrderRevenue(openList, false)).toBe(180);
    expect(openList).toHaveLength(2);
  });

  it("sorts incoming orders newest first", () => {
    expect(sortOrdersNewestFirst(sample).map((item) => item.id)).toEqual([4, 2, 1, 3]);
  });

  it("treats store pending as received and open", () => {
    expect(orderFlowStage("PENDING")).toBe("RECEIVED");
    expect(isOpenOrderStatus("PENDING")).toBe(true);
    expect(orderStatusLabel("PENDING")).toBe("Onay bekliyor");
    expect(filterManagedOrders([order({ id: 9, status: "PENDING", orderSource: "STORE" })], { status: "pending" })).toHaveLength(
      1,
    );
  });
});

describe("store orders on the management board", () => {
  function storeSummary(
    partial: Partial<StoreOrderSummary> & Pick<StoreOrderSummary, "id" | "status">,
  ): StoreOrderSummary {
    return {
      orderNo: `S-${partial.id}`,
      deliveryType: "DELIVERY",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
      customerName: "Ayşe Demir",
      customerPhone: "0555 111 22 33",
      totalAmount: 185,
      currency: "TRY",
      itemCount: 2,
      createdAt: "2026-09-20T13:00:00",
      ...partial,
    };
  }

  it("prints online-order details from the store summary", () => {
    const managed = storeOrderToManagedOrder(
      storeSummary({ id: 15, status: "PENDING", deliveryType: "PICKUP", itemCount: 3 }),
    );
    expect(orderChannel(managed)).toBe("ONLINE");
    expect(orderLocationLabel(managed)).toBe("Gel al");
    expect(managed.orderNumber).toBe("S-15");
    expect(managed.customerName).toBe("Ayşe Demir");
    expect(itemSummary(managed)).toBe("3 ürün");
  });

  it("keeps colliding qr and store ids as separate tickets", () => {
    const store = storeOrderToManagedOrder(storeSummary({ id: 5, status: "PREPARING" }));
    const merged = mergeManagedOrders(
      [order({ id: 5, status: "CONFIRMED", orderSource: "QR", tableName: "Masa 2" })],
      [store],
    );
    expect(merged).toHaveLength(2);
    expect(orderChannel(merged[0])).toBe("QR");
    expect(orderChannel(merged[1])).toBe("ONLINE");
  });

  it("prefers the store ticket when the menu list already has the online order", () => {
    const store = storeOrderToManagedOrder(storeSummary({ id: 8, status: "READY", itemCount: 4 }));
    const merged = mergeManagedOrders(
      [order({ id: 8, status: "READY", orderSource: "STORE", customerName: "Eski" })],
      [store],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].customerName).toBe("Ayşe Demir");
    expect(itemSummary(merged[0])).toBe("4 ürün");
  });

  it("replaces a phone summary with the kitchen ticket that has item and address details", () => {
    const summary = storeOrderToManagedOrder(
      storeSummary({
        id: 14,
        status: "CONFIRMED",
        customerName: "Ali Veli\u2060",
        itemCount: 1,
      }),
    );
    const detailed = order({
      id: 14,
      status: "CONFIRMED",
      orderSource: "PHONE",
      customerName: "Ali Veli",
      customerPhone: "0555 111 22 33",
      deliveryType: "DELIVERY",
      deliveryAddress: "Bağdat Cad. 12",
      items: [{ productId: 8, productName: "Keremacun", quantity: 1 }],
    });
    const [ticket] = overlayStoreKitchenDetails([summary], [detailed]);
    expect(ticket.orderSource).toBe("PHONE");
    expect(ticket.deliveryAddress).toBe("Bağdat Cad. 12");
    expect(itemSummary(ticket)).toBe("1× Keremacun");
    expect(orderChannel(ticket)).toBe("PHONE");
  });
});

describe("manager dashboard attention helpers", () => {
  it("lists pending store tickets as approval work", () => {
    const pending = order({ id: 1, status: "PENDING", orderSource: "STORE" });
    const confirmed = order({ id: 2, status: "CONFIRMED", orderSource: "QR" });
    expect(needsApprovalOrders([pending, confirmed]).map((item) => item.id)).toEqual([1]);
  });

  it("flags open kitchen tickets past SLA as delayed", () => {
    const now = new Date("2026-09-21T12:00:00").getTime();
    const delayed = order({
      id: 3,
      status: "PREPARING",
      submittedAt: "2026-09-21T11:20:00",
      createdAt: "2026-09-21T11:20:00",
    });
    const fresh = order({
      id: 4,
      status: "PREPARING",
      submittedAt: "2026-09-21T11:55:00",
      createdAt: "2026-09-21T11:55:00",
    });
    const served = order({
      id: 5,
      status: "SERVED",
      submittedAt: "2026-09-21T11:00:00",
      createdAt: "2026-09-21T11:00:00",
      servedAt: "2026-09-21T11:10:00",
    });
    expect(delayedOpenOrders([delayed, fresh, served], now).map((item) => item.id)).toEqual([3]);
  });

  it("shows compact relative times for recent tickets", () => {
    const now = new Date("2026-09-21T12:00:00").getTime();
    expect(formatOrderWhenCompact("2026-09-21T11:59:20", now)).toBe("Az önce");
    expect(formatOrderWhenCompact("2026-09-21T11:47:00", now)).toBe("13 dk önce");
    expect(formatOrderWhenCompact("2026-09-21T10:05:00", now)).toMatch(/10[:.]05/);
  });

  it("prints history dates as day month year", () => {
    expect(formatOrderHistoryDate("2026-09-21T12:00:00")).toMatch(/21/);
    expect(formatOrderHistoryDate("2026-09-21T12:00:00")).toMatch(/2026/);
    expect(formatOrderHistoryDate(null)).toBe("—");
  });
});

describe("salon waiter grouping", () => {
  it("groups by assigned waiter instead of a single unassigned bucket", () => {
    const groups = groupSalonByWaiter([
      order({
        id: 1,
        status: "PREPARING",
        orderSource: "QR",
        tableName: "masa-1",
      }),
      order({
        id: 2,
        status: "READY",
        orderSource: "QR",
        tableName: "masa-2",
        waiterName: "Ayşe",
        waiterId: 7,
      }),
      order({
        id: 3,
        status: "CONFIRMED",
        orderSource: "QR",
        tableName: "masa-2",
      }),
    ]);
    expect(groups.map((group) => group.waiterName)).toEqual(["Ayşe", "masa-1"]);
    expect(groups.every((group) => group.waiterName !== "Atanmamış")).toBe(true);
    expect(groups.find((group) => group.waiterName === "Ayşe")?.activeTableCount).toBe(1);
  });

  it("inherits waiter from another order on the same table", () => {
    const groups = groupSalonByWaiter([
      order({
        id: 1,
        status: "PREPARING",
        orderSource: "WAITER",
        tableId: 4,
        tableName: "masa-1",
        waiterName: "Mehmet",
        waiterId: 3,
      }),
      order({
        id: 2,
        status: "READY",
        orderSource: "QR",
        tableId: 4,
        tableName: "masa-1",
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.waiterName).toBe("Mehmet");
    expect(groups[0]?.activeTableCount).toBe(1);
  });

  it("inherits waiter from kitchen-lane orders when indexing the full branch list", () => {
    const kitchenOrder = order({
      id: 10,
      status: "PREPARING",
      orderSource: "QR",
      tableId: 4,
      tableName: "masa-1",
      waiterName: "Mehmet",
      waiterId: 3,
    });
    const readySalon = order({
      id: 2,
      status: "READY",
      orderSource: "QR",
      tableId: 4,
      tableName: "masa-1",
    });
    const groups = groupSalonByWaiter([readySalon], { waiterIndexOrders: [kitchenOrder, readySalon] });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.waiterName).toBe("Mehmet");
  });
});

describe("salon table order labels", () => {
  it("labels ready tickets for kitchen pickup and served tickets with the waiter name", () => {
    const context = [
      order({
        id: 1,
        status: "READY",
        orderSource: "QR",
        tableName: "masa-1",
      }),
      order({
        id: 2,
        status: "SERVED",
        orderSource: "QR",
        tableName: "masa-1",
        waiterName: "Ayşe",
        waiterId: 7,
      }),
    ];
    expect(salonTableOrderStatusLabel(context[0], context)).toBe("Mutfaktan alınacak");
    expect(salonTableOrderStatusLabel(context[1], context)).toBe("Ayşe");
  });
});

describe("earnings mix, top products and ops lanes", () => {
  const mix: OrderResponse[] = [
    order({
      id: 1,
      status: "SERVED",
      orderSource: "QR",
      tableName: "Masa 4",
      totalAmount: 120,
      submittedAt: "2026-09-20T10:00:00",
      items: [{ productId: 1, productName: "Lahmacun", quantity: 3, lineTotal: 90 }],
    }),
    order({
      id: 2,
      status: "PREPARING",
      orderSource: "UBER_EATS",
      totalAmount: 80,
      submittedAt: "2026-09-20T11:00:00",
      items: [{ productId: 2, productName: "Ayran", quantity: 2, lineTotal: 20 }],
    }),
    order({
      id: 3,
      status: "READY",
      orderSource: "WAITER",
      tableName: "Masa 2",
      waiterName: "Can",
      totalAmount: 60,
      submittedAt: "2026-09-20T12:00:00",
      items: [{ productId: 1, productName: "Lahmacun", quantity: 1, lineTotal: 30 }],
    }),
    order({
      id: 4,
      status: "ON_THE_WAY",
      orderSource: "STORE",
      deliveryType: "DELIVERY",
      totalAmount: 40,
      submittedAt: "2026-09-20T12:30:00",
    }),
    order({
      id: 5,
      status: "READY",
      orderSource: "STORE",
      deliveryType: "PICKUP",
      totalAmount: 25,
      submittedAt: "2026-09-20T12:40:00",
    }),
  ];

  it("splits integration earnings from table earnings and keeps a grand total", () => {
    const integrations = integrationEarnings(mix, false);
    const tables = tableChannelEarnings(mix, false);
    expect(integrations.total).toBe(145);
    expect(tables.total).toBe(180);
    expect(integrations.total + tables.total).toBe(sumOrderRevenue(mix, false));
    expect(integrations.rows.find((row) => row.key === "UBER_EATS")?.revenue).toBe(80);
    expect(tableSpotEarnings(mix, false).map((row) => row.label)).toEqual(["Masa 4", "Masa 2"]);
  });

  it("lists internal, online and marketplace amounts for the source donut", () => {
    const sources = sourceEarnings(mix, false);
    expect(sources.total).toBe(325);
    expect(sources.rows.find((row) => row.key === "INTERNAL")?.revenue).toBe(180);
    expect(sources.rows.find((row) => row.key === "ONLINE")?.revenue).toBe(65);
    expect(sources.rows.find((row) => row.key === "UBER_EATS")?.revenue).toBe(80);
    expect(sources.rows.find((row) => row.key === "YEMEKSEPETI")?.revenue).toBe(0);
  });

  it("includes yemeksepeti incoming totals in kpis and source earnings", () => {
    const withYemeksepeti = [
      ...mix,
      order({
        id: 9,
        status: "CONFIRMED",
        orderSource: "YEMEKSEPETI",
        totalAmount: 95.5,
        submittedAt: "2026-09-20T13:00:00",
        customerName: "Ece",
      }),
    ];
    expect(buildOrderKpis(withYemeksepeti, false).revenue).toBe(420.5);
    expect(sourceEarnings(withYemeksepeti, false).rows.find((row) => row.key === "YEMEKSEPETI")?.revenue).toBe(
      95.5,
    );
  });

  it("exposes product names with quantity percentages", () => {
    const products = topProductShares(mix, 8);
    expect(products[0]).toMatchObject({ name: "Lahmacun", quantity: 4 });
    expect(products[0].share).toBeCloseTo((4 / 6) * 100);
    expect(products[1]).toMatchObject({ name: "Ayran", quantity: 2 });
  });

  it("routes kitchen, waiter and courier tickets into separate live lanes", () => {
    const lanes = groupOpsLaneOrders(mix);
    expect(lanes.kitchen.map((item) => item.id)).toEqual([2]);
    expect(lanes.waiter.map((item) => item.id)).toEqual([5, 3]);
    expect(lanes.courier.map((item) => item.id)).toEqual([4]);
    expect(opsLaneForOrder(mix[0])).toBeNull();
  });

  it("sends early statuses to waiter when kitchen is disabled", () => {
    const preparing = order({
      id: 21,
      status: "PREPARING",
      orderSource: "QR",
      tableName: "Masa 9",
    });
    const confirmed = order({
      id: 22,
      status: "CONFIRMED",
      orderSource: "WAITER",
      tableName: "Masa 10",
    });
    expect(opsLaneForOrder(preparing, true)).toBe("kitchen");
    expect(opsLaneForOrder(preparing, false)).toBe("waiter");
    expect(opsLaneForOrder(confirmed, false)).toBe("waiter");

    const lanesOff = groupOpsLaneOrders([preparing, confirmed], false);
    expect(lanesOff.kitchen).toHaveLength(0);
    expect(lanesOff.waiter.map((item) => item.id).sort()).toEqual([21, 22]);

    const snapshotsOff = buildOpsLaneSnapshots([preparing, confirmed], false);
    expect(snapshotsOff.kitchen.primary.count).toBe(0);
    expect(snapshotsOff.waiter.primary.orders.map((item) => item.id).sort()).toEqual([21, 22]);
  });

  it("lets the waiter hand a ready table or pickup order to the customer", () => {
    expect(
      canMarkServedToCustomer(order({ id: 1, status: "READY", orderSource: "QR", tableName: "masa-1" })),
    ).toBe(true);
    expect(
      canMarkServedToCustomer(
        order({ id: 2, status: "READY", orderSource: "STORE", deliveryType: "PICKUP" }),
      ),
    ).toBe(true);
    expect(
      canMarkServedToCustomer(
        order({ id: 3, status: "READY", orderSource: "STORE", deliveryType: "DELIVERY" }),
      ),
    ).toBe(false);
    expect(opsLaneForOrder(order({ id: 6, status: "CONFIRMED", orderSource: "PHONE", deliveryType: "DELIVERY" }))).toBe(
      "kitchen",
    );
    expect(opsLaneForOrder(order({ id: 7, status: "READY", orderSource: "PHONE", deliveryType: "DELIVERY" }))).toBe(
      "courier",
    );
    expect(
      canMarkServedToCustomer(order({ id: 4, status: "PREPARING", orderSource: "QR", tableName: "masa-1" })),
    ).toBe(false);
    expect(
      canMarkServedToCustomer(order({ id: 5, status: "SERVED", orderSource: "QR", tableName: "masa-1" })),
    ).toBe(false);
  });

  it("counts dishes waiting and ready, waiter handoff, and courier delivery", () => {
    const tracked = [
      order({
        id: 11,
        status: "PREPARING",
        orderSource: "QR",
        tableName: "Masa 1",
        items: [{ productId: 1, productName: "Pizza", quantity: 2 }],
      }),
      order({
        id: 12,
        status: "READY",
        orderSource: "QR",
        tableName: "Masa 2",
        items: [{ productId: 1, productName: "Pizza", quantity: 1 }],
      }),
      order({
        id: 13,
        status: "SERVED",
        orderSource: "QR",
        tableName: "Masa 3",
        items: [{ productId: 2, productName: "Çorba", quantity: 4 }],
      }),
      order({
        id: 14,
        status: "ON_THE_WAY",
        orderSource: "STORE",
        deliveryType: "DELIVERY",
        items: [{ productId: 3, productName: "Burger", quantity: 3 }],
      }),
      order({
        id: 15,
        status: "DELIVERED",
        orderSource: "STORE",
        deliveryType: "DELIVERY",
        items: [{ productId: 3, productName: "Burger", quantity: 2 }],
      }),
      order({
        id: 16,
        status: "READY",
        orderSource: "STORE",
        deliveryType: "DELIVERY",
        items: [{ productId: 4, productName: "Kebap", quantity: 5 }],
      }),
      order({
        id: 17,
        status: "DELIVERED",
        orderSource: "STORE",
        deliveryType: "PICKUP",
        items: [{ productId: 5, productName: "Ayran", quantity: 1 }],
      }),
      order({
        id: 18,
        status: "CANCELLED",
        orderSource: "QR",
        items: [{ productId: 1, productName: "Pizza", quantity: 9 }],
      }),
      order({
        id: 19,
        status: "ON_THE_WAY",
        orderSource: "STORE",
        deliveryType: "DELIVERY",
      }),
    ];
    const snapshots = buildOpsLaneSnapshots(tracked);
    expect(snapshots.kitchen.primary).toMatchObject({ label: "bekleyen", count: 2 });
    expect(snapshots.kitchen.secondary).toMatchObject({ label: "hazır", count: 6 });
    expect(snapshots.waiter.primary).toMatchObject({ label: "teslim edilecek", count: 1 });
    expect(snapshots.waiter.secondary).toMatchObject({ label: "teslim edilen", count: 5 });
    expect(snapshots.courier.primary).toMatchObject({ label: "dağıtımda", count: 4 });
    expect(snapshots.courier.secondary).toMatchObject({ label: "teslim edilen", count: 2 });
    expect(snapshots.courier.extra).toMatchObject({ label: "teslim alınacak", count: 5 });
    expect(snapshots.kitchen.primary.orders.map((item) => item.id)).toEqual([11]);
  });

  it("builds a daily stacked series for tables vs integrations", () => {
    const daily = dailyRevenueSplit(mix, false);
    expect(daily).toHaveLength(1);
    expect(daily[0].tables).toBe(180);
    expect(daily[0].integrations).toBe(145);
    expect(daily[0].total).toBe(325);
  });
});

describe("order chart period compare", () => {
  const ranges = {
    yesterday: { from: "2026-09-20", to: "2026-09-20" },
    today: { from: "2026-09-21", to: "2026-09-21" },
    "7d": { from: "2026-09-15", to: "2026-09-21" },
  };
  const sample: OrderResponse[] = [
    order({
      id: 1,
      status: "SERVED",
      orderSource: "QR",
      totalAmount: 100,
      submittedAt: "2026-09-21T10:00:00",
    }),
    order({
      id: 2,
      status: "SERVED",
      orderSource: "UBER_EATS",
      totalAmount: 40,
      submittedAt: "2026-09-20T10:00:00",
    }),
    order({
      id: 3,
      status: "SERVED",
      orderSource: "STORE",
      totalAmount: 70,
      submittedAt: "2026-09-15T10:00:00",
    }),
  ];

  it("overlays hourly totals so today stays comparable with yesterday", () => {
    const series = buildOrderChartCompare(sample, false, ["yesterday", "today"], ranges, ranges.today);
    expect(series.mode).toBe("hour");
    const ten = series.points.find((point) => point.label === "10:00");
    expect(ten).toMatchObject({ today: 100, yesterday: 40 });
    expect(Object.keys(ten ?? {})).toEqual(["label", "yesterday", "today"]);
  });

  it("compares 7d as an hourly average against today", () => {
    const series = buildOrderChartCompare(sample, false, ["today", "7d"], ranges, ranges.today);
    const ten = series.points.find((point) => point.label === "10:00");
    expect(ten?.today).toBe(100);
    expect(ten?.sevenDay).toBeCloseTo(210 / 7);
  });

  it("plots 7d-only as daily totals", () => {
    const series = buildOrderChartCompare(sample, false, ["7d"], ranges, ranges["7d"]);
    expect(series.mode).toBe("day");
    expect(series.points).toHaveLength(7);
    expect(series.points[0]?.sevenDay).toBe(70);
    expect(series.points.at(-1)?.sevenDay).toBe(100);
  });
});

describe("order management panel links", () => {
  it("parses known panels and ignores unknown values", () => {
    expect(parseOrderManagementPanel("orders")).toBe("orders");
    expect(parseOrderManagementPanel("kitchen")).toBe("kitchen");
    expect(parseOrderManagementPanel("online")).toBe("online");
    expect(parseOrderManagementPanel("uber-eats")).toBe("uber-eats");
    expect(parseOrderManagementPanel("integrations")).toBe("integrations");
    expect(parseOrderManagementPanel("ops-kitchen")).toBe("ops-kitchen");
    expect(parseOrderManagementPanel("ops-waiter")).toBe("ops-waiter");
    expect(parseOrderManagementPanel("ops-courier")).toBe("ops-courier");
    expect(parseOrderManagementPanel("orders")).toBe("orders");
    expect(parseOrderManagementPanel("charts")).toBeNull();
    expect(parseOrderManagementPanel(null)).toBeNull();
  });

  it("keeps current filters when opening and closing a panel", () => {
    const current = new URLSearchParams("qr=12&status=open");
    expect(orderManagementPanelHref(current, "kitchen")).toBe(
      "/dashboard/garson?qr=12&status=open&panel=kitchen",
    );
    expect(orderManagementHomeHref(new URLSearchParams("qr=12&status=open&panel=kitchen"))).toBe(
      "/dashboard/garson?qr=12&status=open",
    );
    expect(orderManagementHomeHref(new URLSearchParams("panel=online"))).toBe("/dashboard/garson");
  });

  it("sends restaurant layout back to the current order management screen", () => {
    expect(restaurantLayoutFromOrderManagementHref("/dashboard/garson?qr=12")).toBe(
      "/dashboard/dijital-menu/restaurant-layout?return=%2Fdashboard%2Fgarson%3Fqr%3D12",
    );
  });
});
