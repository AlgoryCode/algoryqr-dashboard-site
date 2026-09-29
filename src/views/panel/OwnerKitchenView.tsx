"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { KitchenDisplayBoard } from "@/components/kitchen/KitchenDisplayBoard";
import { isBranchCourierEnabled, isBranchKitchenEnabled, type BranchItem } from "@/lib/branch";
import { listScopedKitchenOrders, menusInBranchScope, ordersForStaffBranch } from "@/lib/branch-scope";
import { kitchenOrderKey } from "@/lib/kitchen-queue";
import {
  applyOrderFlow,
  ORDER_FLOW_ACTION_STATUS,
  stampOrderFlow,
  type OrderFlowAction,
} from "@/lib/order-flow";
import {
  markMerchantKitchenPreparing,
  markMerchantKitchenReady,
  updateMerchantKitchenNote,
  type OrderResponse,
} from "@/lib/ordering-api";
import { advanceStoreKitchenOrder, isOnlineKitchenSource, listStoreKitchenQueue } from "@/lib/store-kitchen";

import { OwnerScreenFrame, OwnerScreenNotice, useOwnerScreenBranch } from "./OwnerScreenFrame";

const OWNER_KITCHEN_QUEUE_KEY = "owner-kitchen-queue";

async function listOwnerKitchenQueue(branches: BranchItem[], branchId: number): Promise<OrderResponse[]> {
  const [menuOrders, storeOrders] = await Promise.all([
    listScopedKitchenOrders(menusInBranchScope(branches, branchId)),
    listStoreKitchenQueue().catch(() => [] as OrderResponse[]),
  ]);
  const byKey = new Map<string, OrderResponse>();
  for (const order of [...menuOrders, ...ordersForStaffBranch(storeOrders, branchId)]) {
    byKey.set(kitchenOrderKey(order), applyOrderFlow(order));
  }
  return [...byKey.values()];
}

async function runOwnerKitchenAction(order: OrderResponse, action: OrderFlowAction): Promise<OrderResponse> {
  const target = ORDER_FLOW_ACTION_STATUS[action];
  if (action !== "markKitchenPreparing" && action !== "markKitchenPrepared") {
    return stampOrderFlow(order, target);
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
  return stampOrderFlow({ ...next, id: order.id }, target);
}

export default function OwnerKitchenView({ initialBranchId }: { initialBranchId: number | null }) {
  const queryClient = useQueryClient();
  const screen = useOwnerScreenBranch("kitchen", initialBranchId, isBranchKitchenEnabled);
  const branch = screen.branch;
  const kitchenEnabled = isBranchKitchenEnabled(branch);

  const queueQuery = useQuery({
    queryKey: [OWNER_KITCHEN_QUEUE_KEY, branch?.id],
    enabled: branch != null && kitchenEnabled,
    queryFn: () => listOwnerKitchenQueue(screen.branches, branch!.id),
    refetchInterval: 6_000,
  });
  const orders = queueQuery.data ?? [];

  const findOrder = (orderId: number, orderSource?: string | null) =>
    orders.find((order) => order.id === orderId && (order.orderSource ?? null) === (orderSource ?? null)) ??
    orders.find((order) => order.id === orderId);

  const action = useMutation({
    mutationFn: async (payload: {
      orderId: number;
      kind: OrderFlowAction | "note";
      orderSource?: string | null;
      note?: string;
    }) => {
      const order = findOrder(payload.orderId, payload.orderSource);
      if (!order) throw new Error("Sipariş bulunamadı");
      if (payload.kind === "note") {
        if (order.menuId == null) throw new Error("Bu siparişe mutfak notu eklenemez");
        return updateMerchantKitchenNote(order.menuId, order.id, payload.note ?? "");
      }
      return runOwnerKitchenAction(order, payload.kind);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [OWNER_KITCHEN_QUEUE_KEY] });
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
        ) : !kitchenEnabled ? (
          <OwnerScreenNotice branch={branch} message="Bu şubede mutfak kapalı. Şube ayarlarından açabilirsiniz." />
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
            kitchenEnabled
            courierEnabled={isBranchCourierEnabled(branch)}
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
            onSaveKitchenNote={(orderId, note) => action.mutate({ orderId, kind: "note", note })}
          />
        )}
      </div>
    </OwnerScreenFrame>
  );
}
