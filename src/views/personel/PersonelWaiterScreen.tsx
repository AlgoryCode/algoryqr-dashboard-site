"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, List, LogOut, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ordersForStaffBranch } from "@/lib/branch-scope";
import { formatBranchCode } from "@/lib/branch";
import { formatKitchenElapsed } from "@/lib/kitchen-queue";
import { orderLocationLabel } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import {
  filterWaiterShiftBoard,
  groupWaiterShift,
  rememberWaiterDelivery,
  tableIdsAwaitingPayment,
  type WaiterShiftBoard,
} from "@/lib/waiter-board";
import {
  confirmWaiterOrder,
  listKitchenQueue,
  listWaiterPendingOrders,
  listWaiterReadyOrders,
  listWaiterTables,
  listWaiterTodayOrders,
  markWaiterOrderPickedFromKitchen,
  rejectWaiterOrder,
  STAFF_ROLE_LABEL,
  waiterLogout,
  WaiterApiError,
  type WaiterMe,
  type WaiterTableSummary,
} from "@/lib/waiter-api";

import { StaffOrderBillSheet } from "@/views/staff/StaffOrderBillSheet";

const EMPTY_BOARD: WaiterShiftBoard = {
  approve: [],
  cooking: [],
  deliver: [],
  delivered: [],
};

type WaiterTab = "tables" | "reservations";
type TableLayout = "grid" | "list";

const shell = {
  page: "flex min-h-screen flex-col bg-background",
  header:
    "sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
  headerInner: "mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4",
  main: "mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28",
  bottomNav:
    "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90",
  bottomNavInner: "mx-auto grid max-w-6xl grid-cols-2 gap-1 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
  navBtn:
    "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors",
  navBtnActive: "bg-primary/10 text-primary",
  card: "space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm",
  cardEmphasis: "space-y-3 rounded-2xl border border-primary/35 bg-card p-4 shadow-sm ring-1 ring-primary/10",
  stepRow: "flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm",
  stepRowEmphasis:
    "flex items-center gap-3 rounded-2xl border border-primary/35 bg-primary/5 px-3 py-3 shadow-sm ring-1 ring-primary/10",
  orderCard: "rounded-xl border border-border bg-background/80 p-3",
  tableTile:
    "flex h-12 w-full items-center justify-center rounded-lg border px-1 text-[10px] font-semibold leading-tight shadow-sm transition-colors min-[400px]:h-14 min-[400px]:px-1.5 min-[400px]:text-[11px] sm:h-16 sm:px-2 sm:text-xs md:h-[4.5rem] md:rounded-xl md:border-2 md:px-3 md:text-sm",
  tableTileUnpaid:
    "animate-pulse border-red-800/80 bg-red-500 text-white enabled:hover:bg-red-600",
  tableTilePaid: "border-emerald-800/50 bg-emerald-200 text-emerald-950 enabled:hover:bg-emerald-300",
  tableTileIdle: "border-border bg-muted/40 text-foreground enabled:hover:bg-muted/70",
  areaBadge:
    "shrink-0 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
  areaBadgeActive: "border-primary bg-primary text-primary-foreground shadow-sm",
  areaHeading: "text-sm font-semibold tracking-tight text-foreground",
} as const;

type TableAreaGroup = {
  key: string;
  name: string;
  tables: WaiterTableSummary[];
};

function tableAreaKey(table: WaiterTableSummary): string {
  return table.areaId != null ? String(table.areaId) : "none";
}

function groupTablesByArea(tables: WaiterTableSummary[]): TableAreaGroup[] {
  const groups = new Map<string, TableAreaGroup>();
  for (const table of tables) {
    const key = tableAreaKey(table);
    const existing = groups.get(key);
    if (existing) {
      existing.tables.push(table);
      continue;
    }
    groups.set(key, {
      key,
      name: table.areaName?.trim() || "Alan tanımsız",
      tables: [table],
    });
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
}

export function PersonelWaiterScreen({ me }: { me: WaiterMe }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<WaiterTab>("tables");
  const [tableLayout, setTableLayout] = useState<TableLayout>("grid");
  const [selectedAreaKey, setSelectedAreaKey] = useState<"all" | string>("all");
  const [billOrder, setBillOrder] = useState<OrderResponse | null>(null);
  const [servedNow, setServedNow] = useState<OrderResponse[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  const pendingQuery = useQuery({
    queryKey: ["staff-waiter-pending"],
    queryFn: listWaiterPendingOrders,
    refetchInterval: 6_000,
  });
  const readyQuery = useQuery({
    queryKey: ["staff-waiter-ready"],
    queryFn: listWaiterReadyOrders,
    refetchInterval: 6_000,
  });
  const todayQuery = useQuery({
    queryKey: ["staff-waiter-today"],
    queryFn: listWaiterTodayOrders,
    refetchInterval: 6_000,
  });
  const kitchenQuery = useQuery({
    queryKey: ["staff-kitchen-queue"],
    queryFn: async () => {
      try {
        return await listKitchenQueue();
      } catch {
        return [] as OrderResponse[];
      }
    },
    refetchInterval: 6_000,
  });
  const tablesQuery = useQuery({
    queryKey: ["staff-waiter-tables"],
    queryFn: listWaiterTables,
    refetchInterval: 6_000,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff-waiter-pending"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-waiter-ready"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-waiter-today"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-kitchen-queue"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-waiter-tables"] }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (payload: {
      orderId: number;
      kind: "confirm" | "reject" | "deliver";
      order?: OrderResponse;
    }) => {
      if (payload.kind === "confirm") return confirmWaiterOrder(payload.orderId);
      if (payload.kind === "reject") return rejectWaiterOrder(payload.orderId);
      return markWaiterOrderPickedFromKitchen(payload.orderId);
    },
    onSuccess: (updated, payload) => {
      if (payload.kind === "reject") {
        setDismissedIds((current) =>
          current.includes(payload.orderId) ? current : [...current, payload.orderId],
        );
      }
      if (payload.kind === "deliver") {
        const ready = queryClient.getQueryData<OrderResponse[]>(["staff-waiter-ready"]) ?? [];
        const previous = payload.order ?? ready.find((order) => order.id === payload.orderId);
        const carried = rememberWaiterDelivery(previous, updated, payload.orderId);
        setServedNow((current) => [carried, ...current.filter((order) => order.id !== carried.id)]);
      }
      void refresh();
    },
  });

  const board = useMemo(() => {
    const branchId = me.branchId;
    return groupWaiterShift({
      pending: ordersForStaffBranch(pendingQuery.data ?? [], branchId),
      ready: ordersForStaffBranch(readyQuery.data ?? [], branchId),
      kitchen: ordersForStaffBranch(kitchenQuery.data ?? [], branchId),
      today: ordersForStaffBranch(todayQuery.data ?? [], branchId),
      servedNow,
      dismissedIds,
    });
  }, [
    dismissedIds,
    kitchenQuery.data,
    me.branchId,
    pendingQuery.data,
    readyQuery.data,
    servedNow,
    todayQuery.data,
  ]);

  const awaitingPaymentIds = useMemo(
    () => tableIdsAwaitingPayment(tablesQuery.data ?? []),
    [tablesQuery.data],
  );

  const branchTables = useMemo(() => {
    const rows = tablesQuery.data ?? [];
    return [...rows].sort((a, b) => {
      const areaCmp = (a.areaName ?? "").localeCompare(b.areaName ?? "", "tr-TR");
      if (areaCmp !== 0) return areaCmp;
      const an = a.tableNumber ?? 0;
      const bn = b.tableNumber ?? 0;
      if (an !== bn) return an - bn;
      return (a.tableName ?? "").localeCompare(b.tableName ?? "", "tr-TR");
    });
  }, [tablesQuery.data]);

  const tableAreaFilters = useMemo(() => groupTablesByArea(branchTables), [branchTables]);

  const visibleTableGroups = useMemo(() => {
    if (selectedAreaKey === "all") return tableAreaFilters;
    const match = tableAreaFilters.find((group) => group.key === selectedAreaKey);
    return match ? [match] : [];
  }, [selectedAreaKey, tableAreaFilters]);

  const error =
    (pendingQuery.error instanceof WaiterApiError && pendingQuery.error.message) ||
    (readyQuery.error instanceof WaiterApiError && readyQuery.error.message) ||
    (todayQuery.error instanceof WaiterApiError && todayQuery.error.message) ||
    (action.error instanceof Error ? action.error.message : null);
  const busyOrderId = action.isPending ? action.variables?.orderId ?? null : null;

  const signOut = async () => {
    await waiterLogout();
    router.replace("/personel");
    router.refresh();
  };

  const openBillForTable = (table: WaiterTableSummary) => {
    setBillOrder(orderFromTable(table));
  };

  const processBoard = useMemo(
    () => filterWaiterShiftBoard(board, billOrder?.tableId),
    [board, billOrder?.tableId],
  );

  const processPanel =
    billOrder != null ? (
      <WaiterProcessPanel
        board={processBoard}
        error={error}
        pendingLoading={pendingQuery.isLoading}
        kitchenLoading={(kitchenQuery.isLoading || todayQuery.isLoading) && processBoard.cooking.length === 0}
        readyLoading={readyQuery.isLoading}
        busyOrderId={busyOrderId}
        confirmKind={action.variables?.kind === "confirm" ? action.variables.orderId : null}
        onConfirm={(order) => action.mutate({ orderId: order.id, kind: "confirm", order })}
        onReject={(order) => action.mutate({ orderId: order.id, kind: "reject", order })}
        onDeliver={(order) => action.mutate({ orderId: order.id, kind: "deliver", order })}
      />
    ) : null;

  return (
    <div className={shell.page}>
      <header className={shell.header}>
        <div className={shell.headerInner}>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => setTab("tables")}
          >
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.displayName?.trim() || "Personel"}</p>
              <p className="text-xs text-muted-foreground">
                {STAFF_ROLE_LABEL.WAITER} · Şube {formatBranchCode(me.branchId)}
              </p>
            </div>
          </button>
          <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className={shell.main}>
        {tab === "tables" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Masalar</h1>
                <p className="text-sm text-muted-foreground">Salon masaları · kırmızı ödeme bekliyor</p>
              </div>
              <div className="flex rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  aria-pressed={tableLayout === "grid"}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                    tableLayout === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setTableLayout("grid")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kare
                </button>
                <button
                  type="button"
                  aria-pressed={tableLayout === "list"}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                    tableLayout === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setTableLayout("list")}
                >
                  <List className="h-3.5 w-3.5" />
                  Liste
                </button>
              </div>
            </div>

            {tableAreaFilters.length > 0 ? (
              <div
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Alan filtresi"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedAreaKey === "all"}
                  className={`${shell.areaBadge} ${selectedAreaKey === "all" ? shell.areaBadgeActive : "hover:bg-muted/60"}`}
                  onClick={() => setSelectedAreaKey("all")}
                >
                  Tümü
                  <span className="ml-1.5 tabular-nums opacity-80">{branchTables.length}</span>
                </button>
                {tableAreaFilters.map((area) => (
                  <button
                    key={area.key}
                    type="button"
                    role="tab"
                    aria-selected={selectedAreaKey === area.key}
                    className={`${shell.areaBadge} ${
                      selectedAreaKey === area.key ? shell.areaBadgeActive : "hover:bg-muted/60"
                    }`}
                    onClick={() => setSelectedAreaKey(area.key)}
                  >
                    {area.name}
                    <span className="ml-1.5 tabular-nums opacity-80">{area.tables.length}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {tablesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Masalar yükleniyor…</p>
            ) : branchTables.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu şubede tanımlı masa yok.</p>
            ) : visibleTableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu alanda masa yok.</p>
            ) : (
              <div className="space-y-6">
                {visibleTableGroups.map((area) => (
                  <section key={area.key} className="space-y-3">
                    <h2 className={shell.areaHeading}>{area.name}</h2>
                    {tableLayout === "grid" ? (
                      <ul className="grid grid-cols-3 gap-1.5 min-[400px]:grid-cols-4 min-[400px]:gap-2 sm:gap-2.5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-4 xl:gap-3">
                        {area.tables.map((table) => (
                          <li key={table.tableId}>
                            <button
                              type="button"
                              className={tableTileClass(table, awaitingPaymentIds)}
                              onClick={() => openBillForTable(table)}
                            >
                              <span className="truncate">
                                {table.tableName || `Masa ${table.tableNumber ?? table.tableId}`}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="space-y-2">
                        {area.tables.map((table) => (
                          <li key={table.tableId}>
                            <button
                              type="button"
                              className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40 ${
                                awaitingPaymentIds.has(table.tableId) ? "border-red-300/80 bg-red-50/80" : ""
                              }`}
                              onClick={() => openBillForTable(table)}
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                  awaitingPaymentIds.has(table.tableId)
                                    ? "animate-pulse bg-red-500 text-white"
                                    : table.billStatus === "OPEN"
                                      ? "bg-amber-200 text-amber-950"
                                      : "bg-muted text-foreground"
                                }`}
                              >
                                {table.tableNumber ?? "·"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                  {table.tableName || `Masa ${table.tableNumber ?? table.tableId}`}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{tableStatusLabel(table)}</p>
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {table.pendingOrderCount + (table.readyOrderCount ?? 0) > 0
                                  ? `${table.pendingOrderCount + (table.readyOrderCount ?? 0)} sipariş`
                                  : table.openBillTotal != null
                                    ? `${table.openBillTotal} ₺`
                                    : ""}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "reservations" ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Rezervasyonlar</h1>
            <p className="max-w-sm text-sm text-muted-foreground">Rezervasyon listesi yakında burada olacak.</p>
          </div>
        ) : null}
      </main>

      <nav className={shell.bottomNav} aria-label="Garson menüsü">
        <div className={shell.bottomNavInner}>
          <button
            type="button"
            className={`${shell.navBtn} ${tab === "tables" ? shell.navBtnActive : ""}`}
            onClick={() => setTab("tables")}
          >
            <UtensilsCrossed className="h-5 w-5" />
            Masalar
          </button>
          <button
            type="button"
            className={`${shell.navBtn} ${tab === "reservations" ? shell.navBtnActive : ""}`}
            onClick={() => setTab("reservations")}
          >
            <CalendarDays className="h-5 w-5" />
            Rezervasyonlar
          </button>
        </div>
      </nav>

      <StaffOrderBillSheet
        order={billOrder}
        open={billOrder != null}
        processPanel={processPanel}
        onOpenChange={(next) => {
          if (!next) setBillOrder(null);
        }}
        onBillUpdated={() => void refresh()}
      />
    </div>
  );
}

function WaiterProcessPanel({
  board,
  error,
  pendingLoading,
  kitchenLoading,
  readyLoading,
  busyOrderId,
  confirmKind,
  onConfirm,
  onReject,
  onDeliver,
}: {
  board: WaiterShiftBoard;
  error: string | null;
  pendingLoading: boolean;
  kitchenLoading: boolean;
  readyLoading: boolean;
  busyOrderId: number | null;
  confirmKind: number | null | undefined;
  onConfirm: (order: OrderResponse) => void;
  onReject: (order: OrderResponse) => void;
  onDeliver: (order: OrderResponse) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Bu masanın siparişleri hangi aşamada — onay, mutfak, teslim.
      </p>
      <ol className="grid gap-2">
        <FlowStep step="1" title="Onayla" detail="Yeni siparişi kabul et" count={board.approve.length} compact />
        <FlowStep step="2" title="Mutfak" detail="Hazırlanıyor" count={board.cooking.length} compact />
        <FlowStep
          step="3"
          title="Masaya götür"
          detail="Hazır bekliyor"
          count={board.deliver.length}
          emphasis
          compact
        />
        <FlowStep step="4" title="Teslim edildi" detail="Müşteriye bırakıldı" count={board.delivered.length} compact />
      </ol>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-3">
        <OrderLane
          compact
          title="Onayla"
          empty="Bu masada onay bekleyen sipariş yok."
          orders={board.approve}
          loading={pendingLoading}
          renderActions={(order) => (
            <>
              <Button size="sm" disabled={busyOrderId === order.id} onClick={() => onConfirm(order)}>
                {busyOrderId === order.id && confirmKind === order.id ? "Onaylanıyor…" : "Onayla"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyOrderId === order.id}
                onClick={() => onReject(order)}
              >
                Reddet
              </Button>
            </>
          )}
        />
        <OrderLane
          compact
          title="Mutfakta"
          empty="Bu masada mutfakta sipariş yok."
          orders={board.cooking}
          loading={kitchenLoading}
          renderMeta={(order) => (
            <p className="text-xs text-muted-foreground">{cookingStatusLabel(order.status)}</p>
          )}
          renderActions={() => null}
        />
        <OrderLane
          compact
          title="Masaya götür"
          empty="Bu masada hazır sipariş yok."
          orders={board.deliver}
          loading={readyLoading}
          emphasis
          renderMeta={(order) => {
            const elapsed = formatKitchenElapsed(order.readyAt || order.submittedAt || order.createdAt);
            return elapsed ? (
              <p className="text-xs font-medium text-amber-700">{elapsed} hazır bekliyor</p>
            ) : null;
          }}
          renderActions={(order) => (
            <Button size="sm" disabled={busyOrderId === order.id} onClick={() => onDeliver(order)}>
              {busyOrderId === order.id ? "Teslim ediliyor…" : "Müşteriye teslim ettim"}
            </Button>
          )}
        />
        <OrderLane
          compact
          title="Teslim edildi"
          empty="Bugün teslim edilmiş sipariş yok."
          orders={board.delivered}
          loading={false}
          renderActions={() => null}
        />
      </div>
    </div>
  );
}

function FlowStep({
  step,
  title,
  detail,
  count,
  emphasis = false,
  compact = false,
}: {
  step: string;
  title: string;
  detail: string;
  count: number;
  emphasis?: boolean;
  compact?: boolean;
}) {
  return (
    <li className={emphasis ? shell.stepRowEmphasis : shell.stepRow}>
      <span
        className={
          emphasis
            ? `flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ${
                compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
              }`
            : `flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold ${
                compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
              }`
        }
      >
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <p className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className={`font-semibold tabular-nums ${compact ? "text-base" : "text-lg"}`}>{count}</span>
    </li>
  );
}

function OrderLane({
  title,
  empty,
  orders,
  loading,
  emphasis = false,
  compact = false,
  onOpenBill,
  renderActions,
  renderMeta,
}: {
  title: string;
  empty: string;
  orders: OrderResponse[];
  loading: boolean;
  emphasis?: boolean;
  compact?: boolean;
  onOpenBill?: (order: OrderResponse) => void;
  renderActions: (order: OrderResponse) => ReactNode;
  renderMeta?: (order: OrderResponse) => ReactNode;
}) {
  return (
    <section
      className={
        compact
          ? emphasis
            ? "space-y-2 rounded-xl border border-primary/35 bg-card p-3 ring-1 ring-primary/10"
            : "space-y-2 rounded-xl border border-border bg-card p-3"
          : emphasis
            ? shell.cardEmphasis
            : shell.card
      }
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{orders.length}</span>
      </div>
      {loading && orders.length === 0 ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : null}
      {!loading && orders.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.id} className={shell.orderCard}>
            <p className="text-sm font-semibold">{orderLocationLabel(order)}</p>
            <p className="text-xs text-muted-foreground">#{order.orderNumber || order.id}</p>
            {renderMeta?.(order)}
            <OrderItems order={order} />
            <div className="mt-3 flex flex-wrap gap-2">
              {renderActions(order)}
              {onOpenBill && order.tableId != null ? (
                <Button size="sm" variant="secondary" onClick={() => onOpenBill(order)}>
                  Adisyon
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderItems({ order }: { order: OrderResponse }) {
  const items = order.items ?? [];
  if (items.length === 0 && !order.kitchenNote && !order.note) return null;
  const visible = items.slice(0, 4);
  const rest = items.length - visible.length;
  return (
    <div className="mt-2 space-y-1">
      {visible.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {visible.map((item, index) => (
            <li key={`${order.id}-${item.productId}-${index}`}>
              {item.quantity}× {item.productName || "Ürün"}
            </li>
          ))}
          {rest > 0 ? <li>+{rest} ürün</li> : null}
        </ul>
      ) : null}
      {order.kitchenNote?.trim() || order.note?.trim() ? (
        <p className="text-xs text-amber-800">{order.kitchenNote?.trim() || order.note?.trim()}</p>
      ) : null}
    </div>
  );
}

function tableTileClass(table: WaiterTableSummary, awaitingPaymentIds: ReadonlySet<number>): string {
  if (awaitingPaymentIds.has(table.tableId)) {
    return `${shell.tableTile} ${shell.tableTileUnpaid}`;
  }
  const busy =
    (table.pendingOrderCount ?? 0) > 0 ||
    (table.readyOrderCount ?? 0) > 0 ||
    (table.kitchenOrderCount ?? 0) > 0;
  if (busy) {
    return `${shell.tableTile} ${shell.tableTileIdle}`;
  }
  return `${shell.tableTile} ${shell.tableTilePaid}`;
}

function tableStatusLabel(table: WaiterTableSummary): string {
  if (table.billStatus === "OPEN") return "Açık adisyon";
  if ((table.pendingOrderCount ?? 0) > 0) return "Onay bekliyor";
  if ((table.readyOrderCount ?? 0) > 0) return "Hazır sipariş var";
  return "Boş";
}

function orderFromTable(table: WaiterTableSummary): OrderResponse {
  return {
    id: table.latestPendingOrderId ?? table.openBillId ?? table.tableId,
    status: "SERVED",
    tableId: table.tableId,
    tableName: table.tableName ?? null,
    billId: table.openBillId ?? null,
  };
}

function cookingStatusLabel(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "PREPARING") return "Hazırlanıyor";
  if (normalized === "CONFIRMED") return "Onaylandı";
  if (normalized === "SUBMITTED") return "Mutfağa iletildi";
  return status;
}
