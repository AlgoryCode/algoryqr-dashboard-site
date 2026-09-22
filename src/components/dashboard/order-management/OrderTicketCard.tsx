"use client";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  formatOrderWhenCompact,
  isFreshOrder,
  managedOrderKey,
  orderAmount,
  orderChannel,
  orderCustomerName,
  orderLocationLabel,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

import { OrderChannelBadge } from "./OrderChannelBadge";
import { OrderStatusBadge } from "./OrderStatusBadge";

type OrderTicketCardProps = {
  order: OrderResponse;
  includeTips?: boolean;
  delayed?: boolean;
  onSelect: (order: OrderResponse) => void;
};

export function OrderTicketCard({ order, includeTips, delayed, onSelect }: OrderTicketCardProps) {
  const tip = orderAmount(order.tipAmount);
  const fresh = isFreshOrder(order);
  const items = order.items ?? [];
  const currency = order.currency || "TRY";

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50",
        delayed && "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
        (order.status === "CANCELLED" || order.status === "REJECTED") && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{orderLocationLabel(order)}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            #{order.orderNumber || order.id} · {orderCustomerName(order)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {delayed ? (
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" title="Gecikti" />
          ) : fresh ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Yeni" />
          ) : null}
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {items.length === 0 ? (
          <li>—</li>
        ) : (
          items.slice(0, 4).map((item) => (
            <li key={`${managedOrderKey(order)}-${item.id ?? item.productId}`} className="truncate">
              <span className="font-medium text-foreground">{item.quantity}×</span>{" "}
              {item.productName?.trim() || (item.productId ? `#${item.productId}` : "ürün")}
            </li>
          ))
        )}
        {items.length > 4 ? <li>+{items.length - 4} ürün daha</li> : null}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <OrderChannelBadge channel={orderChannel(order)} />
          {order.waiterName ? (
            <span className="truncate text-[11px] text-muted-foreground">Garson: {order.waiterName}</span>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatMenuPrice(order.totalAmount ?? undefined, currency)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatOrderWhenCompact(order.submittedAt || order.createdAt)}
            {includeTips && tip > 0 ? ` · +${formatMenuPrice(tip, currency)} bahşiş` : ""}
          </p>
        </div>
      </div>
    </button>
  );
}
