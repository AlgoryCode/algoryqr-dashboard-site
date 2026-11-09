"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Search } from "lucide-react";

import { BranchScopeFilter } from "@/components/dashboard/BranchScopeFilter";
import { DigitalMenuHubGate } from "@/components/dashboard/digital-menu/DigitalMenuHubGate";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { PrintOrderButton } from "@/components/dashboard/PrintOrderButton";
import { formatSelectedOptionLines } from "@/lib/receipt-ticket";
import { OrderCancelDialog } from "@/components/orders/OrderCancelDialog";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, todayDateRange, type DateRangeValue } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api";
import { formatBranchAmount } from "@/lib/branch-detail";
import { menusInBranchScope, type BranchScope } from "@/lib/branch-scope";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  DASHBOARD_FILTER_BAR,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_PANEL,
  DASHBOARD_STAT_TILE,
  DASHBOARD_TYPE_KPI,
} from "@/lib/dashboard-surface";
import { listAllManagedOrders, orderReference } from "@/lib/managed-orders";
import {
  filterManagedOrders,
  formatOrderWhen,
  isOpenOrderStatus,
  itemSummary,
  managedOrderKey,
  sumOrderRevenue,
  ORDER_CHANNEL_LABEL,
  ORDER_CHANNELS,
  ORDER_STATUS_FILTER_OPTIONS,
  orderAmount,
  orderChannel,
  orderCustomerName,
  orderLocationLabel,
  orderStatusLabel,
  orderTimeline,
  type OrderChannel,
  type OrderStatusFilter,
} from "@/lib/order-management";
import { isOrderCancellable, type OrderCancelRequest } from "@/lib/order-flow";
import { cancelMerchantOrder, type OrderResponse } from "@/lib/ordering-api";
import { cancelStoreKitchenOrder, isOnlineKitchenSource } from "@/lib/store-kitchen";
import { cn } from "@/lib/utils";

const QUERY_KEY = "my-orders";

function marketplacePrintProps(order: OrderResponse) {
  const channel = orderChannel(order);
  if (channel === "UBER_EATS" || channel === "YEMEKSEPETI") {
    return {
      kind: "marketplace" as const,
      source: (channel === "UBER_EATS" ? "UBER_EATS" : "YEMEK_SEPETI") as "UBER_EATS" | "YEMEK_SEPETI",
      order: {
        id: order.id,
        externalOrderId: order.externalOrderId || String(order.id),
        orderNumber: order.orderNumber,
        deliveryType: order.deliveryType,
        totalAmount: orderAmount(order.totalAmount),
        currency: order.currency,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        note: order.note,
        packageCreatedAt: order.submittedAt || order.createdAt,
        items: (order.items ?? []).map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
          detail: [
            ...formatSelectedOptionLines(item.selectedOptions),
            item.note?.trim(),
          ]
            .filter(Boolean)
            .join("\n") || null,
        })),
      },
    };
  }
  return { kind: "kitchen" as const, order };
}

async function cancelManagedOrder(order: OrderResponse, request: OrderCancelRequest) {
  if (isOnlineKitchenSource(order.orderSource)) {
    return cancelStoreKitchenOrder(order.id, request);
  }
  if (order.menuId == null) {
    throw new Error("Bu sipariş iptal edilemedi");
  }
  return cancelMerchantOrder(order.menuId, order.id, request);
}

export default function MyOrdersView() {
  return (
    <DigitalMenuHubGate>
      <MyOrdersContent />
    </DigitalMenuHubGate>
  );
}

function MyOrdersContent() {
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();
  const branchesQuery = useBranches(true);
  const branches = branchesQuery.data?.content ?? [];

  const [scope, setScope] = useState<BranchScope>("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>(todayDateRange);
  const [status, setStatus] = useState<OrderStatusFilter>("all");
  const [channel, setChannel] = useState<"all" | OrderChannel>("all");
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);

  const effectiveScope: BranchScope =
    scope !== "all" && branches.some((branch) => branch.id === scope) ? scope : "all";
  const menus = useMemo(() => menusInBranchScope(branches, effectiveScope), [branches, effectiveScope]);

  const ordersQuery = useQuery({
    queryKey: [QUERY_KEY, menus.map((menu) => menu.menuId), dateRange.from, dateRange.to],
    queryFn: () => listAllManagedOrders(menus, dateRange),
    // Without a start date the whole history is downloaded, so it is refreshed far less often.
    refetchInterval: dateRange.from ? 8_000 : 120_000,
  });

  const filtered = useMemo(
    () =>
      filterManagedOrders(ordersQuery.data ?? [], {
        from: dateRange.from,
        to: dateRange.to,
        query,
        status,
        channel,
        branchId: effectiveScope === "all" ? "all" : effectiveScope,
      }),
    [ordersQuery.data, dateRange.from, dateRange.to, query, status, channel, effectiveScope],
  );

  const openCount = filtered.filter((order) => isOpenOrderStatus(order.status)).length;
  const revenue = sumOrderRevenue(filtered, false);

  const cancelMutation = useMutation({
    mutationFn: ({ order, request }: { order: OrderResponse; request: OrderCancelRequest }) =>
      cancelManagedOrder(order, request),
    onSuccess: async () => {
      setCancelOrder(null);
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      notify("info", "Sipariş iptal edildi.");
    },
    onError: (error) => {
      notify("danger", error instanceof ApiError ? error.message : "Sipariş iptal edilemedi.");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Siparişlerim"
        hint="QR, garson, online ve pazaryeri siparişleri. Liste birkaç saniyede bir yenilenir."
        action={
          <Button asChild variant="outline">
            <Link href={DASHBOARD_ROUTES.kitchenScreen(effectiveScope === "all" ? null : effectiveScope)}>
              Mutfak ekranı
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={DASHBOARD_STAT_TILE}>
          <p className={DASHBOARD_METRIC_LABEL}>Görünen sipariş</p>
          <p className={DASHBOARD_TYPE_KPI}>{filtered.length}</p>
        </div>
        <div className={DASHBOARD_STAT_TILE}>
          <p className={DASHBOARD_METRIC_LABEL}>Açık</p>
          <p className={DASHBOARD_TYPE_KPI}>{openCount}</p>
        </div>
        <div className={DASHBOARD_STAT_TILE}>
          <p className={DASHBOARD_METRIC_LABEL}>Ciro (teslim)</p>
          <p className={DASHBOARD_TYPE_KPI}>{formatBranchAmount(revenue)}</p>
        </div>
      </div>

      <div className={DASHBOARD_FILTER_BAR}>
        {branches.length > 1 ? (
          <BranchScopeFilter
            branches={branches}
            value={effectiveScope}
            onChange={setScope}
            className="w-full sm:w-56"
          />
        ) : null}
        <DateRangeFilter className="min-w-0 flex-1" value={dateRange} onChange={setDateRange} />
        <FilterSelect
          label="Durum"
          className="w-full sm:w-44"
          value={status}
          onValueChange={(value) => setStatus(value as OrderStatusFilter)}
          options={ORDER_STATUS_FILTER_OPTIONS}
        />
        <FilterSelect
          label="Kaynak"
          className="w-full sm:w-44"
          value={channel}
          onValueChange={(value) => setChannel(value === "all" ? "all" : (value as OrderChannel))}
          options={[
            { value: "all", label: "Tüm kaynaklar" },
            ...ORDER_CHANNELS.map((item) => ({ value: item, label: ORDER_CHANNEL_LABEL[item] })),
          ]}
        />
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label className="mb-1.5 block text-xs text-muted-foreground">Ara</label>
          <Search className="pointer-events-none absolute left-3 top-[2.15rem] h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Müşteri, masa, sipariş no"
            className="pl-9"
          />
        </div>
      </div>

      {ordersQuery.isLoading || branchesQuery.isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Siparişler yükleniyor…
        </div>
      ) : ordersQuery.isError ? (
        <EmptyState title="Siparişler alınamadı" description="Sayfayı yenileyip tekrar deneyin." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Bu filtrelerle sipariş yok"
          description="Tarih aralığını veya kaynağı değiştirerek tekrar bakın."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const key = managedOrderKey(order);
            return (
              <OrderCard
                key={key}
                order={order}
                open={openKey === key}
                onToggle={() => setOpenKey((current) => (current === key ? null : key))}
                onCancel={() => setCancelOrder(order)}
                cancelBusy={cancelMutation.isPending && cancelMutation.variables?.order.id === order.id}
              />
            );
          })}
        </div>
      )}

      <OrderCancelDialog
        open={cancelOrder != null}
        subject={cancelOrder ? `${orderLocationLabel(cancelOrder)} ${orderReference(cancelOrder)}` : null}
        busy={cancelMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !cancelMutation.isPending) setCancelOrder(null);
        }}
        onConfirm={(request) => {
          if (!cancelOrder) return;
          cancelMutation.mutate({ order: cancelOrder, request });
        }}
      />
    </div>
  );
}

function OrderCard({
  order,
  open,
  onToggle,
  onCancel,
  cancelBusy,
}: {
  order: OrderResponse;
  open: boolean;
  onToggle: () => void;
  onCancel: () => void;
  cancelBusy: boolean;
}) {
  const channel = orderChannel(order);
  const cancellable = isOrderCancellable(order.status, Boolean(order.deliveryType === "DELIVERY"));
  const amount = formatBranchAmount(orderAmount(order.totalAmount), order.currency);
  const timeline = orderTimeline(order);
  const printProps = marketplacePrintProps(order);

  return (
    <article className={DASHBOARD_PANEL}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{orderReference(order)}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {ORDER_CHANNEL_LABEL[channel]}
            </span>
            <span className="text-xs text-muted-foreground">{orderStatusLabel(order.status)}</span>
          </div>
          <p className="text-sm text-foreground">
            {orderCustomerName(order)} · {orderLocationLabel(order)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatOrderWhen(order.submittedAt || order.createdAt)} · {itemSummary(order)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-sm font-semibold tabular-nums">{amount}</p>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Detail label="Kaynak" value={ORDER_CHANNEL_LABEL[channel]} />
            <Detail label="Durum" value={orderStatusLabel(order.status)} />
            {order.customerPhone ? <Detail label="Telefon" value={order.customerPhone} /> : null}
            {order.deliveryAddress ? <Detail label="Adres" value={order.deliveryAddress} /> : null}
            {order.waiterName ? <Detail label="Garson" value={order.waiterName} /> : null}
            {order.note ? <Detail label="Not" value={order.note} /> : null}
            {order.kitchenNote ? <Detail label="Mutfak notu" value={order.kitchenNote} /> : null}
          </dl>

          {(order.items ?? []).length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {(order.items ?? []).map((item, index) => (
                <li key={item.id ?? `${item.productId}-${index}`} className="flex justify-between gap-3">
                  <span>
                    {item.quantity}× {item.productName || "Ürün"}
                    {item.selectedOptions?.length ? (
                      <span className="block text-xs text-muted-foreground">
                        {item.selectedOptions.map((option) => option.optionName).filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    {item.note ? <span className="block text-xs text-muted-foreground">{item.note}</span> : null}
                  </span>
                  {item.lineTotal != null || item.unitPrice != null ? (
                    <span className="tabular-nums text-muted-foreground">
                      {formatBranchAmount(orderAmount(item.lineTotal ?? Number(item.unitPrice) * item.quantity), order.currency)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {timeline.length > 0 ? (
            <ol className="space-y-1 text-xs text-muted-foreground">
              {timeline.map((event) => (
                <li key={event.key}>
                  {event.label} · {formatOrderWhen(event.at)}
                </li>
              ))}
            </ol>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {printProps.kind === "marketplace" ? (
              <PrintOrderButton kind="marketplace" source={printProps.source} order={printProps.order} />
            ) : (
              <PrintOrderButton kind="kitchen" order={printProps.order} />
            )}
            {cancellable ? (
              <Button type="button" size="sm" variant="outline" disabled={cancelBusy} onClick={onCancel}>
                {cancelBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Siparişi iptal et"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {printProps.kind === "marketplace" ? (
            <PrintOrderButton kind="marketplace" source={printProps.source} order={printProps.order} />
          ) : (
            <PrintOrderButton kind="kitchen" order={printProps.order} />
          )}
          <Button type="button" size="sm" variant="ghost" onClick={onToggle}>
            Detay
          </Button>
          {cancellable ? (
            <Button type="button" size="sm" variant="ghost" disabled={cancelBusy} onClick={onCancel}>
              İptal
            </Button>
          ) : null}
        </div>
      )}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}
