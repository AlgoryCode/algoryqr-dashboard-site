"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { KitchenDisplayBoard } from "@/components/kitchen/KitchenDisplayBoard";
import { useKitchenBoardOrders } from "@/hooks/use-kitchen-board-orders";
import { ordersForStaffBranch } from "@/lib/branch-scope";
import { formatBranchCode } from "@/lib/branch";
import { kitchenOrderKey } from "@/lib/kitchen-queue";
import { advanceStoreKitchenOrder, isOnlineKitchenSource } from "@/lib/store-kitchen";
import {
  listKitchenQueue,
  markKitchenPreparing,
  markKitchenReady,
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
      kind: "preparing" | "ready" | "note";
      orderSource?: string | null;
      note?: string;
    }) => {
      if (isOnlineKitchenSource(payload.orderSource)) {
        if (payload.kind === "note") return;
        return advanceStoreKitchenOrder(payload.orderId, payload.kind);
      }
      if (payload.kind === "preparing") return markKitchenPreparing(payload.orderId, payload.orderSource);
      if (payload.kind === "ready") return markKitchenReady(payload.orderId, payload.orderSource);
      return updateKitchenOrderNote(payload.orderId, payload.note ?? "");
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
          busyOrderId={action.isPending ? action.variables?.orderId : null}
          busyOrderKey={
            action.isPending && action.variables
              ? kitchenOrderKey({
                  id: action.variables.orderId,
                  orderSource: action.variables.orderSource,
                })
              : null
          }
          onStartPreparing={(orderId, orderSource) =>
            action.mutate({ orderId, kind: "preparing", orderSource })
          }
          onMarkReady={(orderId, orderSource) => action.mutate({ orderId, kind: "ready", orderSource })}
          onSaveKitchenNote={(orderId, note) => action.mutate({ orderId, kind: "note", note })}
        />
      </div>
    </StaffFrame>
  );
}
