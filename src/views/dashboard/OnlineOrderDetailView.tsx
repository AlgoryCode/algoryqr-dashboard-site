"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CourierHandoverIllustration } from "@/components/dashboard/store/CourierHandoverIllustration";
import { StoreOrderStatusBadge } from "@/components/dashboard/store/StoreOrderStatusBadge";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { STORE_QUERY_KEYS, useStoreCouriers } from "@/hooks/use-store";
import { ApiError } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  advanceStoreOrder,
  assignStoreCourier,
  getStoreOrder,
  type StoreDeliveryType,
  type StoreOrderAction,
  type StoreOrderDetail,
  type StoreOrderStatus,
} from "@/lib/store-api";
import {
  availableStoreOrderTransitions,
  formatStoreAddress,
  formatStoreAmount,
  formatStoreDateTime,
  formatStoreElapsed,
  storeKitchenFlowIndex,
  storeKitchenFlowSteps,
  STORE_DELIVERY_TYPE_LABEL,
  STORE_ORDER_STATUS_LABEL,
  STORE_PAYMENT_METHOD_LABEL,
} from "@/lib/store-ui";
import { cn } from "@/lib/utils";

const DETAIL_POLL_INTERVAL_MS = 10_000;

export default function OnlineOrderDetailView({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [courierId, setCourierId] = useState<number | null>(null);

  const orderQuery = useQuery({
    queryKey: [...STORE_QUERY_KEYS.orders, "detail", orderId],
    queryFn: () => getStoreOrder(orderId),
    refetchInterval: DETAIL_POLL_INTERVAL_MS,
  });
  const couriersQuery = useStoreCouriers();

  const applyOrder = (updated: StoreOrderDetail) => {
    queryClient.setQueryData([...STORE_QUERY_KEYS.orders, "detail", orderId], updated);
    void queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.orders });
  };

  const reportError = (error: unknown, fallback: string) => {
    notify("danger", error instanceof ApiError ? error.message : fallback);
  };

  const advanceMutation = useMutation({
    mutationFn: ({ action, reason }: { action: StoreOrderAction; reason?: string }) =>
      advanceStoreOrder(orderId, action, reason),
    onSuccess: (updated, variables) => {
      applyOrder(updated);
      if (variables.action === "preparing" || variables.action === "markKitchenPreparing") {
        notify("info", "Sipariş mutfağa gönderildi.");
      }
      if (variables.action === "ready" || variables.action === "markKitchenPrepared") {
        notify("info", "Sipariş hazır işaretlendi.");
      }
      if (
        variables.action === "dispatch" ||
        variables.action === "markCourierTaken" ||
        variables.action === "markKitchenDeliveredToCourier"
      ) {
        notify("info", "Kurye teslimine çıkarıldı.");
      }
    },
    onError: (error) => reportError(error, "Sipariş durumu güncellenemedi."),
  });

  const courierMutation = useMutation({
    mutationFn: (assignedCourierId: number) => assignStoreCourier(orderId, assignedCourierId),
    onSuccess: (updated) => {
      applyOrder(updated);
      notify("info", "Kurye atandı.");
    },
    onError: (error) => reportError(error, "Kurye atanamadı."),
  });

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) {
    return <p className="text-sm text-muted-foreground">Sipariş bulunamadı.</p>;
  }

  const transitions = availableStoreOrderTransitions(order.status, order.deliveryType);
  const couriers = (couriersQuery.data ?? []).filter((courier) => courier.active);
  const kitchenStartedAt =
    order.history.find((event) => event.toStatus === "PREPARING")?.createdAt ||
    order.confirmedAt ||
    order.createdAt;

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title={`Sipariş #${order.orderNo}`}
        hint={formatStoreDateTime(order.createdAt)}
        back={
          <Link href={DASHBOARD_ROUTES.onlineOrderOrders} aria-label="Geri" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={<StoreOrderStatusBadge status={order.status} />}
      />

      <KitchenFlowPanel
        status={order.status}
        deliveryType={order.deliveryType}
        startedAt={kitchenStartedAt}
      />

      {transitions.length > 0 ? (
        <div className={`${DASHBOARD_PANEL} space-y-3`}>
          <div className="flex flex-wrap gap-2">
            {transitions.map((transition) => (
              <Button
                key={transition.action}
                variant={transition.tone === "primary" ? "default" : transition.tone === "danger" ? "destructive" : "outline"}
                disabled={advanceMutation.isPending}
                onClick={() => {
                  if (transition.action === "reject" || transition.action === "cancel") {
                    const reason = window.prompt(`${transition.label} gerekçesi`);
                    if (reason === null) return;
                    advanceMutation.mutate({ action: transition.action, reason });
                    return;
                  }
                  advanceMutation.mutate({ action: transition.action });
                }}
              >
                {transition.label}
              </Button>
            ))}
          </div>
          {order.status === "CONFIRMED" ? (
            <p className="text-xs text-muted-foreground">Onay sonrası sipariş mutfağa gönderilir; hazırlık orada takip edilir.</p>
          ) : null}
          {order.status === "PREPARING" ? (
            <p className="text-xs text-muted-foreground">
              {order.deliveryType === "DELIVERY"
                ? "Mutfak hazırlıyor. Hazır olunca kurye teslimine geçebilirsiniz."
                : "Mutfak hazırlıyor."}
            </p>
          ) : null}
          {order.status === "READY" && order.deliveryType === "DELIVERY" ? (
            <p className="text-xs text-muted-foreground">Mutfak tamamladı. Son adım kurye teslimidir.</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className={`${DASHBOARD_PANEL} space-y-4`}>
          <h2 className="text-sm font-semibold text-foreground">Ürünler</h2>
          <ul className="divide-y divide-border">
            {order.items.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.quantity} × {item.productName}
                  </p>
                  {item.options.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.options.map((option) => option.optionName).join(", ")}
                    </p>
                  ) : null}
                  {item.note ? (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">{item.note}</p>
                  ) : null}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {formatStoreAmount(item.lineTotal, order.currency)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-1 border-t border-border pt-3 text-sm">
            <AmountRow label="Ara toplam" value={formatStoreAmount(order.subtotal, order.currency)} />
            <AmountRow label="Teslimat" value={formatStoreAmount(order.deliveryFee, order.currency)} />
            {order.discountAmount > 0 ? (
              <AmountRow label="İndirim" value={`-${formatStoreAmount(order.discountAmount, order.currency)}`} />
            ) : null}
            <AmountRow
              label="Toplam"
              value={formatStoreAmount(order.totalAmount, order.currency)}
              emphasized
            />
          </dl>

          {order.note ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sipariş notu</p>
              <p className="mt-1 text-sm text-foreground">{order.note}</p>
            </div>
          ) : null}
        </section>

        <div className="space-y-4">
          <section className={`${DASHBOARD_PANEL} space-y-2`}>
            <h2 className="text-sm font-semibold text-foreground">Müşteri</h2>
            <InfoRow label="Kaynak" value="Online" />
            <InfoRow label="Ad" value={order.customerName} />
            <InfoRow label="Telefon" value={order.customerPhone} />
            <InfoRow label="Teslimat" value={STORE_DELIVERY_TYPE_LABEL[order.deliveryType]} />
            <InfoRow label="Ödeme" value={STORE_PAYMENT_METHOD_LABEL[order.paymentMethod]} />
            {order.deliveryType === "DELIVERY" ? (
              <InfoRow label="Adres" value={formatStoreAddress(order.address)} />
            ) : null}
            {order.address.directions ? (
              <InfoRow label="Tarif" value={order.address.directions} />
            ) : null}
          </section>

          {order.deliveryType === "DELIVERY" ? (
            <section
              className={cn(
                DASHBOARD_PANEL,
                "space-y-3",
                order.status === "READY" && "border-primary/40",
              )}
            >
              <h2 className="text-sm font-semibold text-foreground">Kurye teslimi</h2>
              <CourierHandoverIllustration status={order.status} />
              {order.courier ? (
                <p className="text-sm text-foreground">
                  {order.courier.fullName} · {order.courier.phone}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Henüz kurye atanmadı.</p>
              )}
              {couriers.length === 0 ? (
                <Link href={DASHBOARD_ROUTES.onlineOrderCouriers} className="text-sm underline">
                  Önce kurye ekleyin
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    value={courierId ?? order.courier?.id ?? ""}
                    onChange={(event) => setCourierId(event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">Kurye seçin</option>
                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.fullName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={courierMutation.isPending || (courierId ?? order.courier?.id ?? null) == null}
                    onClick={() => {
                      const selected = courierId ?? order.courier?.id ?? null;
                      if (selected == null) return;
                      courierMutation.mutate(selected);
                    }}
                  >
                    Ata
                  </Button>
                </div>
              )}
            </section>
          ) : null}

          <section className={`${DASHBOARD_PANEL} space-y-2`}>
            <h2 className="text-sm font-semibold text-foreground">Durum geçmişi</h2>
            <ol className="space-y-2">
              {order.history.map((event, index) => (
                <li key={index} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {STORE_ORDER_STATUS_LABEL[event.toStatus]}
                  </span>{" "}
                  · {formatStoreDateTime(event.createdAt)}
                  {event.note ? <span className="block">{event.note}</span> : null}
                </li>
              ))}
            </ol>
            {order.rejectReason ? <InfoRow label="Red gerekçesi" value={order.rejectReason} /> : null}
            {order.cancelReason ? <InfoRow label="İptal gerekçesi" value={order.cancelReason} /> : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function AmountRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={emphasized ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>
        {label}
      </dt>
      <dd className={emphasized ? "text-base font-semibold text-foreground" : "text-sm text-foreground"}>
        {value}
      </dd>
    </div>
  );
}

function KitchenFlowPanel({
  status,
  deliveryType,
  startedAt,
}: {
  status: StoreOrderStatus;
  deliveryType: StoreDeliveryType;
  startedAt?: string | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  const steps = storeKitchenFlowSteps(deliveryType);
  const currentIndex = storeKitchenFlowIndex(status, deliveryType);
  const failed = status === "REJECTED" || status === "CANCELLED";
  const showElapsed =
    !failed && (status === "PREPARING" || status === "READY" || status === "ON_THE_WAY");

  useEffect(() => {
    if (!showElapsed) {
      setNow(null);
      return;
    }
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [showElapsed]);

  const elapsed = showElapsed && now != null ? formatStoreElapsed(startedAt, now) : null;

  return (
    <section className={`${DASHBOARD_PANEL} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Mutfak adımları</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            Online
          </span>
          {elapsed ? (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{elapsed}</span>
          ) : null}
        </div>
      </div>
      {failed ? (
        <p className="text-sm font-medium text-destructive">{STORE_ORDER_STATUS_LABEL[status]}</p>
      ) : (
        <ol
          className={cn(
            "grid gap-2 sm:grid-cols-2",
            deliveryType === "DELIVERY" ? "lg:grid-cols-5" : "lg:grid-cols-4",
          )}
        >
          {steps.map((step, index) => {
            const complete = currentIndex > index;
            const current = currentIndex === index;
            return (
              <li
                key={step.status}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2",
                  current
                    ? "border-primary/40 bg-primary/5"
                    : complete
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-muted/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    complete
                      ? "bg-emerald-500 text-white"
                      : current
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    current ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
