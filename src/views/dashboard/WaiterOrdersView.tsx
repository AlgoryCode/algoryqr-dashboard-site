"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DigitalMenuPicker,
  useDigitalMenuAccess,
  useDigitalMenuSelection,
} from "@/components/dashboard/menu/DigitalMenuPicker";
import { OrderAttentionPanel } from "@/components/dashboard/order-management/OrderAttentionPanel";
import { OrderChartsPanel } from "@/components/dashboard/order-management/OrderChartsPanel";
import { OrderIntegrationFlow } from "@/components/dashboard/order-management/OrderIntegrationFlow";
import { OrderIncomingHistory } from "@/components/dashboard/order-management/OrderIncomingHistory";
import { OrderIncomingList } from "@/components/dashboard/order-management/OrderIncomingList";
import { OrderOpsLaneDetail } from "@/components/dashboard/order-management/OrderOpsLaneDetail";
import { OrderAppLaunchers } from "@/components/dashboard/order-management/OrderOpsNav";
import { OrderOpsTracker } from "@/components/dashboard/order-management/OrderOpsTracker";
import { OrderPeekSheet } from "@/components/dashboard/order-management/OrderPeekSheet";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import {
  comparePeriodsFromRange,
  dateRangeForComparePeriods,
  dateRangeForPreset,
  detectDateRangePreset,
  toggleChartComparePeriod,
  type ChartComparePeriod,
} from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { useBranches } from "@/hooks/use-branches";
import { useMyStore, useStoreOrders } from "@/hooks/use-store";
import { anyBranchHasKitchen } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import {
  OPS_LANE_LABEL,
  ORDER_CHANNELS,
  ORDER_STATUS_FILTER_OPTIONS,
  buildOpsLaneSnapshots,
  buildOrderChartCompare,
  buildOrderKpis,
  delayedOpenOrders,
  filterManagedOrders,
  managedOrderKey,
  mergeManagedOrders,
  needsApprovalOrders,
  opsLaneFromPanel,
  opsLanePanel,
  orderManagementHomeHref,
  orderManagementPanelHref,
  parseOrderManagementPanel,
  sortOrdersNewestFirst,
  sourceEarnings,
  storeOrderToManagedOrder,
  type OpsLane,
  type OrderChannel,
  type OrderStatusFilter,
} from "@/lib/order-management";
import {
  listMerchantOrders,
  OrderingApiError,
  type OrderResponse,
} from "@/lib/ordering-api";
import IntegrationsHubView from "@/views/dashboard/IntegrationsHubView";
import KitchenMonitorView from "@/views/dashboard/KitchenMonitorView";
import OnlineOrderOrdersView from "@/views/dashboard/OnlineOrderOrdersView";
import UberEatsOrdersView from "@/views/dashboard/UberEatsOrdersView";

function parseStatusFilter(value: string | null): OrderStatusFilter {
  return ORDER_STATUS_FILTER_OPTIONS.some((option) => option.value === value)
    ? (value as OrderStatusFilter)
    : "all";
}

function parseChannelFilter(value: string | null): "all" | OrderChannel {
  if (value && ORDER_CHANNELS.includes(value as OrderChannel)) return value as OrderChannel;
  return "all";
}

const OVERVIEW_RANGE_PRESETS: { id: ChartComparePeriod; label: string }[] = [
  { id: "yesterday", label: "Dün" },
  { id: "today", label: "Bugün" },
  { id: "7d", label: "7 gün" },
];

export default function WaiterOrdersView() {
  const { searchParams } = useListQueryState();
  const panel = parseOrderManagementPanel(searchParams.get("panel"));
  const backHref = orderManagementHomeHref(searchParams);
  const opsLane = opsLaneFromPanel(panel);

  if (panel === "kitchen") {
    return <KitchenMonitorView backHref={backHref} />;
  }

  const panelView =
    panel === "online" ? (
      <OnlineOrderOrdersView backHref={backHref} />
    ) : panel === "uber-eats" ? (
      <UberEatsOrdersView backHref={backHref} />
    ) : panel === "integrations" ? (
      <IntegrationsHubView backHref={backHref} />
    ) : (
      <WaiterOrdersHome listMode={panel === "orders"} laneDetail={opsLane} />
    );

  return panelView;
}

function WaiterOrdersHome({
  listMode,
  laneDetail = null,
}: {
  listMode: boolean;
  laneDetail?: OpsLane | null;
}) {
  const router = useRouter();
  const { searchParams, setQuery } = useListQueryState();
  const backHref = orderManagementHomeHref(searchParams);
  const listHref = orderManagementPanelHref(searchParams, "orders");
  const qrFromQuery = Number(searchParams.get("qr"));
  const initialQrId = Number.isFinite(qrFromQuery) && qrFromQuery > 0 ? qrFromQuery : null;
  const [range, setRange] = useState(() => ({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  }));
  const [comparePeriods, setComparePeriods] = useState<ChartComparePeriod[]>(() =>
    comparePeriodsFromRange({
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
    }),
  );
  const [customerQuery, setCustomerQuery] = useState(() => searchParams.get("q") ?? "");
  const [includeTips, setIncludeTips] = useState(() => searchParams.get("tips") === "1");
  const [peekOrder, setPeekOrder] = useState<OrderResponse | null>(null);
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const channelFilter = parseChannelFilter(searchParams.get("channel"));
  const debouncedCustomer = useDebouncedValue(customerQuery);
  const applyRange = (next: { from: string; to: string }, periods?: ChartComparePeriod[]) => {
    setRange(next);
    setComparePeriods(periods ?? comparePeriodsFromRange(next));
    setQuery({ from: next.from || null, to: next.to || null });
  };

  const { accessLoading: waiterAccessLoading, canUseWaiterPanel } = useWaiterPanelAccess();
  const { accessLoading: menuAccessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const accessLoading = waiterAccessLoading || menuAccessLoading;
  const { menuQrs, selection, loading, error, selectQrId } = useDigitalMenuSelection(
    initialQrId,
    canUseWaiterPanel && canUseDigitalMenu && !accessLoading,
  );
  const branchesQuery = useBranches(canUseWaiterPanel && canUseDigitalMenu && !accessLoading);
  const kitchenEnabled = anyBranchHasKitchen(branchesQuery.data?.content);

  const menuId = selection?.menu.menuId ?? null;
  const qrId = selection?.qr.id ?? null;

  const ordersQuery = useQuery({
    queryKey: ["menu-orders", menuId],
    enabled: menuId != null,
    queryFn: () => listMerchantOrders(menuId!, "ALL"),
    refetchInterval: 6_000,
  });
  const { merchant, isLoading: storeMerchantLoading, canUseOnlineOrder } = useMyStore();
  const storeOrdersQuery = useStoreOrders({
    from: range.from || undefined,
    to: range.to || undefined,
    page: 0,
    size: 100,
    enabled: Boolean(merchant) && menuId != null,
  });

  const orders = useMemo(
    () =>
      mergeManagedOrders(
        ordersQuery.data ?? [],
        (storeOrdersQuery.data?.content ?? []).map(storeOrderToManagedOrder),
      ),
    [ordersQuery.data, storeOrdersQuery.data?.content],
  );

  const dateScopedOrders = useMemo(
    () =>
      filterManagedOrders(orders, {
        from: range.from,
        to: range.to,
      }),
    [orders, range.from, range.to],
  );

  const kpis = useMemo(() => buildOrderKpis(dateScopedOrders, includeTips), [dateScopedOrders, includeTips]);
  const chartSeries = useMemo(
    () =>
      buildOrderChartCompare(
        orders,
        includeTips,
        comparePeriods,
        {
          yesterday: dateRangeForPreset("yesterday"),
          today: dateRangeForPreset("today"),
          "7d": dateRangeForPreset("7d"),
        },
        range,
      ),
    [comparePeriods, includeTips, orders, range],
  );
  const sourceStats = useMemo(
    () => sourceEarnings(dateScopedOrders, includeTips),
    [dateScopedOrders, includeTips],
  );
  const laneSnapshots = useMemo(() => buildOpsLaneSnapshots(dateScopedOrders), [dateScopedOrders]);
  const approvalOrders = useMemo(() => needsApprovalOrders(dateScopedOrders), [dateScopedOrders]);
  const delayedOrders = useMemo(() => delayedOpenOrders(dateScopedOrders), [dateScopedOrders]);
  const delayedKeys = useMemo(
    () => new Set(delayedOrders.map((order) => managedOrderKey(order))),
    [delayedOrders],
  );
  const incomingOrders = useMemo(
    () =>
      sortOrdersNewestFirst(
        filterManagedOrders(dateScopedOrders, {
          query: listMode ? debouncedCustomer : undefined,
          status: listMode ? statusFilter : "all",
          channel: listMode ? channelFilter : "all",
        }),
      ),
    [channelFilter, dateScopedOrders, debouncedCustomer, listMode, statusFilter],
  );
  const currency = merchant?.currency || dateScopedOrders[0]?.currency || orders[0]?.currency || "TRY";
  const storeOrdersLoading =
    canUseOnlineOrder && (storeMerchantLoading || (Boolean(merchant) && storeOrdersQuery.isLoading));

  const menuPicker = (
    <div className="w-[13rem] shrink-0">
      <DigitalMenuPicker
        compact
        menuQrs={menuQrs}
        selectedQrId={selection?.qr.id ?? null}
        onSelectQrId={(nextQrId) => {
          void selectQrId(nextQrId);
          if (listMode) {
            setQuery({ qr: String(nextQrId) });
            return;
          }
          router.replace(DASHBOARD_ROUTES.waiterForQr(nextQrId), { scroll: false });
        }}
      />
    </div>
  );

  const queryErrors = (
    <>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ordersQuery.isError ? (
        <p className="text-sm text-destructive">
          {ordersQuery.error instanceof OrderingApiError
            ? ordersQuery.error.message
            : "Siparişler yüklenemedi"}
        </p>
      ) : null}
      {storeOrdersQuery.isError ? (
        <p className="text-sm text-destructive">Online siparişler yüklenemedi</p>
      ) : null}
    </>
  );

  const peekSheet = (
    <OrderPeekSheet
      order={peekOrder}
      qrId={qrId}
      includeTips={includeTips}
      onOpenChange={(open) => {
        if (!open) setPeekOrder(null);
      }}
    />
  );

  const laneBack = laneDetail ? (
    <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
      <ArrowLeft className="h-4 w-4" />
    </Link>
  ) : null;

  if (accessLoading || loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title={laneDetail ? OPS_LANE_LABEL[laneDetail] : listMode ? "Siparişler" : "Sipariş Yönetimi"}
          hint={
            laneDetail
              ? "Takip detayı hazırlanıyor"
              : listMode
                ? "Sipariş listesi hazırlanıyor"
                : "Operasyon özeti hazırlanıyor"
          }
          back={laneBack}
        />
        <DashboardLoadingState label="Yönetici paneli hazırlanıyor..." />
      </div>
    );
  }

  if (listMode) {
    return (
      <>
        <OrderIncomingList
          backHref={backHref}
          orders={incomingOrders}
          includeTips={includeTips}
          delayedKeys={delayedKeys}
          range={range}
          onRangeChange={(next) => {
            applyRange(next);
          }}
          customerQuery={customerQuery}
          onCustomerQueryChange={(next) => {
            setCustomerQuery(next);
            setQuery({ q: next.trim() || null });
          }}
          statusFilter={statusFilter}
          onStatusChange={(next) => setQuery({ status: next === "all" ? null : next })}
          channelFilter={channelFilter}
          onChannelChange={(next) => setQuery({ channel: next === "all" ? null : next })}
          onIncludeTipsChange={(checked) => {
            setIncludeTips(checked);
            setQuery({ tips: checked ? "1" : null });
          }}
          onSelect={setPeekOrder}
          menuPicker={menuPicker}
          loading={Boolean(menuId) && (ordersQuery.isLoading || storeOrdersLoading)}
          error={queryErrors}
          emptyMessage={
            menuId ? "Bu filtrelerle sipariş yok." : "Siparişleri görmek için bir dijital menü seçin."
          }
        />
        {peekSheet}
      </>
    );
  }

  if (laneDetail) {
    return (
      <>
        <OrderOpsLaneDetail
          lane={laneDetail}
          snapshot={laneSnapshots[laneDetail]}
          backHref={backHref}
          includeTips={includeTips}
          delayedKeys={delayedKeys}
          onSelect={setPeekOrder}
          menuPicker={menuPicker}
          range={range}
          onRangeChange={(next) => applyRange(next)}
          hasMenu={menuId != null}
          loading={Boolean(menuId) && (ordersQuery.isLoading || storeOrdersLoading)}
          error={queryErrors}
        />
        {peekSheet}
      </>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title="Sipariş Yönetimi"
        hint="Toplam kazanç, entegrasyonlar ve canlı takip tek bakışta."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {menuPicker}
          {menuId ? (
            <OrderAttentionPanel
              pendingCount={approvalOrders.length}
              onSelectPending={() => setQuery({ panel: "orders", status: "pending" })}
            />
          ) : null}
        </div>
        <OrderAppLaunchers kitchenEnabled={kitchenEnabled} />
      </div>

      {queryErrors}

      {!menuId ? (
        <EmptyState
          title="Menü seçin"
          description="Siparişleri görmek için bir dijital menü seçin."
          action={
            <Button asChild variant="outline">
              <Link href={DASHBOARD_ROUTES.digitalMenu}>Menü & Şubeler</Link>
            </Button>
          }
        />
      ) : ordersQuery.isLoading || storeOrdersLoading ? (
        <DashboardLoadingState label="Siparişler yükleniyor..." />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Henüz sipariş yok"
          description="QR, garson, online ve pazar yeri siparişleri burada toplanır."
          action={
            <Button asChild variant="outline">
              <a href={DASHBOARD_ROUTES.waiterPanel} target="_blank" rel="noopener noreferrer">
                Garson uygulamasını aç
              </a>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.9fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              <OrderIntegrationFlow
                rows={sourceStats.rows}
                total={sourceStats.total}
                currency={currency}
                actions={OVERVIEW_RANGE_PRESETS.map((preset) => {
                  const active = detectDateRangePreset(range) === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => applyRange(dateRangeForPreset(preset.id))}
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              />
              <OrderChartsPanel
                series={chartSeries}
                totalRevenue={kpis.revenue}
                currency={currency}
                includeTips={includeTips}
                comparePeriods={comparePeriods}
                onTogglePeriod={(period) => {
                  const nextPeriods = toggleChartComparePeriod(comparePeriods, period);
                  applyRange(dateRangeForComparePeriods(nextPeriods), nextPeriods);
                }}
              />
            </div>
            <OrderIncomingHistory
              orders={incomingOrders}
              includeTips={includeTips}
              delayedKeys={delayedKeys}
              period={detectDateRangePreset(range)}
              onPeriodChange={(nextPeriod) => {
                applyRange(dateRangeForPreset(nextPeriod));
              }}
              detailsHref={listHref}
              onSelect={setPeekOrder}
            />
          </div>

          <OrderOpsTracker
            snapshots={laneSnapshots}
            detailHref={(lane) => orderManagementPanelHref(searchParams, opsLanePanel(lane))}
          />
        </div>
      )}

      {peekSheet}
    </div>
  );
}

