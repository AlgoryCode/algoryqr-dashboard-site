"use client";

import Link from "next/link";

import { PrintOrderButton } from "@/components/dashboard/PrintOrderButton";
import { formatMenuPrice } from "@/components/menu-templates/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  canMarkServedToCustomer,
  formatOrderWhen,
  orderChannel,
  orderCustomerName,
  orderLocationLabel,
  orderTimeline,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";

import { OrderChannelBadge } from "./OrderChannelBadge";
import { OrderStatusBadge } from "./OrderStatusBadge";

type OrderPeekSheetProps = {
  order: OrderResponse | null;
  qrId: number | null;
  includeTips: boolean;
  delivering?: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkServed?: (order: OrderResponse) => void;
};

export function OrderPeekSheet({
  order,
  qrId,
  includeTips,
  delivering,
  onOpenChange,
  onMarkServed,
}: OrderPeekSheetProps) {
  const open = order != null;
  const currency = order?.currency || "TRY";
  const tip = Number(order?.tipAmount ?? 0);
  const href = order
    ? orderChannel(order) === "ONLINE"
      ? DASHBOARD_ROUTES.onlineOrderDetail(order.id)
      : DASHBOARD_ROUTES.waiterOrderDetail(order.id, qrId)
    : DASHBOARD_ROUTES.waiter;
  const timeline = order ? orderTimeline(order) : [];
  const orderNo = order?.orderNumber?.trim() || (order ? String(order.id) : "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {order ? (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {orderLocationLabel(order)}
                <span className="text-sm font-normal text-muted-foreground">#{orderNo}</span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <OrderChannelBadge channel={orderChannel(order)} />
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <div className="space-y-1 text-sm">
                <p className="font-medium">{orderCustomerName(order)}</p>
                <p className="text-muted-foreground">
                  {formatOrderWhen(order.submittedAt || order.createdAt)}
                </p>
                {order.waiterName ? (
                  <p className="text-muted-foreground">Garson: {order.waiterName}</p>
                ) : null}
                {order.customerPhone ? (
                  <p className="text-muted-foreground">{order.customerPhone}</p>
                ) : null}
                {order.deliveryAddress ? (
                  <p className="text-muted-foreground">{order.deliveryAddress}</p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Ürünler</p>
                <ul className="space-y-1.5 text-sm">
                  {(order.items ?? []).length === 0 ? (
                    <li className="text-muted-foreground">—</li>
                  ) : (
                    (order.items ?? []).map((item) => (
                      <li key={`${order.id}-${item.id ?? item.productId}`}>
                        {item.productName?.trim() ? (
                          <>
                            <span className="font-medium">{item.quantity}×</span> {item.productName}
                          </>
                        ) : item.productId ? (
                          <>
                            <span className="font-medium">{item.quantity}×</span> #{item.productId}
                          </>
                        ) : (
                          `${item.quantity} ürün`
                        )}
                        {item.selectedOptions?.length ? (
                          <span className="block text-xs text-muted-foreground">
                            {item.selectedOptions
                              .map((option) => option.optionName)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {timeline.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Akış</p>
                  <ol className="space-y-2 border-l border-border pl-3">
                    {timeline.map((event) => (
                      <li key={`${event.key}-${event.at}`} className="text-sm">
                        <p className="font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{formatOrderWhen(event.at)}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {order.note ? (
                <p className="rounded-md bg-muted/50 px-2 py-1.5 text-sm text-muted-foreground">
                  Not: {order.note}
                </p>
              ) : null}

              <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
                <div>
                  <p className="text-base font-semibold tabular-nums">
                    {formatMenuPrice(order.totalAmount ?? undefined, currency)}
                  </p>
                  {includeTips && tip > 0 ? (
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      +{formatMenuPrice(tip, currency)} bahşiş
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <PrintOrderButton kind="kitchen" order={order} />
                  {onMarkServed && canMarkServedToCustomer(order) ? (
                    <Button type="button" disabled={delivering} onClick={() => onMarkServed(order)}>
                      {delivering ? "İşleniyor…" : "Müşteriye teslim edildi"}
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link href={href}>Tam detay</Link>
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
