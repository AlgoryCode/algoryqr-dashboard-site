"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Search,
  Timer,
  UtensilsCrossed,
} from "lucide-react";

import { formatMenuPrice } from "@/components/menu-templates/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  groupKitchenOrders,
  isKitchenTicketDelayed,
  kitchenAllowsNote,
  kitchenColumnTitle,
  kitchenElapsedMinutes,
  kitchenKanbanColumnTitle,
  kitchenOrderKey,
  kitchenOrderOrigin,
  kitchenOrderOriginLabel,
  kitchenPrepProgress,
  kitchenReadyHandoverLabel,
  kitchenSkipsPreparing,
  kitchenTableLabel,
  kitchenTicketElapsedLabel,
  kitchenUsesCourier,
  KITCHEN_COLUMNS,
  KITCHEN_KANBAN_SLA_MINUTES,
  matchesKitchenKanbanQuery,
  type KitchenBoardMode,
  type KitchenColumnId,
  type KitchenOrderOrigin,
} from "@/lib/kitchen-queue";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

export type { KitchenBoardMode };

type KitchenDisplayBoardProps = {
  orders: OrderResponse[];
  loading?: boolean;
  error?: string | null;
  mode: KitchenBoardMode;
  busyOrderId?: number | null;
  busyOrderKey?: string | null;
  onStartPreparing?: (orderId: number, orderSource?: string | null) => void;
  onMarkReady?: (orderId: number, orderSource?: string | null) => void;
  onMarkServed?: (orderId: number) => void;
  onSaveKitchenNote?: (orderId: number, note: string) => void;
  onSelectOrder?: (orderId: number) => void;
};

const HIDE_SCROLLBAR =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type ColumnTone = {
  dot: string;
  count: string;
};

const COLUMN_TONE: Record<KitchenColumnId, ColumnTone> = {
  CONFIRMED: { dot: "bg-amber-500", count: "bg-amber-500 text-white" },
  PREPARING: { dot: "bg-amber-500", count: "bg-amber-500 text-white" },
  READY: { dot: "bg-emerald-600", count: "bg-emerald-600 text-white" },
  SERVED: { dot: "bg-emerald-600", count: "bg-emerald-600 text-white" },
};

const ORIGIN_BADGE_CLASS: Record<KitchenOrderOrigin, string> = {
  YEMEKSEPETI: "bg-amber-200 text-black",
  UBER_EATS: "bg-emerald-100 text-emerald-900",
  ONLINE: "bg-blue-100 text-blue-800",
  TABLE: "bg-slate-100 text-black",
};

function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function orderTicketNo(order: OrderResponse): string {
  const reference = order.orderNumber?.trim() || order.externalOrderId?.trim();
  return `#${reference || order.id}`;
}

function orderItemSummary(order: OrderResponse): string {
  const items = order.items ?? [];
  if (items.length === 0) return "Ürün yok";
  return items
    .map((item) => `${item.quantity}x ${item.productName || `#${item.productId}`}`)
    .join(", ");
}

function useTickingNow(intervalMs = 15_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

function locationLine(order: OrderResponse): string {
  const origin = kitchenOrderOrigin(order);
  if (origin === "TABLE") return kitchenTableLabel(order);
  const address = order.deliveryAddress?.trim();
  if (address) return address;
  const phone = order.customerPhone?.trim();
  if (phone) return phone;
  return kitchenOrderOriginLabel(origin);
}

export function KitchenDisplayBoard({
  orders,
  loading,
  error,
  mode,
  busyOrderId,
  busyOrderKey,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
  onSaveKitchenNote,
  onSelectOrder,
}: KitchenDisplayBoardProps) {
  const isWaiter = mode === "waiter";
  const isKitchen = mode === "kitchen";
  const columns = isWaiter ? KITCHEN_COLUMNS.filter((column) => column.id !== "SERVED") : KITCHEN_COLUMNS;
  const fillHeight = isKitchen;
  const now = useTickingNow(10_000) ?? Date.now();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isWaiter) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isWaiter]);

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!matchesKitchenKanbanQuery(order, query)) return false;
      if (delayedOnly && !isKitchenTicketDelayed(order, now)) return false;
      return true;
    });
  }, [orders, query, delayedOnly, now]);

  const grouped = useMemo(() => groupKitchenOrders(visibleOrders), [visibleOrders]);
  const delayedOrders = useMemo(
    () => visibleOrders.filter((order) => isKitchenTicketDelayed(order, now)),
    [visibleOrders, now],
  );
  const waitMinutes = useMemo(
    () =>
      visibleOrders
        .map((order) => kitchenElapsedMinutes(order, now))
        .filter((value): value is number => value != null),
    [visibleOrders, now],
  );
  const avgWait = waitMinutes.length
    ? Math.round((waitMinutes.reduce((sum, value) => sum + value, 0) / waitMinutes.length) * 10) / 10
    : null;
  const activeCount = grouped.CONFIRMED.length + grouped.PREPARING.length + grouped.READY.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const cardProps = {
    mode,
    now,
    busyOrderId,
    busyOrderKey,
    onStartPreparing,
    onMarkReady,
    onMarkServed,
    onSaveKitchenNote,
    onSelectOrder,
  };

  if (isWaiter) {
    return (
      <div className="flex flex-col gap-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {columns.map((column) => {
          const columnOrders = grouped[column.id];
          return (
            <section key={column.id} className="flex min-h-[8rem] flex-col gap-3">
              <header className="flex items-center justify-between border-b-2 border-black pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-full border border-black", COLUMN_TONE[column.id].dot)} />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                    {kitchenColumnTitle(column.id, mode)}
                  </h2>
                </div>
                <span
                  className={cn(
                    "rounded-md border border-black px-2 py-0.5 text-xs font-extrabold shadow-[1px_1px_0px_#000]",
                    COLUMN_TONE[column.id].count,
                  )}
                >
                  {columnOrders.length}
                </span>
              </header>
              {columnOrders.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm font-medium text-slate-400">Boş</p>
              ) : (
                columnOrders.map((order) => (
                  <KitchenOrderCard key={kitchenOrderKey(order)} order={order} columnId={column.id} {...cardProps} />
                ))
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", fillHeight && "min-h-0 flex-1 overflow-hidden")}>
      {error ? <p className="px-1 pb-2 text-sm text-destructive">{error}</p> : null}

      <section className="shrink-0 border-b border-black/10 bg-[#f2f3ff]/60 px-1 py-2.5">
        <div className={cn("flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs", HIDE_SCROLLBAR)}>
          <div className="flex shrink-0 items-center gap-2">
            <MetricChip label="Aktif Sipariş" value={String(activeCount)} />
            <MetricChip
              label="Hazırlanan"
              value={String(grouped.PREPARING.length)}
              dotClassName="bg-amber-500"
            />
            <MetricChip
              label="Hazır bekleyen"
              value={String(grouped.READY.length)}
              dotClassName="bg-emerald-600"
            />
            <MetricChip
              delayed={delayedOrders.length > 0}
              label="Gecikme Uyarısı"
              value={String(delayedOrders.length)}
            />
            <MetricChip
              label="Ort. SLA"
              value={avgWait == null ? "—" : `${avgWait} dk`}
              valueClassName="text-emerald-700"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#737688]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Otomatik Senkron (6s)</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737688]" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sipariş no, müşteri adı veya masa ile filtrele..."
              className="w-full rounded-lg border border-black/20 bg-white py-1.5 pl-8 pr-10 text-xs text-[#131b2e] placeholder:text-[#737688] transition-all focus:border-[#0045cc] focus:outline-none focus:ring-1 focus:ring-[#0045cc]"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-black/20 px-1 font-mono text-[10px] text-[#737688]">
              /
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDelayedOnly((value) => !value)}
              className={cn(
                "flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                delayedOnly
                  ? "border-red-600 bg-red-50 text-red-700"
                  : "border-black/20 bg-white text-[#131b2e] hover:bg-[#eaedff]",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Filtreler
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-black/20 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1",
                  view === "board" ? "bg-[#eaedff] font-semibold text-[#131b2e]" : "text-[#737688] hover:bg-[#f2f3ff]",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Pano
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1",
                  view === "list" ? "bg-[#eaedff] font-semibold text-[#131b2e]" : "text-[#737688] hover:bg-[#f2f3ff]",
                )}
              >
                <List className="h-3.5 w-3.5" />
                Liste
              </button>
            </div>
          </div>
        </div>
      </section>

      {view === "list" ? (
        <div className={cn("flex flex-col gap-3 py-3", fillHeight && "min-h-0 flex-1 overflow-y-auto")}>
          {visibleOrders.length === 0 ? (
            <p className="py-12 text-center text-sm font-medium text-slate-400">Eşleşen sipariş yok.</p>
          ) : (
            visibleOrders.map((order) => {
              const columnId =
                order.status === "PREPARING"
                  ? "PREPARING"
                  : order.status === "READY"
                    ? "READY"
                    : order.status === "SERVED" || order.status === "ON_THE_WAY"
                      ? "SERVED"
                      : "CONFIRMED";
              return (
                <KitchenOrderCard key={kitchenOrderKey(order)} order={order} columnId={columnId} {...cardProps} />
              );
            })
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex snap-x snap-mandatory items-start gap-4 overflow-x-auto py-3",
            HIDE_SCROLLBAR,
            fillHeight && "min-h-0 flex-1",
          )}
        >
          {columns.map((column) => {
            const columnOrders = grouped[column.id];
            const tone = COLUMN_TONE[column.id];
            return (
              <section
                key={column.id}
                className={cn(
                  "flex w-[320px] shrink-0 snap-start flex-col gap-3 rounded-xl border-2 border-black bg-[#f2f3ff] p-3 shadow-[3px_3px_0px_#000] lg:min-h-[28rem] lg:flex-1 lg:basis-0",
                  fillHeight && "max-h-full min-h-0",
                )}
              >
                <div className="flex items-center justify-between border-b-2 border-black px-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full border border-black", tone.dot)} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                      {kitchenKanbanColumnTitle(column.id)}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "rounded-md border border-black px-2 py-0.5 text-xs font-extrabold shadow-[1px_1px_0px_#000]",
                      tone.count,
                    )}
                  >
                    {columnOrders.length}
                  </span>
                </div>
                <div className={cn("flex flex-col gap-3", fillHeight && "min-h-0 flex-1 overflow-y-auto")}>
                  {columnOrders.length === 0 ? (
                    <p className="px-1 py-8 text-center text-sm font-medium text-slate-400">Boş</p>
                  ) : (
                    columnOrders.map((order) => (
                      <KitchenOrderCard key={kitchenOrderKey(order)} order={order} columnId={column.id} {...cardProps} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricChip({
  label,
  value,
  dotClassName,
  delayed,
  valueClassName,
}: {
  label: string;
  value: string;
  dotClassName?: string;
  delayed?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded border bg-white px-2.5 py-1",
        delayed ? "border-red-300 text-red-700" : "border-black/20",
      )}
    >
      {delayed ? (
        <span className="pulse-dot-red h-2 w-2 rounded-full bg-red-600" />
      ) : dotClassName ? (
        <span className={cn("h-2 w-2 rounded-full", dotClassName)} />
      ) : null}
      <span className={cn("font-medium", delayed ? "font-semibold text-red-700" : "text-[#737688]")}>{label}:</span>
      <span className={cn("font-bold", delayed ? "text-red-700" : "text-[#131b2e]", valueClassName)}>{value}</span>
    </div>
  );
}

function KitchenOrderCard({
  order,
  mode,
  columnId,
  now,
  busyOrderId,
  busyOrderKey,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
  onSaveKitchenNote,
  onSelectOrder,
}: {
  order: OrderResponse;
  mode: KitchenBoardMode;
  columnId: KitchenColumnId;
  now: number;
  busyOrderId?: number | null;
  busyOrderKey?: string | null;
  onStartPreparing?: (orderId: number, orderSource?: string | null) => void;
  onMarkReady?: (orderId: number, orderSource?: string | null) => void;
  onMarkServed?: (orderId: number) => void;
  onSaveKitchenNote?: (orderId: number, note: string) => void;
  onSelectOrder?: (orderId: number) => void;
}) {
  const [note, setNote] = useState(order.kitchenNote || "");
  const isWaiter = mode === "waiter";
  const origin = kitchenOrderOrigin(order);
  const originLabel = kitchenOrderOriginLabel(origin);
  const usesCourier = kitchenUsesCourier(origin, order.deliveryType);
  const skipsPreparing = kitchenSkipsPreparing(origin);
  const delayed = isKitchenTicketDelayed(order, now);
  const elapsed = kitchenTicketElapsedLabel(order, now);
  const minutes = kitchenElapsedMinutes(order, now);
  const busy = busyOrderKey ? busyOrderKey === kitchenOrderKey(order) : busyOrderId === order.id;
  const prep = columnId === "PREPARING" ? kitchenPrepProgress(order, now) : null;
  const canEditNote =
    Boolean(onSaveKitchenNote) &&
    kitchenAllowsNote(origin) &&
    (order.status === "CONFIRMED" || order.status === "PREPARING");

  useEffect(() => {
    setNote(order.kitchenNote || "");
  }, [order.kitchenNote, order.id]);

  const elapsedTone =
    delayed ? "font-bold text-red-600" : columnId === "CONFIRMED" || columnId === "PREPARING" ? "font-bold text-amber-700" : "font-bold text-[#434656]";

  return (
    <article className="flex flex-col gap-2.5 rounded-xl border-2 border-black bg-white p-3.5 shadow-[2px_2px_0px_#000] transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="rounded border border-black bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-black">
            {orderTicketNo(order)}
          </span>
          {columnId === "SERVED" && minutes != null ? (
            <span className="rounded border border-emerald-400 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
              • {minutes} dk SLA{minutes < KITCHEN_KANBAN_SLA_MINUTES ? " (Başarılı)" : ""}
            </span>
          ) : elapsed ? (
            <span className={cn("truncate text-[11px]", elapsedTone)}>• {elapsed} önce</span>
          ) : null}
        </div>
        {columnId === "SERVED" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : delayed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-black bg-amber-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
            <AlertTriangle className="h-3 w-3" /> SLA Riski
          </span>
        ) : (
          <span
            className={cn(
              "rounded-full border border-black px-2 py-0.5 text-[10px] font-bold",
              ORIGIN_BADGE_CLASS[origin],
            )}
          >
            {originLabel}
          </span>
        )}
      </div>

      <div
        className={cn(onSelectOrder && "cursor-pointer")}
        onClick={onSelectOrder ? () => onSelectOrder(order.id) : undefined}
      >
        <div className="text-sm font-bold text-black">{kitchenTableLabel(order)}</div>
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[#434656]">
          {columnId === "SERVED" ? (
            <CheckCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
          ) : origin === "TABLE" ? (
            <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-black" />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0 text-black" />
          )}
          <span className="truncate">
            {columnId === "SERVED"
              ? `${formatWhen(order.servedAt)}'de teslim edildi${order.waiterName ? ` • ${order.waiterName}` : ""}`
              : locationLine(order)}
          </span>
        </div>
      </div>

      {prep ? (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-2.5 text-xs">
          <div className="mb-1.5 flex items-center justify-between font-bold">
            <span className="text-amber-900">Mutfak İlerlemesi</span>
            <span className="rounded border border-amber-400 bg-white px-1.5 py-0.5 font-extrabold text-amber-800">
              %{prep.percent} • {prep.remainingMinutes} dk kaldı
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border border-black bg-slate-200">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${prep.percent}%` }} />
          </div>
        </div>
      ) : null}

      <KitchenOrderItemList order={order} />

      {order.note ? (
        <p className="rounded-md border border-black/20 bg-slate-50 px-2 py-1.5 text-xs font-medium text-black">
          Müşteri: {order.note}
        </p>
      ) : null}
      {order.waiterNote ? (
        <p className="rounded-md border border-black/20 bg-slate-50 px-2 py-1.5 text-xs font-medium text-black">
          Garson: {order.waiterNote}
        </p>
      ) : null}

      {canEditNote ? (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-black" htmlFor={`kitchen-note-${kitchenOrderKey(order)}`}>
            Mutfak notu
          </label>
          <div className="flex gap-1.5">
            <Input
              id={`kitchen-note-${kitchenOrderKey(order)}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Not…"
              className="h-8 border-2 border-black bg-white text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-2 border-black bg-white shadow-[1px_1px_0px_#000]"
              disabled={busy}
              onClick={() => onSaveKitchenNote?.(order.id, note)}
            >
              Kaydet
            </Button>
          </div>
        </div>
      ) : order.kitchenNote ? (
        <p className="rounded-md border border-black/20 bg-slate-50 px-2 py-1.5 text-xs font-medium text-black">
          Mutfak: {order.kitchenNote}
        </p>
      ) : null}

      {columnId === "PREPARING" ? (
        <div className="flex items-center justify-between border-t border-black/20 pt-2">
          <div className="rounded border border-black bg-slate-100 px-2 py-0.5 text-xs font-bold text-black">
            {origin === "TABLE" ? kitchenTableLabel(order) : `Paket: ${orderTicketNo(order)}`}
          </div>
          {onMarkReady ? (
            <KanbanAction busy={busy} tone="amber" onClick={() => onMarkReady(order.id, order.orderSource)}>
              Paket Hazır
            </KanbanAction>
          ) : null}
        </div>
      ) : columnId === "READY" ? (
        <div className="flex items-center justify-between gap-2 border-t border-black/20 pt-2">
          <span className="rounded border border-amber-500 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
            {kitchenReadyHandoverLabel(origin, order.deliveryType)}
          </span>
          {isWaiter && onMarkServed && !usesCourier ? (
            <KanbanAction busy={busy} tone="emerald" onClick={() => onMarkServed(order.id)}>
              Teslim
            </KanbanAction>
          ) : null}
        </div>
      ) : columnId === "SERVED" ? (
        <div className="flex items-center justify-end border-t border-black/20 pt-2">
          {onSelectOrder ? (
            <button
              type="button"
              onClick={() => onSelectOrder(order.id)}
              className="h-6 rounded border border-black bg-white px-2.5 text-xs font-bold text-black shadow-[1px_1px_0px_#000] hover:bg-slate-100"
            >
              Detay Gör
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <ClipboardList className="h-3.5 w-3.5" />
              Tamamlandı
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-black/20 pt-2">
          <span className="inline-flex items-center gap-1 rounded border border-amber-500 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            <Timer className="h-3 w-3" />
            {delayed ? "SLA aşıldı" : `Hazır: ${Math.max(1, KITCHEN_KANBAN_SLA_MINUTES - (minutes ?? 0))} dk`}
          </span>
          {onStartPreparing && !skipsPreparing ? (
            <KanbanAction busy={busy} tone="emerald" onClick={() => onStartPreparing(order.id, order.orderSource)}>
              Onayla
              <ArrowRight className="h-3 w-3" />
            </KanbanAction>
          ) : skipsPreparing && onMarkReady ? (
            <KanbanAction busy={busy} tone="amber" onClick={() => onMarkReady(order.id, order.orderSource)}>
              Paket Hazır
            </KanbanAction>
          ) : isWaiter && order.status === "CONFIRMED" ? (
            <span className="text-[11px] font-bold text-slate-600">Mutfak henüz başlamadı</span>
          ) : null}
        </div>
      )}
    </article>
  );
}

function KitchenOrderItemList({ order }: { order: OrderResponse }) {
  const items = order.items ?? [];
  return (
    <div className="flex flex-col gap-1.5 border-t-2 border-dashed border-black/30 pt-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-black">Sipariş detayı</span>
        <span className="shrink-0 rounded border border-emerald-600 bg-emerald-100 px-1.5 py-0.5 font-extrabold text-emerald-700">
          {formatMenuPrice(order.totalAmount ?? undefined, order.currency || "TRY")}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs font-medium text-[#434656]">Ürün yok</p>
      ) : (
        <ul className="space-y-1.5" aria-label={orderItemSummary(order)}>
          {items.map((item, index) => {
            const options = item.selectedOptions
              ?.map((option) => option.optionName)
              .filter(Boolean)
              .join(", ");
            return (
              <li
                key={`${order.id}-${item.id ?? item.productId}-${index}`}
                className="text-sm leading-snug text-black"
              >
                <span className="font-extrabold">{item.quantity}×</span>{" "}
                <span className="font-semibold">{item.productName || `#${item.productId}`}</span>
                {options ? (
                  <span className="mt-0.5 block text-xs font-medium text-[#434656]">{options}</span>
                ) : null}
                {item.note ? (
                  <span className="mt-0.5 block text-xs font-medium text-[#434656]">Not: {item.note}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function KanbanAction({
  busy,
  tone,
  onClick,
  children,
}: {
  busy: boolean;
  tone: "emerald" | "amber";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1 rounded-lg border-2 border-black px-3 text-xs font-bold text-white shadow-[1.5px_1.5px_0px_#000] transition-colors disabled:opacity-50",
        tone === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600",
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
