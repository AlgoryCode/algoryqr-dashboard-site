"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BranchScopeFilter } from "@/components/dashboard/BranchScopeFilter";
import {
  useDigitalMenuAccess,
  useDigitalMenuSelection,
} from "@/components/dashboard/menu/DigitalMenuPicker";
import { OrderIncomingList } from "@/components/dashboard/order-management/OrderIncomingList";
import { OrderLiveOpsCanvas } from "@/components/dashboard/order-management/OrderLiveOpsCanvas";
import { OrderOpsTracker } from "@/components/dashboard/order-management/OrderOpsTracker";
import { OrderOpsLaneDetail } from "@/components/dashboard/order-management/OrderOpsLaneDetail";
import { OrderPeekSheet } from "@/components/dashboard/order-management/OrderPeekSheet";
import { PhoneOrderEntryDialog } from "@/components/dashboard/order-management/PhoneOrderEntryDialog";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import {
  comparePeriodsFromRange,
  type ChartComparePeriod,
} from "@/components/ui/date-range-filter";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { useBranches } from "@/hooks/use-branches";
import { STORE_QUERY_KEYS, useMyStore, useStoreOrders } from "@/hooks/use-store";
import { handoffErrorMessage, markOrderDeliveredToCustomer } from "@/lib/order-handoff";
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
  overlayStoreKitchenDetails,
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
  listScopedMenuOrders,
  menusInBranchScope,
  parseBranchScope,
  type BranchScope,
} from "@/lib/branch-scope";
import {
  OrderingApiError,
  type OrderResponse,
} from "@/lib/ordering-api";
import { listStoreKitchenQueue } from "@/lib/store-kitchen";
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
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
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
  const [phoneOrderOpen, setPhoneOrderOpen] = useState(false);
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
  const { selection, loading, error } = useDigitalMenuSelection(
    initialQrId,
    canUseWaiterPanel && canUseDigitalMenu && !accessLoading,
  );
  const branchesQuery = useBranches(canUseWaiterPanel && canUseDigitalMenu && !accessLoading);
  const branches = branchesQuery.data?.content ?? [];
  const branchScope = useMemo(() => {
    const parsed = parseBranchScope(searchParams.get("branch"));
    if (parsed === "all" || branchesQuery.isLoading) return parsed;
    return branches.some((branch) => branch.id === parsed) ? parsed : "all";
  }, [branches, branchesQuery.isLoading, searchParams]);
  const setBranchScope = (next: BranchScope) => {
    setQuery({ branch: next === "all" ? null : String(next) });
  };
  const scopedMenus = useMemo(
    () => menusInBranchScope(branches, branchScope),
    [branchScope, branches],
  );
  const scopedMenuKey = scopedMenus.map((menu) => menu.menuId).join(",");
  const kitchenEnabled = useMemo(() => {
    if (branchScope === "all") return anyBranchHasKitchen(branches);
    return isBranchKitchenEnabled(branches.find((item) => item.id === branchScope));
  }, [branchScope, branches]);
  const courierEnabled = useMemo(() => {
    if (branchScope === "all") return anyBranchHasCourier(branches);
    return isBranchCourierEnabled(branches.find((item) => item.id === branchScope));
  }, [branchScope, branches]);
  const phoneMenuId =
    (selection?.menu.menuId != null &&
    scopedMenus.some((menu) => menu.menuId === selection.menu.menuId)
      ? selection.menu.menuId
      : null) ??
    scopedMenus[0]?.menuId ??
    null;
  const hasScope = scopedMenus.length > 0 || branchScope === "all";

  const serveMutation = useMutation({
    mutationFn: (order: OrderResponse) => markOrderDeliveredToCustomer(order.menuId ?? phoneMenuId, order),
    onSuccess: async () => {
      notify("info", "Sipariş müşteriye teslim edildi.");
      setPeekOrder(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["menu-orders-scope"] }),
        queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.orders }),
      ]);
    },
    onError: (error) => {
      notify("danger", handoffErrorMessage(error));
    },
  });
  const markingOrderKey =
    serveMutation.isPending && serveMutation.variables
      ? managedOrderKey(serveMutation.variables)
      : null;

  const ordersQuery = useQuery({
    queryKey: ["menu-orders-scope", scopedMenuKey],
    enabled: scopedMenus.length > 0,
    queryFn: () => listScopedMenuOrders(scopedMenus),
    refetchInterval: 6_000,
  });
  const { merchant, isLoading: storeMerchantLoading, canUseOnlineOrder } = useMyStore();
  const storeOrdersQuery = useStoreOrders({
    from: range.from || undefined,
    to: range.to || undefined,
    page: 0,
    size: 100,
    enabled: Boolean(merchant),
  });
  const storeKitchenQuery = useQuery({
    queryKey: ["store-kitchen-queue"],
    queryFn: listStoreKitchenQueue,
    enabled: Boolean(merchant),
    refetchInterval: 6_000,
  });

  const orders = useMemo(() => {
    const storeOrders = overlayStoreKitchenDetails(
      (storeOrdersQuery.data?.content ?? []).map(storeOrderToManagedOrder),
      storeKitchenQuery.data ?? [],
    );
    const stampedStore =
      branches.length === 1
        ? storeOrders.map((order) => ({ ...order, branchId: order.branchId ?? branches[0].id }))
        : storeOrders;
    return mergeManagedOrders(ordersQuery.data ?? [], stampedStore);
  }, [branches, ordersQuery.data, storeKitchenQuery.data, storeOrdersQuery.data?.content]);

  const dateScopedOrders = useMemo(
    () =>
      filterManagedOrders(orders, {
        from: range.from,
        to: range.to,
        branchId: branchScope === "all" ? "all" : branchScope,
      }),
    [branchScope, orders, range.from, range.to],
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
  const flowLoading = (scopedMenus.length > 0 && ordersQuery.isLoading) || storeOrdersLoading;
  const branchFilter = (
    <BranchScopeFilter branches={branches} value={branchScope} onChange={setBranchScope} />
  );
  const canvasBranchFilter = (
    <BranchScopeFilter
      tone="canvas"
      branches={branches}
      value={branchScope}
      onChange={setBranchScope}
    />
  );
  const peekQrId =
    peekOrder?.menuId != null
      ? (scopedMenus.find((menu) => menu.menuId === peekOrder.menuId)?.qrId ?? selection?.qr.id ?? null)
      : (selection?.qr.id ?? null);

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
      qrId={peekQrId}
      includeTips={includeTips}
      delivering={peekOrder != null && markingOrderKey === managedOrderKey(peekOrder)}
      onMarkServed={(order) => serveMutation.mutate(order)}
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
          onNewOrder={() => setPhoneOrderOpen(true)}
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
          branchFilter={branchFilter}
          loading={flowLoading}
          error={queryErrors}
          emptyMessage={
            hasScope ? "Bu filtrelerle sipariş yok." : "Bu şubede dijital menü yok."
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
          markingOrderKey={markingOrderKey}
          onSelect={setPeekOrder}
          onMarkServed={(order) => serveMutation.mutate(order)}
          branchFilter={branchFilter}
          range={range}
          onRangeChange={(next) => applyRange(next)}
          hasMenu={hasScope}
          loading={flowLoading}
          error={queryErrors}
        />
        {peekSheet}
      </>
    );
  }

  const branchLabel =
    branchScope === "all"
      ? "Tüm şubeler"
      : branches.find((branch) => branch.id === branchScope)?.name?.trim() || "Şube";
  const brandName =
    branchScope === "all"
      ? selection?.menu.businessName?.trim() || "Tüm şubeler"
      : branchLabel;
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
            action={branchFilter}
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
        branchControl={canvasBranchFilter}
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
        onNewOrder={() => setPhoneOrderOpen(true)}
        onLogout={() => {
          void logout();
        }}
        loading={flowLoading}
        error={
          !hasScope ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              Bu şubede dijital menü yok. Tüm akış için şube filtresinden Tüm şubeler’i seçin.{" "}
              <Link href={DASHBOARD_ROUTES.digitalMenu} className="font-semibold underline">
                Menü &amp; Şubeler
              </Link>
            </div>
          ) : (
            queryErrors
          )
        }
      />
      <PhoneOrderEntryDialog
        open={phoneOrderOpen}
        onOpenChange={setPhoneOrderOpen}
        menuId={phoneMenuId}
        merchant={merchant}
        onCreated={() => notify("info", "Telefon siparişi mutfağa iletildi.")}
      />
      {peekSheet}
    </>
  );
}

