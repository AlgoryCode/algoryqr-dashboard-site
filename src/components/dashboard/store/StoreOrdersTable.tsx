"use client";

import { useRouter } from "next/navigation";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_METRIC_LABEL, DASHBOARD_METRIC_VALUE, DASHBOARD_STAT_TILE, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import type { StoreOrderStatus, StoreOrderSummary } from "@/lib/store-api";
import { STORE_DELIVERY_TYPE_LABEL, STORE_ORDER_STATUS_LABEL } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function itemSummary(order: StoreOrderSummary): string {
  if (order.itemCount <= 0) return "—";
  return `${order.itemCount} ürün`;
}

function isClosedStatus(status: StoreOrderStatus): boolean {
  return status === "CANCELLED" || status === "REJECTED";
}

function countsTowardRevenue(status: StoreOrderStatus): boolean {
  return !isClosedStatus(status) && status !== "PENDING";
}

export function sumStoreOrderRevenue(orders: StoreOrderSummary[]): number {
  let total = 0;
  for (const order of orders) {
    if (!countsTowardRevenue(order.status)) continue;
    total += order.totalAmount;
  }
  return total;
}

export function StoreOrdersTable({
  orders,
  currency,
}: {
  orders: StoreOrderSummary[];
  currency: string;
}) {
  const router = useRouter();
  const revenueTotal = sumStoreOrderRevenue(orders);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className={cn(DASHBOARD_STAT_TILE, "w-fit min-w-[10.5rem] shrink-0")}>
          <p className={DASHBOARD_METRIC_LABEL}>Siparişlerden kazanılan toplam</p>
          <p className={DASHBOARD_METRIC_VALUE}>
            {formatMenuPrice(revenueTotal, currency)}
          </p>
        </div>
      </div>

      <div className={`${DASHBOARD_SURFACE} overflow-hidden`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-10">Teslimat</TableHead>
              <TableHead className="h-10">Durum</TableHead>
              <TableHead className="h-10">Müşteri</TableHead>
              <TableHead className="h-10">No</TableHead>
              <TableHead className="h-10">Tarih</TableHead>
              <TableHead className="h-10">Ürünler</TableHead>
              <TableHead className="h-10 text-right">Tutar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const href = DASHBOARD_ROUTES.onlineOrderDetail(order.id);
              return (
                <TableRow
                  key={order.id}
                  className={cn("cursor-pointer", isClosedStatus(order.status) && "opacity-70")}
                  onClick={() => router.push(href)}
                >
                  <TableCell className="py-3 font-medium">
                    {STORE_DELIVERY_TYPE_LABEL[order.deliveryType]}
                  </TableCell>
                  <TableCell className="py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        isClosedStatus(order.status)
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {STORE_ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">
                    {order.customerName?.trim() || "Misafir"}
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">
                    #{order.orderNo || order.id}
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">
                    {formatWhen(order.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate py-3 text-muted-foreground">
                    {itemSummary(order)}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <span className="font-medium tabular-nums">
                      {formatMenuPrice(order.totalAmount, order.currency || currency)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
