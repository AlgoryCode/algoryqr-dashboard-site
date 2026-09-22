"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import type { DateRangePreset } from "@/components/ui/date-range-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { managedOrderKey } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

import { OrderHistoryRow } from "./OrderHistoryRow";

const HISTORY_PERIODS: { id: Exclude<DateRangePreset, "custom" | "yesterday">; label: string }[] = [
  { id: "today", label: "24s" },
  { id: "7d", label: "7g" },
  { id: "30d", label: "30g" },
  { id: "all", label: "Tümü" },
];

type OrderIncomingHistoryProps = {
  orders: OrderResponse[];
  includeTips?: boolean;
  delayedKeys?: Set<string>;
  period?: DateRangePreset;
  onPeriodChange?: (period: Exclude<DateRangePreset, "custom">) => void;
  detailsHref?: string;
  onSelect: (order: OrderResponse) => void;
};

function periodLabel(period?: DateRangePreset) {
  if (!period || period === "custom") return "Özel";
  return HISTORY_PERIODS.find((item) => item.id === period)?.label ?? "Tümü";
}

export function OrderIncomingHistory({
  orders,
  includeTips,
  delayedKeys,
  period,
  onPeriodChange,
  detailsHref,
  onSelect,
}: OrderIncomingHistoryProps) {
  return (
    <div className={`${DASHBOARD_SURFACE} flex h-full min-h-[24rem] max-h-[28.5rem] flex-col px-5 py-4 lg:max-h-none`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Gelen siparişler</h2>
        {onPeriodChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {periodLabel(period)}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[7rem]">
              {HISTORY_PERIODS.map((item) => (
                <DropdownMenuItem key={item.id} onSelect={() => onPeriodChange(item.id)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>Ad</span>
        <span>Tutar</span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 flex-1 text-sm text-muted-foreground">Bu aralıkta gelen sipariş yok.</p>
      ) : (
        <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {orders.map((order) => {
            const key = managedOrderKey(order);
            return (
              <OrderHistoryRow
                key={key}
                order={order}
                includeTips={includeTips}
                delayed={delayedKeys?.has(key)}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}

      {detailsHref ? (
        <Link
          href={detailsHref}
          className="mt-3 inline-flex shrink-0 items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Detaylı incele
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
