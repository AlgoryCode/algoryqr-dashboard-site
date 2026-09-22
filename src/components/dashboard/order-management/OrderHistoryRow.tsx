"use client";

import { Bike, QrCode, ShoppingBag, Store, UtensilsCrossed, type LucideIcon } from "lucide-react";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  countsTowardRevenue,
  formatOrderHistoryDate,
  isFreshOrder,
  orderAmount,
  orderChannel,
  orderHistoryTitle,
  orderStatusLabel,
  type OrderChannel,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<OrderChannel, { icon: LucideIcon; well: string }> = {
  QR: {
    icon: QrCode,
    well: "bg-teal-500/15 text-teal-800 dark:text-teal-300",
  },
  WAITER: {
    icon: UtensilsCrossed,
    well: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  },
  ONLINE: {
    icon: ShoppingBag,
    well: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  },
  UBER_EATS: {
    icon: Bike,
    well: "bg-lime-500/20 text-lime-800 dark:text-lime-300",
  },
  YEMEKSEPETI: {
    icon: Store,
    well: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
  },
};

type OrderHistoryRowProps = {
  order: OrderResponse;
  includeTips?: boolean;
  delayed?: boolean;
  onSelect: (order: OrderResponse) => void;
};

export function OrderHistoryRow({ order, includeTips, delayed, onSelect }: OrderHistoryRowProps) {
  const channel = orderChannel(order);
  const Icon = CHANNEL_ICON[channel].icon;
  const inbound = countsTowardRevenue(order.status);
  const tip = includeTips ? orderAmount(order.tipAmount) : 0;
  const amount = orderAmount(order.totalAmount) + tip;
  const currency = order.currency || "TRY";
  const formatted = formatMenuPrice(amount, currency) || "₺0";
  const fresh = isFreshOrder(order);

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className={cn(
        "-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-2xl px-1 py-2.5 text-left transition-colors hover:bg-muted/50",
        (order.status === "CANCELLED" || order.status === "REJECTED") && "opacity-70",
      )}
    >
      <span
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          CHANNEL_ICON[channel].well,
        )}
      >
        <Icon className="h-4 w-4" />
        {delayed ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" title="Gecikti" />
        ) : fresh ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-lime-500" title="Yeni" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{orderHistoryTitle(order)}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {formatOrderHistoryDate(order.submittedAt || order.createdAt)}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span
          className={cn(
            "block text-sm font-semibold tabular-nums",
            inbound ? "text-lime-600 dark:text-lime-400" : "text-muted-foreground",
          )}
        >
          {inbound ? `+${formatted}` : formatted}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{orderStatusLabel(order.status)}</span>
      </span>
    </button>
  );
}
