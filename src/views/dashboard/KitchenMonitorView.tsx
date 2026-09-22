"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { KitchenDisplayBoard } from "@/components/kitchen/KitchenDisplayBoard";
import {
  DigitalMenuPicker,
  useDigitalMenuAccess,
  useDigitalMenuSelection,
} from "@/components/dashboard/menu/DigitalMenuPicker";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { STORE_QUERY_KEYS } from "@/hooks/use-store";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import { kitchenOrderKey, mergeKitchenOrders } from "@/lib/kitchen-queue";
import {
  listMerchantKitchenQueue,
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { searchParams, setQuery } = useListQueryState();
  const qrFromQuery = Number(searchParams.get("qr"));
  const initialQrId = Number.isFinite(qrFromQuery) && qrFromQuery > 0 ? qrFromQuery : null;

  const { accessLoading: waiterAccessLoading, canUseWaiterPanel } = useWaiterPanelAccess();
  const { accessLoading: menuAccessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const accessLoading = waiterAccessLoading || menuAccessLoading;
  const { menuQrs, selection, loading, error, selectQrId } = useDigitalMenuSelection(
    initialQrId,
    canUseWaiterPanel && canUseDigitalMenu && !accessLoading,
  );

  const menuId = selection?.menu.menuId ?? null;

  const queueQuery = useQuery({
    queryKey: ["merchant-kitchen-queue", menuId],
    enabled: menuId != null,
    queryFn: () => listMerchantKitchenQueue(menuId!),
    refetchInterval: 6_000,
  });

  const storeQueueQuery = useQuery({
    queryKey: ["store-kitchen-queue"],
    queryFn: listStoreKitchenQueue,
    refetchInterval: 6_000,
  });

  const orders = useMemo(
    () => mergeKitchenOrders(queueQuery.data ?? [], storeQueueQuery.data ?? []),
    [queueQuery.data, storeQueueQuery.data],
  );

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
      if (menuId == null) throw new Error("Menü seçilmedi");
      if (payload.action === "preparing") return markMerchantKitchenPreparing(menuId, payload.orderId, payload.orderSource);
      if (payload.action === "ready") return markMerchantKitchenReady(menuId, payload.orderId, payload.orderSource);
      return updateMerchantKitchenNote(menuId, payload.orderId, payload.note ?? "");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-kitchen-queue", menuId] }),
        queryClient.invalidateQueries({ queryKey: ["store-kitchen-queue"] }),
        queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.orders }),
      ]);
    },
  });

  if (accessLoading || loading) {
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
        <DigitalMenuPicker
          menuQrs={menuQrs}
          selectedQrId={selection?.qr.id ?? null}
          onSelectQrId={(nextQrId) => {
            void selectQrId(nextQrId);
            if (backHref) {
              setQuery({ qr: String(nextQrId) });
              return;
            }
            router.replace(DASHBOARD_ROUTES.kitchenMonitorForQr(nextQrId), { scroll: false });
          }}
        />
      </DashboardFilterBar>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!menuId && orders.length === 0 && !storeQueueQuery.isLoading ? (
        <EmptyState
          title="Menü seçin"
          description="Mutfak kuyruğunu görmek için bir menü seçin."
        />
      ) : (
        <KitchenDisplayBoard
          orders={orders}
          loading={(menuId != null && queueQuery.isLoading) || storeQueueQuery.isLoading}
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
