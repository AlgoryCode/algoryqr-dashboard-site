"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ordersForStaffBranch } from "@/lib/branch-scope";
import { formatBranchCode } from "@/lib/branch";
import { orderLocationLabel } from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import {
  confirmWaiterOrder,
  listWaiterPendingOrders,
  listWaiterReadyOrders,
  markWaiterOrderServed,
  rejectWaiterOrder,
  WaiterApiError,
} from "@/lib/waiter-api";

import { StaffFrame } from "./StaffFrame";
import { StaffOrderBillSheet } from "./StaffOrderBillSheet";
import { useStaffSession } from "./use-staff-session";

export default function StaffWaiterView() {
  const me = useStaffSession("WAITER");
  const queryClient = useQueryClient();
  const [billOrder, setBillOrder] = useState<OrderResponse | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["staff-waiter-pending"],
    enabled: me != null,
    queryFn: listWaiterPendingOrders,
    refetchInterval: 6_000,
  });
  const readyQuery = useQuery({
    queryKey: ["staff-waiter-ready"],
    enabled: me != null,
    queryFn: listWaiterReadyOrders,
    refetchInterval: 6_000,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff-waiter-pending"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-waiter-ready"] }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (payload: { orderId: number; kind: "confirm" | "reject" | "served" }) => {
      if (payload.kind === "confirm") return confirmWaiterOrder(payload.orderId);
      if (payload.kind === "reject") return rejectWaiterOrder(payload.orderId);
      return markWaiterOrderServed(payload.orderId);
    },
    onSuccess: () => void refresh(),
  });

  if (!me) {
    return <p className="p-8 text-sm text-muted-foreground">Oturum kontrol ediliyor…</p>;
  }

  const error =
    (pendingQuery.error instanceof WaiterApiError && pendingQuery.error.message) ||
    (readyQuery.error instanceof WaiterApiError && readyQuery.error.message) ||
    (action.error instanceof Error ? action.error.message : null);

  return (
    <StaffFrame displayName={me.displayName} role="WAITER" branchId={me.branchId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Garson</h1>
          <p className="text-sm text-muted-foreground">
            Şube {formatBranchCode(me.branchId)} siparişleri. Başka şubenin akışı bu ekranda görünmez.
          </p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <OrderColumn
            title="Bekleyen"
            empty="Bekleyen sipariş yok."
            orders={ordersForStaffBranch(pendingQuery.data ?? [], me.branchId)}
            loading={pendingQuery.isLoading}
            onOpenBill={setBillOrder}
            renderActions={(order) => (
              <>
                <Button
                  size="sm"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ orderId: order.id, kind: "confirm" })}
                >
                  Onayla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ orderId: order.id, kind: "reject" })}
                >
                  Reddet
                </Button>
              </>
            )}
          />
          <OrderColumn
            title="Teslim edilecek"
            empty="Hazır sipariş yok."
            orders={ordersForStaffBranch(readyQuery.data ?? [], me.branchId)}
            loading={readyQuery.isLoading}
            onOpenBill={setBillOrder}
            renderActions={(order) => (
              <Button
                size="sm"
                disabled={action.isPending}
                onClick={() => action.mutate({ orderId: order.id, kind: "served" })}
              >
                Teslim ettim
              </Button>
            )}
          />
        </div>
        <StaffOrderBillSheet
          order={billOrder}
          open={billOrder != null}
          onOpenChange={(next) => {
            if (!next) setBillOrder(null);
          }}
          onBillUpdated={() => void refresh()}
        />
      </div>
    </StaffFrame>
  );
}

function OrderColumn({
  title,
  empty,
  orders,
  loading,
  onOpenBill,
  renderActions,
}: {
  title: string;
  empty: string;
  orders: OrderResponse[];
  loading: boolean;
  onOpenBill: (order: OrderResponse) => void;
  renderActions: (order: OrderResponse) => ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{orders.length}</span>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : null}
      {!loading && orders.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">{orderLocationLabel(order)}</p>
            <p className="text-xs text-muted-foreground">#{order.orderNumber || order.id}</p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {(order.items ?? []).map((item, index) => (
                <li key={`${order.id}-${item.productId}-${index}`}>
                  {item.quantity}× {item.productName || "Ürün"}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {renderActions(order)}
              {order.tableId != null ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpenBill(order)}
                >
                  Adisyon
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
