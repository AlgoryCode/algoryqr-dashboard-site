"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { DateRangeFilter, type DateRangeValue } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  DASHBOARD_BACK,
  DASHBOARD_FILTER_FIELD,
  DASHBOARD_FILTER_LABEL,
  DASHBOARD_SURFACE,
} from "@/lib/dashboard-surface";
import {
  ORDER_CHANNEL_LABEL,
  ORDER_CHANNELS,
  ORDER_STATUS_FILTER_OPTIONS,
  countsTowardRevenue,
  formatOrderWhen,
  managedOrderKey,
  orderAmount,
  orderChannel,
  orderHistoryTitle,
  orderLocationLabel,
  type OrderChannel,
  type OrderStatusFilter,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

import { OrderChannelBadge } from "./OrderChannelBadge";
import { OrderStatusBadge } from "./OrderStatusBadge";

type OrderIncomingListProps = {
  backHref: string;
  orders: OrderResponse[];
  includeTips: boolean;
  delayedKeys?: Set<string>;
  range: DateRangeValue;
  onRangeChange: (next: DateRangeValue) => void;
  customerQuery: string;
  onCustomerQueryChange: (next: string) => void;
  statusFilter: OrderStatusFilter;
  onStatusChange: (next: OrderStatusFilter) => void;
  channelFilter: "all" | OrderChannel;
  onChannelChange: (next: "all" | OrderChannel) => void;
  onIncludeTipsChange: (next: boolean) => void;
  onSelect: (order: OrderResponse) => void;
  menuPicker?: ReactNode;
  branchFilter?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  emptyMessage?: string;
};

export function OrderIncomingList({
  backHref,
  orders,
  includeTips,
  delayedKeys,
  range,
  onRangeChange,
  customerQuery,
  onCustomerQueryChange,
  statusFilter,
  onStatusChange,
  channelFilter,
  onChannelChange,
  onIncludeTipsChange,
  onSelect,
  menuPicker,
  branchFilter,
  loading,
  error,
  emptyMessage = "Bu filtrelerle sipariş yok.",
}: OrderIncomingListProps) {
  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title="Siparişler"
        hint={`${orders.length.toLocaleString("tr-TR")} sipariş`}
        back={
          <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={menuPicker}
      />

      <DashboardFilterBar className="sm:grid sm:grid-cols-2 sm:items-end lg:grid-cols-6">
        {branchFilter}
        <DateRangeFilter
          className="sm:col-span-2 lg:col-span-3"
          value={range}
          onChange={onRangeChange}
        />
        <div className={cn(DASHBOARD_FILTER_FIELD, "min-w-0 sm:col-span-2 lg:col-span-3")}>
          <Label htmlFor="orders-list-search" className={DASHBOARD_FILTER_LABEL}>
            Detaylı ara
          </Label>
          <Input
            id="orders-list-search"
            value={customerQuery}
            onChange={(event) => onCustomerQueryChange(event.target.value)}
            placeholder="No, müşteri, ürün, garson, kanal"
          />
        </div>
        <FilterSelect
          label="Durum"
          value={statusFilter}
          onValueChange={(next) => onStatusChange(next as OrderStatusFilter)}
          options={ORDER_STATUS_FILTER_OPTIONS}
          className="min-w-0 lg:col-span-2"
        />
        <FilterSelect
          label="Kanal"
          value={channelFilter}
          onValueChange={(next) => onChannelChange(next as "all" | OrderChannel)}
          options={[
            { value: "all", label: "Tüm kanallar" },
            ...ORDER_CHANNELS.map((channel) => ({
              value: channel,
              label: ORDER_CHANNEL_LABEL[channel],
            })),
          ]}
          className="min-w-0 lg:col-span-2"
        />
        <div className={cn(DASHBOARD_FILTER_FIELD, "min-w-0 sm:col-span-2 lg:col-span-2")}>
          <Label htmlFor="orders-list-tips" className={DASHBOARD_FILTER_LABEL}>
            Bahşiş
          </Label>
          <div className="flex h-10 items-center justify-between gap-3 rounded-md border border-input bg-background px-3">
            <span className="text-sm text-foreground">Bahşişleri dahil et</span>
            <Switch
              id="orders-list-tips"
              checked={includeTips}
              onCheckedChange={onIncludeTipsChange}
            />
          </div>
        </div>
      </DashboardFilterBar>

      {error}
      {loading ? (
        <DashboardLoadingState label="Siparişler yükleniyor..." />
      ) : orders.length === 0 ? (
        <p className={`${DASHBOARD_SURFACE} p-8 text-sm text-muted-foreground`}>{emptyMessage}</p>
      ) : (
        <div className={`${DASHBOARD_SURFACE} overflow-hidden`}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-10">Sipariş</TableHead>
                <TableHead className="h-10">Kanal</TableHead>
                <TableHead className="h-10">Durum</TableHead>
                <TableHead className="h-10">Tarih</TableHead>
                <TableHead className="h-10 text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const key = managedOrderKey(order);
                const delayed = delayedKeys?.has(key);
                const inbound = countsTowardRevenue(order.status);
                const tip = includeTips ? orderAmount(order.tipAmount) : 0;
                const amount = orderAmount(order.totalAmount) + tip;
                const currency = order.currency || "TRY";
                const formatted = formatMenuPrice(amount, currency) || "₺0";
                return (
                  <TableRow
                    key={key}
                    className={cn(
                      "cursor-pointer",
                      (order.status === "CANCELLED" || order.status === "REJECTED") && "opacity-70",
                    )}
                    onClick={() => onSelect(order)}
                  >
                    <TableCell className="py-3">
                      <div className="flex min-w-0 items-start gap-2">
                        {delayed ? (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                            title="Gecikti"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{orderHistoryTitle(order)}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            #{order.orderNumber || order.id} · {orderLocationLabel(order)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <OrderChannelBadge channel={orderChannel(order)} />
                    </TableCell>
                    <TableCell className="py-3">
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      {formatOrderWhen(order.submittedAt || order.createdAt)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-3 text-right font-semibold tabular-nums",
                        inbound ? "text-lime-600 dark:text-lime-400" : "text-muted-foreground",
                      )}
                    >
                      {inbound ? `+${formatted}` : formatted}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
