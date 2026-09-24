"use client";

import Link from "next/link";
import {
  BellRing,
  Bike,
  Check,
  ChefHat,
  Clock3,
  PersonStanding,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  courierChannelCounts,
  formatOrderWhenCompact,
  groupOpsLaneOrders,
  groupSalonByWaiter,
  isDeliveryOrder,
  managedOrderKey,
  orderAmount,
  orderChannel,
  ORDER_CHANNEL_LABEL,
  orderLocationLabel,
  orderStatusLabel,
  salonBoardOrders,
  tableStatusTone,
  type OpsLane,
  type OpsLaneSnapshot,
} from "@/lib/order-management";
import {
  kitchenElapsedMinutes,
  isKitchenTicketDelayed,
  KITCHEN_KANBAN_SLA_MINUTES,
} from "@/lib/kitchen-queue";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

type OrderOpsTrackerProps = {
  orders: OrderResponse[];
  snapshots: Record<OpsLane, OpsLaneSnapshot>;
  kitchenEnabled: boolean;
  delayedKeys?: Set<string>;
  detailHref: (lane: OpsLane) => string;
  onSelect: (order: OrderResponse) => void;
};

const TONE_BORDER: Record<ReturnType<typeof tableStatusTone>, string> = {
  occupied: "border-l-primary",
  serving: "border-l-emerald-500",
  waiting: "border-l-sky-500",
  delayed: "border-l-rose-500",
  empty: "border-l-slate-300",
};

const TONE_BADGE: Record<ReturnType<typeof tableStatusTone>, string> = {
  occupied: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
  serving: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  waiting: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  delayed: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  empty: "bg-muted text-muted-foreground",
};

function SalonColumn({
  orders,
  kitchenEnabled,
  delayedKeys,
  detailHref,
  onSelect,
}: {
  orders: OrderResponse[];
  kitchenEnabled: boolean;
  delayedKeys?: Set<string>;
  detailHref: string;
  onSelect: (order: OrderResponse) => void;
}) {
  const boardOrders = salonBoardOrders(orders, kitchenEnabled);
  const groups = groupSalonByWaiter(boardOrders);
  const matrixOrders = boardOrders.slice(0, 12);

  return (
    <div className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Salon &amp; Masa Akışı</h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              {kitchenEnabled
                ? "Hazır siparişler ve garson görevleri"
                : "Mutfak kapalı — siparişler doğrudan garsona"}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          Canlı
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <p className="px-2 py-10 text-center text-xs text-muted-foreground">
            Aktif salon siparişi yok.
          </p>
        ) : (
          groups.map((group) => (
            <div
              key={group.key}
              className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {group.initials}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-foreground">{group.waiterName}</span>
                    {group.tableLabels.length > 0 ? (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        ({group.tableLabels.slice(0, 4).join(", ")}
                        {group.tableLabels.length > 4 ? "…" : ""})
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {group.orders.length} Sipariş
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {group.orders.slice(0, 4).map((order) => {
                  const tone = tableStatusTone(order);
                  const delayed = delayedKeys?.has(managedOrderKey(order));
                  return (
                    <button
                      key={managedOrderKey(order)}
                      type="button"
                      onClick={() => onSelect(order)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border border-border border-l-4 bg-card p-2.5 text-left shadow-sm transition-colors hover:bg-muted/60",
                        TONE_BORDER[tone],
                        delayed && "border-rose-200 bg-rose-50/40 dark:bg-rose-950/20",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-[13px] font-bold text-foreground">
                          {orderLocationLabel(order)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            TONE_BADGE[tone],
                          )}
                        >
                          {orderStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[12px] font-bold tabular-nums text-foreground">
                          {formatMenuPrice(order.totalAmount ?? undefined, order.currency || "TRY")}
                        </span>
                        {order.status === "READY" ? (
                          <span className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                            Servis
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {formatOrderWhenCompact(order.submittedAt || order.createdAt)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {matrixOrders.length > 0 ? (
          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Hızlı masa durum dağılımı
            </span>
            <div className="grid grid-cols-6 gap-1.5 text-center">
              {matrixOrders.map((order) => {
                const tone = tableStatusTone(order);
                return (
                  <button
                    key={managedOrderKey(order)}
                    type="button"
                    title={`${orderLocationLabel(order)} — ${orderStatusLabel(order.status)}`}
                    onClick={() => onSelect(order)}
                    className={cn(
                      "rounded-lg border p-1.5 text-[12px] font-bold transition-colors hover:opacity-90",
                      tone === "occupied" && "border-orange-200 bg-orange-100 text-primary",
                      tone === "serving" && "border-emerald-200 bg-emerald-100 text-emerald-800",
                      tone === "waiting" && "border-sky-200 bg-sky-100 text-sky-800",
                      tone === "delayed" && "border-rose-200 bg-rose-100 text-rose-800",
                      tone === "empty" && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {orderLocationLabel(order).replace(/^Masa\s+/i, "M").slice(0, 4)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Dolu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" /> Serviste
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" /> Boş
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Gecikme
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <Link
        href={detailHref}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Garson detayı
      </Link>
    </div>
  );
}

function KitchenTicket({
  order,
  delayed,
  onSelect,
}: {
  order: OrderResponse;
  delayed?: boolean;
  onSelect: (order: OrderResponse) => void;
}) {
  const now = Date.now();
  const elapsed = kitchenElapsedMinutes(order, now);
  const late = delayed || isKitchenTicketDelayed(order, now);
  const ready = order.status === "READY";
  const items = order.items ?? [];

  return (
    <div
      className={cn(
        "rounded-xl border p-2.5",
        late && "border-rose-200 bg-rose-50/40 shadow-[0_0_12px_rgba(239,68,68,0.08)] dark:bg-rose-950/20",
        ready && !late && "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20",
        !late && !ready && "border-border bg-muted/40",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b pb-1.5",
          late ? "border-rose-200" : ready ? "border-emerald-200" : "border-border/80",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[14px] font-bold",
              late ? "text-rose-600" : ready ? "text-emerald-700" : "text-primary",
            )}
          >
            #{order.orderNumber || order.id}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              late
                ? "bg-rose-100 text-rose-800"
                : ready
                  ? "bg-emerald-100 text-emerald-800"
                  : "border border-border bg-card text-foreground",
            )}
          >
            {orderLocationLabel(order)}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] font-semibold",
            late ? "text-rose-600" : ready ? "text-emerald-700" : "text-muted-foreground",
          )}
        >
          {late ? (
            <TriangleAlert className="h-3.5 w-3.5" />
          ) : ready ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Clock3 className="h-3.5 w-3.5 text-primary" />
          )}
          <span>
            {late
              ? `${elapsed ?? "—"} dk — Zaman uyarısı`
              : ready
                ? "Hazır (Servis bekliyor)"
                : `Hazırlanıyor · ${elapsed ?? 0} / ${KITCHEN_KANBAN_SLA_MINUTES} dk`}
          </span>
        </div>
      </div>

      <div className="space-y-1 py-2 text-[12px] text-foreground">
        {items.length === 0 ? (
          <div>—</div>
        ) : (
          items.slice(0, 3).map((item) => (
            <div key={`${managedOrderKey(order)}-${item.id ?? item.productId}`} className="flex justify-between gap-2">
              <span>
                <strong>{item.quantity}x</strong>{" "}
                {item.productName?.trim() || (item.productId ? `#${item.productId}` : "ürün")}
              </span>
            </div>
          ))
        )}
        {items.length > 3 ? (
          <div className="text-[11px] text-muted-foreground">+{items.length - 3} ürün daha</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onSelect(order)}
        className={cn(
          "mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors",
          ready
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : late
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "border border-border bg-card text-primary hover:bg-muted",
        )}
      >
        {ready ? (
          <>
            <PersonStanding className="h-3.5 w-3.5" />
            Garsona çağrı — detay
          </>
        ) : late ? (
          "Şefi uyar — detay"
        ) : (
          <>
            <Check className="h-3.5 w-3.5" />
            Hazırlandı olarak işaretle
          </>
        )}
      </button>
    </div>
  );
}

function KitchenColumn({
  orders,
  delayedKeys,
  detailHref,
  onSelect,
}: {
  orders: OrderResponse[];
  delayedKeys?: Set<string>;
  detailHref: string;
  onSelect: (order: OrderResponse) => void;
}) {
  const lanes = groupOpsLaneOrders(orders, true);
  const kitchenOrders = [
    ...lanes.kitchen,
    ...orders.filter((o) => o.status === "READY" && !isDeliveryOrder(o)),
  ];
  const preparing = kitchenOrders.filter((o) => o.status !== "READY");
  const ready = kitchenOrders.filter((o) => o.status === "READY");
  const delayedCount = preparing.filter((o) => delayedKeys?.has(managedOrderKey(o))).length;

  return (
    <div className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-primary dark:border-orange-900 dark:bg-orange-950/40">
            <ChefHat className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Mutfak KDS Ekranı</h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              {preparing.length} hazırlanıyor · {ready.length} hazır
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {kitchenOrders.length} Bilet
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[12px]">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-1.5 text-center dark:border-orange-900 dark:bg-orange-950/30">
          <span className="block font-bold text-foreground">Hazırlanıyor</span>
          <span className="text-[10px] font-semibold text-primary">{preparing.length} Bilet</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-1.5 text-center">
          <span className="block font-semibold text-foreground">Gecikme</span>
          <span className="text-[10px] font-medium text-rose-600">{delayedCount} Uyarı</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-1.5 text-center">
          <span className="block font-semibold text-foreground">Hazır</span>
          <span className="text-[10px] font-medium text-emerald-700">{ready.length} Bilet</span>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {kitchenOrders.length === 0 ? (
          <p className="px-2 py-10 text-center text-xs text-muted-foreground">Mutfak kuyruğu boş.</p>
        ) : (
          kitchenOrders.slice(0, 8).map((order) => (
            <KitchenTicket
              key={managedOrderKey(order)}
              order={order}
              delayed={delayedKeys?.has(managedOrderKey(order))}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

        <Link
        href={detailHref}
        className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 text-xs font-bold text-white transition-colors hover:bg-emerald-800"
      >
        <BellRing className="h-3.5 w-3.5" />
        Mutfak detayı / garson çağrı
      </Link>
    </div>
  );
}

function CourierColumn({
  orders,
  delayedKeys,
  detailHref,
  onSelect,
}: {
  orders: OrderResponse[];
  delayedKeys?: Set<string>;
  detailHref: string;
  onSelect: (order: OrderResponse) => void;
}) {
  const lanes = groupOpsLaneOrders(orders, true);
  const tickets = [...lanes.courier];
  const channels = courierChannelCounts(orders);

  return (
    <div className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
            <Bike className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Kurye &amp; Paket Filosu</h2>
            <p className="text-[11px] font-medium text-muted-foreground">Entegre kanallar &amp; teslimat</p>
          </div>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
          {tickets.length} Aktif
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {channels.map((channel) => (
          <div key={channel.key} className="rounded-lg border border-border bg-muted/40 p-1.5">
            <span className="block text-[13px] font-bold tabular-nums text-foreground">{channel.count}</span>
            <span className="text-[10px] font-medium text-muted-foreground">{channel.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {tickets.length === 0 ? (
          <p className="px-2 py-10 text-center text-xs text-muted-foreground">Aktif paket siparişi yok.</p>
        ) : (
          tickets.slice(0, 8).map((order) => {
            const channel = orderChannel(order);
            const delayed = delayedKeys?.has(managedOrderKey(order));
            const onRoad = order.status === "ON_THE_WAY";
            const waiting = order.status === "READY";
            return (
              <button
                key={managedOrderKey(order)}
                type="button"
                onClick={() => onSelect(order)}
                className="w-full space-y-1.5 rounded-xl border border-border bg-muted/40 p-2.5 text-left transition-colors hover:bg-muted/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                      {ORDER_CHANNEL_LABEL[channel].slice(0, 2).toLocaleUpperCase("tr-TR")}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-foreground">
                        #{order.orderNumber || order.id}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {ORDER_CHANNEL_LABEL[channel]}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      onRoad && "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
                      waiting && "bg-orange-100 text-primary dark:bg-orange-950/50",
                      !onRoad && !waiting && "bg-emerald-100 text-emerald-800",
                      delayed && "bg-rose-100 text-rose-800",
                    )}
                  >
                    {orderStatusLabel(order.status)}
                  </span>
                </div>
                <div className="space-y-1 rounded-lg border border-border bg-card p-2.5 text-[12px] shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {order.customerName?.trim() || "Müşteri"}
                    </span>
                    <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300">
                      {formatMenuPrice(orderAmount(order.totalAmount), order.currency || "TRY")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">{order.deliveryAddress?.trim() || orderLocationLabel(order)}</span>
                    <span>{formatOrderWhenCompact(order.submittedAt || order.createdAt)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <Link
        href={detailHref}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Kurye detayı / sipariş ata
      </Link>
    </div>
  );
}

export function OrderOpsTracker({
  orders,
  snapshots: _snapshots,
  kitchenEnabled,
  delayedKeys,
  detailHref,
  onSelect,
}: OrderOpsTrackerProps) {
  void _snapshots;
  return (
    <div className="space-y-3">
      {!kitchenEnabled ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3">
          <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Mutfak bu şubede kapalı</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Seçilen siparişler mutfağa düşmez; doğrudan garsona atanır. Mutfağı şube ayarlarından
              açabilirsiniz.
            </p>
          </div>
        </div>
      ) : null}
      <section
        className={cn(
          "grid grid-cols-1 gap-4",
          kitchenEnabled ? "xl:grid-cols-3" : "xl:grid-cols-2",
        )}
      >
        <SalonColumn
          orders={orders}
          kitchenEnabled={kitchenEnabled}
          delayedKeys={delayedKeys}
          detailHref={detailHref("waiter")}
          onSelect={onSelect}
        />
        {kitchenEnabled ? (
          <KitchenColumn
            orders={orders}
            delayedKeys={delayedKeys}
            detailHref={detailHref("kitchen")}
            onSelect={onSelect}
          />
        ) : null}
        <CourierColumn
          orders={orders}
          delayedKeys={delayedKeys}
          detailHref={detailHref("courier")}
          onSelect={onSelect}
        />
      </section>
    </div>
  );
}
