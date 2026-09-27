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
import { OrderIncomingList } from "@/components/dashboard/order-management/OrderIncomingList";
import { OrderLiveOpsCanvas } from "@/components/dashboard/order-management/OrderLiveOpsCanvas";
import { OrderOpsTracker } from "@/components/dashboard/order-management/OrderOpsTracker";
import { OrderOpsLaneDetail } from "@/components/dashboard/order-management/OrderOpsLaneDetail";
import { OrderPeekSheet } from "@/components/dashboard/order-management/OrderPeekSheet";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import {
  comparePeriodsFromRange,
  type ChartComparePeriod,
} from "@/components/ui/date-range-filter";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { useBranches } from "@/hooks/use-branches";
import { useMyStore, useStoreOrders } from "@/hooks/use-store";
import {
  anyBranchHasCourier,
  anyBranchHasKitchen,
  isBranchCourierEnabled,
  isBranchKitchenEnabled,
} from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { resolveMenuLogoUrl } from "@/lib/menu-assets";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import {
  OPS_LANE_LABEL,
  ORDER_CHANNELS,
  ORDER_STATUS_FILTER_OPTIONS,
  buildLiveOpsKpis,
  buildOpsLaneSnapshots,
  delayedOpenOrders,
  filterManagedOrders,
  managedOrderKey,
  mergeManagedOrders,
  opsLaneFromPanel,
  opsLanePanel,
  orderManagementHomeHref,
  orderManagementPanelHref,
  parseOrderManagementPanel,
  sortOrdersNewestFirst,
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
import axios from "axios";

function parseStatusFilter(value: string | null): OrderStatusFilter {
  return ORDER_STATUS_FILTER_OPTIONS.some((option) => option.value === value)
    ? (value as OrderStatusFilter)
    : "all";
}

function orderManagementClassicHref(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("panel");
  next.set("view", "yonetim");
  return `${DASHBOARD_ROUTES.waiter}?${next.toString()}`;
}

function parseChannelFilter(value: string | null): "all" | OrderChannel {
  if (value && ORDER_CHANNELS.includes(value as OrderChannel)) return value as OrderChannel;
  return "all";
}

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
  const ordersHref = orderManagementClassicHref(searchParams);
  const classicView = searchParams.get("view") === "yonetim";
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
  const selectedBranchId = selection?.menu.branchId ?? null;
  const kitchenEnabled = useMemo(() => {
    const branches = branchesQuery.data?.content ?? [];
    if (selectedBranchId != null) {
      const branch = branches.find((item) => item.id === selectedBranchId);
      if (branch) return isBranchKitchenEnabled(branch);
    }
    return anyBranchHasKitchen(branches);
  }, [branchesQuery.data?.content, selectedBranchId]);
  const courierEnabled = useMemo(() => {
    const branches = branchesQuery.data?.content ?? [];
    if (selectedBranchId != null) {
      const branch = branches.find((item) => item.id === selectedBranchId);
      if (branch) return isBranchCourierEnabled(branch);
    }
    return anyBranchHasCourier(branches);
  }, [branchesQuery.data?.content, selectedBranchId]);

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

  const liveKpis = useMemo(
    () => buildLiveOpsKpis(dateScopedOrders, includeTips, kitchenEnabled),
    [dateScopedOrders, includeTips, kitchenEnabled],
  );
  const laneSnapshots = useMemo(
    () => buildOpsLaneSnapshots(dateScopedOrders, kitchenEnabled),
    [dateScopedOrders, kitchenEnabled],
  );
  const delayedOrders = useMemo(() => delayedOpenOrders(dateScopedOrders), [dateScopedOrders]);
  const delayedKeys = useMemo(
    () => new Set(delayedOrders.map((order) => managedOrderKey(order))),
    [delayedOrders],
  );
  const cancelledCount = useMemo(
    () =>
      dateScopedOrders.filter(
        (order) => order.status === "CANCELLED" || order.status === "REJECTED",
      ).length,
    [dateScopedOrders],
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
    if (!listMode && !laneDetail && !classicView) {
      return (
        <OrderLiveOpsCanvas
          branchLabel="Şube seçin"
          kitchenEnabled={false}
          courierEnabled={false}
          currency="TRY"
          kpis={{
            revenue: 0,
            openOrders: 0,
            tableOrders: 0,
            deliveryOrders: 0,
            pickupOrders: 0,
            kitchenAvgMinutes: null,
            kitchenOnTarget: true,
            kitchenTargetMinutes: 16,
            courierOnRoad: 0,
            courierWaiting: 0,
            courierAvgMinutes: null,
            tableOccupancyPercent: null,
            occupiedTables: 0,
            emptyTables: 0,
            totalTables: 0,
          }}
          orders={[]}
          delayedKeys={new Set()}
          cancelledCount={0}
          delayedCount={0}
          detailHref={(lane) => orderManagementPanelHref(searchParams, opsLanePanel(lane))}
          listHref={listHref}
          homeHref={backHref}
          ordersHref={ordersHref}
          brandName="Şube seçin"
          kitchenHref={orderManagementPanelHref(searchParams, "kitchen")}
          onSelectOrder={() => undefined}
          onNewOrder={() => {
            window.open(DASHBOARD_ROUTES.waiterPanel, "_blank", "noopener,noreferrer");
          }}
          onLogout={() => undefined}
          loading
        />
      );
    }
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

  const branchLabel =
    branchesQuery.data?.content?.find((branch) => branch.id === selectedBranchId)?.name?.trim() ||
    selection?.qr.name?.trim() ||
    "Ana Şube";
  const brandName = selection?.menu.businessName?.trim() || branchLabel;
  const brandLogoUrl = resolveMenuLogoUrl(selection?.menu.logoUrl);

  if (classicView) {
    return (
      <>
        <div className="space-y-6 animate-fade-in">
          <DashboardPageHeader
            title="Sipariş Yönetimi"
            hint={brandName}
            back={
              <Link
                href={(() => {
                  const next = new URLSearchParams(searchParams.toString());
                  next.delete("view");
                  next.delete("panel");
                  const query = next.toString();
                  return query ? `${DASHBOARD_ROUTES.waiter}?${query}` : DASHBOARD_ROUTES.waiter;
                })()}
                aria-label="Canlı operasyona dön"
                className={DASHBOARD_BACK}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            }
            action={menuPicker}
          />
          <OrderOpsTracker
            orders={dateScopedOrders}
            snapshots={laneSnapshots}
            kitchenEnabled={kitchenEnabled}
            courierEnabled={courierEnabled}
            delayedKeys={delayedKeys}
            detailHref={(lane) => orderManagementPanelHref(searchParams, opsLanePanel(lane))}
            onSelect={setPeekOrder}
          />
        </div>
        {peekSheet}
      </>
    );
  }

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("algory_user");
    }
    await axios.post("/api/auth/logout", undefined, { withCredentials: true }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <OrderLiveOpsCanvas
        branchLabel={branchLabel}
        kitchenEnabled={kitchenEnabled}
        courierEnabled={courierEnabled}
        currency={currency}
        kpis={liveKpis}
        orders={dateScopedOrders}
        delayedKeys={delayedKeys}
        cancelledCount={cancelledCount}
        delayedCount={delayedOrders.length}
        menuPicker={menuPicker}
        detailHref={(lane) => orderManagementPanelHref(searchParams, opsLanePanel(lane))}
        listHref={listHref}
        homeHref={backHref}
        ordersHref={ordersHref}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
        kitchenHref={
          kitchenEnabled
            ? orderManagementPanelHref(searchParams, "kitchen")
            : backHref
        }
        onSelectOrder={setPeekOrder}
        onNewOrder={() => {
          window.open(DASHBOARD_ROUTES.waiterPanel, "_blank", "noopener,noreferrer");
        }}
        onLogout={() => {
          void logout();
        }}
        loading={Boolean(menuId) && (ordersQuery.isLoading || storeOrdersLoading)}
        error={
          !menuId ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              Siparişleri görmek için üstten bir dijital menü seçin.{" "}
              <Link href={DASHBOARD_ROUTES.digitalMenu} className="font-semibold underline">
                Menü &amp; Şubeler
              </Link>
            </div>
          ) : (
            queryErrors
          )
        }
      />
      {peekSheet}
    </>
  );
}

