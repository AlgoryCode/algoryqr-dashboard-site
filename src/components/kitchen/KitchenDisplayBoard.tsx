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
  badge: string;
};

const COLUMN_TONE: Record<KitchenColumnId, ColumnTone> = {
  CONFIRMED: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  PREPARING: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  READY: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  SERVED: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
};

const ORIGIN_BADGE_CLASS: Record<KitchenOrderOrigin, string> = {
  YEMEKSEPETI: "bg-amber-50 text-amber-800 border-amber-200/60",
  UBER_EATS: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  ONLINE: "bg-emerald-50/80 text-emerald-700 border-emerald-100",
  PHONE: "bg-amber-50 text-amber-800 border-amber-200/70",
  TABLE: "bg-slate-100 text-slate-700 border-slate-200/60",
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
      <div className="flex justify-center py-16 text-slate-400">
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
      <div className="flex flex-col gap-4">
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {columns.map((column) => {
          const columnOrders = grouped[column.id];
          return (
            <section key={column.id} className="flex min-h-[8rem] flex-col gap-3">
              <header className="flex items-center justify-between border-b border-slate-200 pb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", COLUMN_TONE[column.id].dot)} />
                  <h2 className="text-sm font-semibold text-slate-900">
                    {kitchenColumnTitle(column.id, mode)}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {columnOrders.length} ürün
                </span>
              </header>
              {columnOrders.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-400">Bu grupta sipariş yok.</p>
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
    <div className={cn("flex flex-col gap-4", fillHeight && "min-h-0 flex-1 overflow-hidden")}>
      {error ? <p className="px-1 text-sm text-red-500">{error}</p> : null}

      {/* Top Filter & Metrics Section */}
      <section className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
        <div className={cn("flex items-center justify-between gap-2 overflow-x-auto pb-2 text-xs", HIDE_SCROLLBAR)}>
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
              dotClassName="bg-emerald-500"
            />
            <MetricChip
              delayed={delayedOrders.length > 0}
              label="Gecikme Uyarısı"
              value={String(delayedOrders.length)}
            />
            <MetricChip
              label="Ort. SLA"
              value={avgWait == null ? "—" : `${avgWait} dk`}
              valueClassName="text-emerald-600"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Otomatik Senkron (6s)</span>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sipariş no, müşteri adı veya masa ile filtrele..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-slate-400 focus:outline-none focus:ring-0"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-400">
              Ctrl K
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDelayedOnly((value) => !value)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors",
                delayedOnly
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Filtreler
            </button>
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all",
                  view === "board" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Pano
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all",
                  view === "list" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <List className="h-3.5 w-3.5" />
                Liste
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Board / List Content */}
      {view === "list" ? (
        <div className={cn("flex flex-col gap-3", fillHeight && "min-h-0 flex-1 overflow-y-auto")}>
          {visibleOrders.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-400">Eşleşen sipariş yok.</p>
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
            "flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-2",
            HIDE_SCROLLBAR,
            fillHeight && "min-h-0 flex-1",
          )}
        >
          {columns.map((column) => {
            const columnOrders = grouped[column.id];
            return (
              <section
                key={column.id}
                className={cn(
                  "flex w-[330px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 lg:min-h-[28rem] lg:flex-1 lg:basis-0",
                  fillHeight && "max-h-full min-h-0",
                )}
              >
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {kitchenKanbanColumnTitle(column.id)}
                  </h3>
                  <span className="text-xs text-slate-500">
                    <strong className="font-semibold text-slate-800">{columnOrders.length}</strong> ürün
                  </span>
                </div>
                <div className={cn("flex flex-col gap-3", fillHeight && "min-h-0 flex-1 overflow-y-auto")}>
                  {columnOrders.length === 0 ? (
                    <p className="py-12 text-center text-xs text-slate-400">Bu grupta sipariş yok.</p>
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
        "flex shrink-0 items-center gap-1.5 rounded-xl border bg-white px-3 py-1 text-xs",
        delayed ? "border-red-200 text-red-600" : "border-slate-200/60 text-slate-600",
      )}
    >
      {delayed ? (
        <span className="h-2 w-2 rounded-full bg-red-500" />
      ) : dotClassName ? (
        <span className={cn("h-2 w-2 rounded-full", dotClassName)} />
      ) : null}
      <span className="text-slate-500">{label}:</span>
      <span className={cn("font-semibold text-slate-800", valueClassName)}>{value}</span>
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

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{kitchenTableLabel(order)}</h4>
          <span className="text-xs text-slate-400 font-mono">{orderTicketNo(order)} · f</span>
        </div>
        {columnId === "SERVED" ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Teslim edildi
          </span>
        ) : delayed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-3 w-3" /> SLA Riski
          </span>
        ) : (
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium",
              ORIGIN_BADGE_CLASS[origin],
            )}
          >
            {originLabel}
          </span>
        )}
      </div>

      {/* Sub Info & Location */}
      <div
        className={cn("flex items-center gap-1.5 text-xs text-slate-500", onSelectOrder && "cursor-pointer")}
        onClick={onSelectOrder ? () => onSelectOrder(order.id) : undefined}
      >
        {columnId === "SERVED" ? (
          <CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : origin === "TABLE" ? (
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <span className="truncate">
          {columnId === "SERVED"
            ? `${formatWhen(order.servedAt)}'de teslim edildi${order.waiterName ? ` • ${order.waiterName}` : ""}`
            : origin === "TABLE"
              ? locationLine(order)
              : [locationLine(order), order.customerPhone?.trim()]
                  .filter((part, index, parts) => part && parts.indexOf(part) === index)
                  .join(" · ")}
        </span>
      </div>

      {/* Preparation Progress Bar */}
      {prep ? (
        <div className="rounded-xl bg-slate-50 p-2.5 text-xs">
          <div className="mb-1 flex items-center justify-between font-medium text-slate-700">
            <span>Mutfak İlerlemesi</span>
            <span className="text-slate-500">%{prep.percent} · {prep.remainingMinutes} dk kaldı</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${prep.percent}%` }} />
          </div>
        </div>
      ) : null}

      {/* Product List Section */}
      <KitchenOrderItemList order={order} />

      {/* Customer / Waiter / Kitchen Notes */}
      {order.note ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong className="font-semibold text-slate-700">Müşteri:</strong> {order.note}
        </p>
      ) : null}
      {order.waiterNote ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong className="font-semibold text-slate-700">Garson:</strong> {order.waiterNote}
        </p>
      ) : null}

      {canEditNote ? (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-500" htmlFor={`kitchen-note-${kitchenOrderKey(order)}`}>
            Mutfak notu
          </label>
          <div className="flex gap-1.5">
            <Input
              id={`kitchen-note-${kitchenOrderKey(order)}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Not ekle…"
              className="h-8 rounded-xl border-slate-200 bg-white text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              disabled={busy}
              onClick={() => onSaveKitchenNote?.(order.id, note)}
            >
              Kaydet
            </Button>
          </div>
        </div>
      ) : order.kitchenNote ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <strong className="font-semibold text-slate-700">Mutfak:</strong> {order.kitchenNote}
        </p>
      ) : null}

      {/* Card Footer Actions & Status Footer */}
      {columnId === "PREPARING" ? (
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            {origin === "TABLE" ? kitchenTableLabel(order) : `Paket: ${orderTicketNo(order)}`}
          </span>
          {onMarkReady ? (
            <KanbanAction busy={busy} tone="emerald" onClick={() => onMarkReady(order.id, order.orderSource)}>
              Paket Hazır
            </KanbanAction>
          ) : null}
        </div>
      ) : columnId === "READY" ? (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            {kitchenReadyHandoverLabel(origin, order.deliveryType)}
          </span>
          {isWaiter && onMarkServed && !usesCourier ? (
            <KanbanAction busy={busy} tone="emerald" onClick={() => onMarkServed(order.id)}>
              Teslim Et
            </KanbanAction>
          ) : null}
        </div>
      ) : columnId === "SERVED" ? (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
          <span>{formatWhen(order.createdAt)}</span>
          {onSelectOrder ? (
            <button
              type="button"
              onClick={() => onSelectOrder(order.id)}
              className="text-xs font-medium text-slate-600 hover:underline"
            >
              Detay Gör
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Timer className="h-3 w-3" />
            {delayed ? "SLA aşıldı" : `${Math.max(1, KITCHEN_KANBAN_SLA_MINUTES - (minutes ?? 0))} dk kaldı`}
          </span>
          {onStartPreparing && !skipsPreparing ? (
            <KanbanAction busy={busy} tone="emerald" onClick={() => onStartPreparing(order.id, order.orderSource)}>
              Hazırla
              <ArrowRight className="h-3 w-3" />
            </KanbanAction>
          ) : skipsPreparing && onMarkReady ? (
            <KanbanAction busy={busy} tone="emerald" onClick={() => onMarkReady(order.id, order.orderSource)}>
              Paket Hazır
            </KanbanAction>
          ) : isWaiter && order.status === "CONFIRMED" ? (
            <span className="text-[11px] font-medium text-slate-400">Mutfak bekleniyor</span>
          ) : null}
        </div>
      )}
    </article>
  );
}

function KitchenOrderItemList({ order }: { order: OrderResponse }) {
  const items = order.items ?? [];
  return (
    <div className="flex flex-col gap-2 pt-1">
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">Ürün yok</p>
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
                className="text-xs text-slate-700 leading-normal"
              >
                <span className="font-semibold text-slate-900">{item.quantity}×</span>{" "}
                <span className="font-medium text-slate-800">{item.productName || `#${item.productId}`}</span>
                {options ? (
                  <span className="block text-[11px] text-slate-400 font-normal">{options}</span>
                ) : null}
                {item.note ? (
                  <span className="block text-[11px] text-slate-400 font-normal">Not: {item.note}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100/80">
        <span className="rounded-full bg-emerald-50/80 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          {kitchenOrderOriginLabel(kitchenOrderOrigin(order))}
        </span>
        <span className="font-semibold text-slate-900">
          {formatMenuPrice(order.totalAmount ?? undefined, order.currency || "TRY")}
        </span>
      </div>
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
        "flex h-7 items-center gap-1 rounded-xl px-3 text-xs font-medium text-white transition-all disabled:opacity-50",
        tone === "emerald" ? "bg-slate-900 hover:bg-slate-800" : "bg-amber-500 hover:bg-amber-600",
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}