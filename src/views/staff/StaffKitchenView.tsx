"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { KitchenDisplayBoard } from "@/components/kitchen/KitchenDisplayBoard";
import { useKitchenBoardOrders } from "@/hooks/use-kitchen-board-orders";
import { ordersForStaffBranch } from "@/lib/branch-scope";
import { formatBranchCode } from "@/lib/branch";
import { kitchenOrderKey } from "@/lib/kitchen-queue";
import type { KitchenRevertTarget, OrderCancelRequest, OrderFlowAction } from "@/lib/order-flow";
import {
  advanceStoreKitchenOrder,
  cancelStoreKitchenOrder,
  isOnlineKitchenSource,
  revertStoreKitchenOrder,
} from "@/lib/store-kitchen";
import {
  cancelKitchenOrder,
  listKitchenQueue,
  markKitchenDeliveredToCourier,
  markKitchenDeliveredToWaiter,
  markKitchenPrepared,
  markKitchenPreparing,
  revertKitchenOrder,
  updateKitchenOrderNote,
  WaiterApiError,
} from "@/lib/waiter-api";

import { StaffFrame } from "./StaffFrame";
import { useStaffSession } from "./use-staff-session";

export default function StaffKitchenView() {
  const me = useStaffSession("KITCHEN");
  const queryClient = useQueryClient();
  const queueQuery = useQuery({
    queryKey: ["staff-kitchen-queue"],
    enabled: me != null,
    queryFn: listKitchenQueue,
    refetchInterval: 6_000,
  });
  const branchOrders = useMemo(
    () => (me ? ordersForStaffBranch(queueQuery.data ?? [], me.branchId) : []),
    [me, queueQuery.data],
  );
  const orders = useKitchenBoardOrders(branchOrders);

  const action = useMutation({
    mutationFn: async (payload: {
      orderId: number;
      kind: OrderFlowAction | "note" | "revert" | "cancel";
      orderSource?: string | null;
      note?: string;
      revertTo?: KitchenRevertTarget;
      cancel?: OrderCancelRequest;
    }) => {
      if (payload.kind === "note") {
        return updateKitchenOrderNote(payload.orderId, payload.note ?? "");
      }
      if (payload.kind === "cancel") {
        const request = payload.cancel ?? { reason: "OTHER" };
        return isOnlineKitchenSource(payload.orderSource)
          ? cancelStoreKitchenOrder(payload.orderId, request)
          : cancelKitchenOrder(payload.orderId, request, payload.orderSource);
      }
      if (payload.kind === "revert") {
        const to = payload.revertTo ?? "CONFIRMED";
        return isOnlineKitchenSource(payload.orderSource)
          ? revertStoreKitchenOrder(payload.orderId, to)
          : revertKitchenOrder(payload.orderId, to, payload.orderSource);
      }
      if (isOnlineKitchenSource(payload.orderSource)) {
        if (payload.kind === "markKitchenPreparing") {
          return advanceStoreKitchenOrder(payload.orderId, "preparing");
        }
        if (payload.kind === "markKitchenPrepared") {
          return advanceStoreKitchenOrder(payload.orderId, "ready");
        }
      }
      if (payload.kind === "markKitchenPreparing") {
        return markKitchenPreparing(payload.orderId, payload.orderSource);
      }
      if (payload.kind === "markKitchenPrepared") {
        return markKitchenPrepared(payload.orderId, payload.orderSource);
      }
      if (payload.kind === "markKitchenDeliveredToCourier") {
        return markKitchenDeliveredToCourier(payload.orderId);
      }
      return markKitchenDeliveredToWaiter(payload.orderId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff-kitchen-queue"] });
    },
  });

  if (!me) {
    return <p className="p-8 text-sm text-muted-foreground">Oturum kontrol ediliyor…</p>;
  }

  return (
    <StaffFrame displayName={me.displayName} role="KITCHEN" branchId={me.branchId}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Mutfak</h1>
          <p className="text-sm text-muted-foreground">
            Şube {formatBranchCode(me.branchId)} hazırlık kuyruğu
          </p>
        </div>
        <KitchenDisplayBoard
          orders={orders}
          loading={queueQuery.isLoading}
          error={
            queueQuery.error instanceof WaiterApiError
              ? queueQuery.error.message
              : action.error instanceof Error
                ? action.error.message
                : null
          }
          mode="kitchen"
          kitchenEnabled={me.kitchenEnabled !== false}
          courierEnabled={me.courierEnabled !== false}
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
      </div>
    </StaffFrame>
  );
}
