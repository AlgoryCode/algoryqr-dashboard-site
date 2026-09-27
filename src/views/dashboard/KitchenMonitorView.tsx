"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { BranchScopeFilter } from "@/components/dashboard/BranchScopeFilter";
import { KitchenDisplayBoard } from "@/components/kitchen/KitchenDisplayBoard";
import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { useKitchenBoardOrders } from "@/hooks/use-kitchen-board-orders";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { useBranches } from "@/hooks/use-branches";
import { STORE_QUERY_KEYS } from "@/hooks/use-store";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import { listScopedKitchenOrders, menusInBranchScope, parseBranchScope } from "@/lib/branch-scope";
import { kitchenOrderKey, mergeKitchenOrders } from "@/lib/kitchen-queue";
import {
  markMerchantKitchenPreparing,
  markMerchantKitchenReady,
  OrderingApiError,
  updateMerchantKitchenNote,
} from "@/lib/ordering-api";
import {
  advanceStoreKitchenOrder,
  isOnlineKitchenSource,
  listStoreKitchenQueue,
} from "@/lib/store-kitchen";

type KitchenMonitorViewProps = {
  backHref?: string;
};

export default function KitchenMonitorView({ backHref }: KitchenMonitorViewProps) {
  const queryClient = useQueryClient();
  const { searchParams, setQuery } = useListQueryState();

  const { accessLoading: waiterAccessLoading, canUseWaiterPanel } = useWaiterPanelAccess();
  const { accessLoading: menuAccessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const accessLoading = waiterAccessLoading || menuAccessLoading;
  const branchesQuery = useBranches(canUseWaiterPanel && canUseDigitalMenu && !accessLoading);
  const branches = branchesQuery.data?.content ?? [];
  const branchScope = useMemo(() => {
    const parsed = parseBranchScope(searchParams.get("branch"));
    if (parsed === "all" || branchesQuery.isLoading) return parsed;
    return branches.some((branch) => branch.id === parsed) ? parsed : "all";
  }, [branches, branchesQuery.isLoading, searchParams]);
  const scopedMenus = useMemo(
    () => menusInBranchScope(branches, branchScope),
    [branchScope, branches],
  );
  const scopedMenuKey = scopedMenus.map((menu) => menu.menuId).join(",");
  const includeStore = branchScope === "all" || branches.length <= 1;

  const queueQuery = useQuery({
    queryKey: ["merchant-kitchen-scope", scopedMenuKey],
    enabled: scopedMenus.length > 0,
    queryFn: () => listScopedKitchenOrders(scopedMenus),
    refetchInterval: 6_000,
  });

  const storeQueueQuery = useQuery({
    queryKey: ["store-kitchen-queue"],
    queryFn: listStoreKitchenQueue,
    enabled: includeStore,
    refetchInterval: 6_000,
  });

  const orders = useMemo(() => {
    const menuOrders = queueQuery.data ?? [];
    if (!includeStore) return menuOrders;
    const storeOrders = (storeQueueQuery.data ?? []).map((order) =>
      branches.length === 1 ? { ...order, branchId: order.branchId ?? branches[0].id } : order,
    );
    return mergeKitchenOrders(menuOrders, storeOrders);
  }, [branches, includeStore, queueQuery.data, storeQueueQuery.data]);
  const boardOrders = useKitchenBoardOrders(orders);

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      orderId: number;
      action: "preparing" | "ready" | "note";
      note?: string;
      orderSource?: string | null;
    }) => {
      if (isOnlineKitchenSource(payload.orderSource)) {
        if (payload.action === "note") return;
        return advanceStoreKitchenOrder(payload.orderId, payload.action);
      }
      const target = (queueQuery.data ?? []).find(
        (order) =>
          order.id === payload.orderId &&
          (payload.orderSource == null || order.orderSource === payload.orderSource),
      );
      const menuId = target?.menuId ?? null;
      if (menuId == null) throw new Error("Menü seçilmedi");
      if (payload.action === "preparing") return markMerchantKitchenPreparing(menuId, payload.orderId, payload.orderSource);
      if (payload.action === "ready") return markMerchantKitchenReady(menuId, payload.orderId, payload.orderSource);
      return updateMerchantKitchenNote(menuId, payload.orderId, payload.note ?? "");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-kitchen-scope"] }),
        queryClient.invalidateQueries({ queryKey: ["store-kitchen-queue"] }),
        queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.orders }),
      ]);
    },
  });

  if (accessLoading || branchesQuery.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title="Mutfak"
          hint="Onaylanan siparişlerin hazırlık takibi"
          back={
            backHref ? (
              <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />
        <DashboardLoadingState label="Mutfak ekranı hazırlanıyor..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title="Mutfak"
        hint="Masa ve online hazırlık kuyruğu — kurye teslimi online sipariş ekranındadır"
        back={
          backHref ? (
            <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : undefined
        }
        action={
          <Button asChild>
            <a href={DASHBOARD_ROUTES.kitchenPanel} target="_blank" rel="noopener noreferrer">
              Mutfak uygulamasını aç
            </a>
          </Button>
        }
      />

      <DashboardFilterBar>
        <BranchScopeFilter
          branches={branches}
          value={branchScope}
          onChange={(next) => setQuery({ branch: next === "all" ? null : String(next) })}
        />
      </DashboardFilterBar>

      {scopedMenus.length === 0 && branchScope !== "all" && orders.length === 0 ? (
        <EmptyState
          title="Bu şubede menü yok"
          description="Mutfak kuyruğu için şube filtresinden Tüm şubeler’i seçin veya bu şubeye menü ekleyin."
        />
      ) : (
        <KitchenDisplayBoard
          orders={boardOrders}
          loading={(scopedMenus.length > 0 && queueQuery.isLoading) || (includeStore && storeQueueQuery.isLoading)}
          error={
            queueQuery.isError
              ? queueQuery.error instanceof OrderingApiError
                ? queueQuery.error.message
                : "Mutfak kuyruğu alınamadı."
              : actionMutation.isError
                ? actionMutation.error instanceof Error
                  ? actionMutation.error.message
                  : "İşlem başarısız."
                : null
          }
          mode="owner"
          busyOrderId={actionMutation.isPending ? actionMutation.variables?.orderId : null}
          busyOrderKey={
            actionMutation.isPending && actionMutation.variables
              ? kitchenOrderKey({
                  id: actionMutation.variables.orderId,
                  orderSource: actionMutation.variables.orderSource,
                })
              : null
          }
          onStartPreparing={(orderId, orderSource) =>
            actionMutation.mutate({ orderId, action: "preparing", orderSource })
          }
          onMarkReady={(orderId, orderSource) => actionMutation.mutate({ orderId, action: "ready", orderSource })}
          onSaveKitchenNote={(orderId, note) => actionMutation.mutate({ orderId, action: "note", note })}
        />
      )}
    </div>
  );
}
