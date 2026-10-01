"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { KitchenDisplayBoard } from "@/components/kitchen/KitchenDisplayBoard";
import { isBranchCourierEnabled, isBranchKitchenEnabled, type BranchItem } from "@/lib/branch";
import { listScopedKitchenOrders, menusInBranchScope, ordersForStaffBranch } from "@/lib/branch-scope";
import { kitchenOrderKey } from "@/lib/kitchen-queue";
import {
  applyKitchenOrderFlow,
  forgetOrderFlowStatus,
  ORDER_FLOW_ACTION_STATUS,
  serverReachedStatus,
  type KitchenRevertTarget,
  type OrderCancelRequest,
  type OrderFlowAction,
} from "@/lib/order-flow";
import {
  cancelMerchantOrder,
  markMerchantKitchenPreparing,
  markMerchantKitchenReady,
  markMerchantKitchenServed,
  revertMerchantKitchenOrder,
  updateMerchantKitchenNote,
  type OrderResponse,
} from "@/lib/ordering-api";
import {
  advanceStoreKitchenOrder,
  cancelStoreKitchenOrder,
  deliverStoreKitchenOrder,
  handoverStoreOrderToCourier,
  isOnlineKitchenSource,
  listKitchenCouriers,
  listStoreKitchenQueue,
  revertStoreKitchenOrder,
} from "@/lib/store-kitchen";

import { OwnerScreenFrame, OwnerScreenNotice, useOwnerScreenBranch } from "./OwnerScreenFrame";

const OWNER_KITCHEN_QUEUE_KEY = "owner-kitchen-queue";
const OWNER_KITCHEN_COURIERS_KEY = "owner-kitchen-couriers";

async function listOwnerKitchenQueue(branches: BranchItem[], branchId: number): Promise<OrderResponse[]> {
  const [menuOrders, storeOrders] = await Promise.all([
    listScopedKitchenOrders(menusInBranchScope(branches, branchId)),
    listStoreKitchenQueue().catch(() => [] as OrderResponse[]),
  ]);
  const byKey = new Map<string, OrderResponse>();
  for (const order of [...menuOrders, ...ordersForStaffBranch(storeOrders, branchId)]) {
    byKey.set(kitchenOrderKey(order), applyKitchenOrderFlow(order));
  }
  return [...byKey.values()];
}

async function runOwnerKitchenAction(order: OrderResponse, action: OrderFlowAction): Promise<OrderResponse> {
  const target = ORDER_FLOW_ACTION_STATUS[action];
  if (action === "markWaiterDeliveredToCustomer") {
    if (isOnlineKitchenSource(order.orderSource)) return deliverStoreKitchenOrder(order.id);
    if (order.menuId == null) throw new Error("Sipariş güncellenemedi");
    const served = await markMerchantKitchenServed(order.menuId, order.id);
    if (!serverReachedStatus(served.status, "DELIVERED")) throw new Error("Sipariş güncellenemedi");
    forgetOrderFlowStatus(order.id);
    return { ...served, id: order.id };
  }
  if (action !== "markKitchenPreparing" && action !== "markKitchenPrepared" && action !== "markReady") {
    throw new Error("Bu adım kaydedilemedi");
  }
  const step = action === "markKitchenPreparing" ? "preparing" : "ready";
  if (isOnlineKitchenSource(order.orderSource)) {
    return advanceStoreKitchenOrder(order.id, step);
  }
  if (order.menuId == null) {
    throw new Error("Sipariş güncellenemedi");
  }
  const next =
    step === "preparing"
      ? await markMerchantKitchenPreparing(order.menuId, order.id, order.orderSource)
      : await markMerchantKitchenReady(order.menuId, order.id, order.orderSource);
  if (!serverReachedStatus(next.status, target)) {
    throw new Error("Sipariş güncellenemedi");
  }
  forgetOrderFlowStatus(order.id);
  return { ...next, id: order.id };
}

async function cancelOwnerKitchenOrder(order: OrderResponse, request: OrderCancelRequest): Promise<OrderResponse> {
  if (isOnlineKitchenSource(order.orderSource)) {
    return cancelStoreKitchenOrder(order.id, request);
  }
  if (order.menuId == null) {
    throw new Error("Sipariş iptal edilemedi");
  }
  return cancelMerchantOrder(order.menuId, order.id, request);
}

async function revertOwnerKitchenOrder(order: OrderResponse, to: KitchenRevertTarget): Promise<OrderResponse> {
  if (isOnlineKitchenSource(order.orderSource)) {
    return revertStoreKitchenOrder(order.id, to);
  }
  if (order.menuId == null) {
    throw new Error("Sipariş geri alınamadı");
  }
  return revertMerchantKitchenOrder(order.menuId, order.id, to, order.orderSource);
}

export default function OwnerKitchenView({ initialBranchId }: { initialBranchId: number | null }) {
  const queryClient = useQueryClient();
  const screen = useOwnerScreenBranch("kitchen", initialBranchId, isBranchKitchenEnabled);
  const branch = screen.branch;
  const kitchenEnabled = isBranchKitchenEnabled(branch);

  const queueQuery = useQuery({
    queryKey: [OWNER_KITCHEN_QUEUE_KEY, branch?.id],
    enabled: branch != null,
    queryFn: () => listOwnerKitchenQueue(screen.branches, branch!.id),
    refetchInterval: 6_000,
  });
  const orders = queueQuery.data ?? [];
  const courierEnabled = isBranchCourierEnabled(branch);

  const couriersQuery = useQuery({
    queryKey: [OWNER_KITCHEN_COURIERS_KEY, branch?.id],
    enabled: branch != null && courierEnabled,
    queryFn: () => listKitchenCouriers(branch!.id),
    refetchInterval: 15_000,
  });

  const findOrder = (orderId: number, orderSource?: string | null) =>
    orders.find((order) => order.id === orderId && (order.orderSource ?? null) === (orderSource ?? null)) ??
    orders.find((order) => order.id === orderId);

  const action = useMutation({
    mutationFn: async (payload: {
      orderId: number;
      kind: OrderFlowAction | "note" | "revert" | "cancel" | "courier";
      orderSource?: string | null;
      note?: string;
      revertTo?: KitchenRevertTarget;
      cancel?: OrderCancelRequest;
      courierStaffId?: number;
    }) => {
      const order = findOrder(payload.orderId, payload.orderSource);
      if (!order) throw new Error("Sipariş bulunamadı");
      if (payload.kind === "courier") {
        if (payload.courierStaffId == null) throw new Error("Kurye seçilmedi");
        return handoverStoreOrderToCourier(order.id, payload.courierStaffId);
      }
      if (payload.kind === "note") {
        if (order.menuId == null) throw new Error("Bu siparişe mutfak notu eklenemez");
        return updateMerchantKitchenNote(order.menuId, order.id, payload.note ?? "");
      }
      if (payload.kind === "revert") {
        return revertOwnerKitchenOrder(order, payload.revertTo ?? "CONFIRMED");
      }
      if (payload.kind === "cancel") {
        return cancelOwnerKitchenOrder(order, payload.cancel ?? { reason: "OTHER" });
      }
      return runOwnerKitchenAction(order, payload.kind);
    },
    onSuccess: (_updated, payload) => {
      void queryClient.invalidateQueries({ queryKey: [OWNER_KITCHEN_QUEUE_KEY] });
      if (payload.kind === "courier") {
        void queryClient.invalidateQueries({ queryKey: [OWNER_KITCHEN_COURIERS_KEY] });
      }
    },
  });

  return (
    <OwnerScreenFrame
      title="Mutfak"
      branches={screen.branches}
      branch={branch}
      onBranchChange={screen.selectBranch}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Mutfak</h1>
          <p className="text-sm text-muted-foreground">
            {branch ? `${branch.name} hazırlık kuyruğu` : "Hazırlık kuyruğu"}
          </p>
        </div>
        {screen.loading ? (
          <p className="text-sm text-muted-foreground">Şubeler yükleniyor…</p>
        ) : screen.error ? (
          <OwnerScreenNotice branch={null} message={screen.error} />
        ) : !branch ? (
          <OwnerScreenNotice branch={null} message="Henüz şube bulunmuyor." />
        ) : (
          <KitchenDisplayBoard
            orders={orders}
            loading={queueQuery.isLoading}
            error={
              queueQuery.error instanceof Error
                ? queueQuery.error.message
                : action.error instanceof Error
                  ? action.error.message
                  : null
            }
            mode="kitchen"
            kitchenEnabled={kitchenEnabled}
            courierEnabled={courierEnabled}
            couriers={couriersQuery.data}
            onCourierHandover={(order, courierStaffId) =>
              action.mutate({ orderId: order.id, kind: "courier", orderSource: order.orderSource, courierStaffId })
            }
            busyOrderId={action.isPending ? action.variables?.orderId : null}
            busyOrderKey={
              action.isPending && action.variables
                ? kitchenOrderKey({
                    id: action.variables.orderId,
                    orderSource: action.variables.orderSource,
                  })
                : null
            }
            onFlowAction={(orderId, kind, orderSource) => action.mutate({ orderId, kind, orderSource })}
            onRevert={(orderId, revertTo, orderSource) =>
              action.mutate({ orderId, kind: "revert", revertTo, orderSource })
            }
            onCancel={(orderId, cancel, orderSource) =>
              action.mutate({ orderId, kind: "cancel", cancel, orderSource })
            }
            onSaveKitchenNote={(orderId, note) => action.mutate({ orderId, kind: "note", note })}
          />
        )}
      </div>
    </OwnerScreenFrame>
  );
}
