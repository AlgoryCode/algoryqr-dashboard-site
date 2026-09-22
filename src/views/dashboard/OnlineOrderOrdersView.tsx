"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LayoutGrid, List, Loader2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { StoreDeliveryKanban } from "@/components/dashboard/store/StoreDeliveryKanban";
import { StoreOrdersTable } from "@/components/dashboard/store/StoreOrdersTable";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useNewOrderChime } from "@/hooks/use-new-order-chime";
import { STORE_QUERY_KEYS, useMyStore, useStoreOrders } from "@/hooks/use-store";
import { ApiError } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  advanceStoreOrder,
  type StoreOrderAction,
  type StoreOrderStatus,
  type StoreOrderSummary,
} from "@/lib/store-api";
import { DEFAULT_STORE_SLA_MINUTES } from "@/lib/store-kanban";
import { STORE_ORDER_STATUS_LABEL } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

const OPEN_STATUSES: StoreOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "ON_THE_WAY",
];

const LIST_FILTERS: { id: string; label: string; status?: StoreOrderStatus[] }[] = [
  { id: "open", label: "Aktif", status: OPEN_STATUSES },
  { id: "pending", label: STORE_ORDER_STATUS_LABEL.PENDING, status: ["PENDING"] },
  { id: "delivered", label: STORE_ORDER_STATUS_LABEL.DELIVERED, status: ["DELIVERED"] },
  { id: "closed", label: "İptal / Red", status: ["CANCELLED", "REJECTED"] },
  { id: "all", label: "Tümü" },
];

type OnlineOrderOrdersViewProps = {
  backHref?: string;
};

export default function OnlineOrderOrdersView({ backHref }: OnlineOrderOrdersViewProps) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { merchant, isLoading: merchantLoading, accessLoading } = useMyStore();
  const [mode, setMode] = useState<"kanban" | "list">("kanban");
  const [filterId, setFilterId] = useState("open");
  const [page, setPage] = useState(0);

  const openQuery = useStoreOrders({
    status: OPEN_STATUSES,
    page: 0,
    size: 100,
    enabled: Boolean(merchant) && mode === "kanban",
  });
  const deliveredQuery = useStoreOrders({
    status: ["DELIVERED"],
    page: 0,
    size: 20,
    enabled: Boolean(merchant) && mode === "kanban",
  });

  const filter = LIST_FILTERS.find((entry) => entry.id === filterId) ?? LIST_FILTERS[0];
  const listQuery = useStoreOrders({
    status: filter.status,
    page,
    enabled: Boolean(merchant) && mode === "list",
  });

  const pendingCount =
    openQuery.data?.openCounts?.PENDING ?? listQuery.data?.openCounts?.PENDING ?? 0;
  useNewOrderChime(pendingCount);

  const kanbanOrders = useMemo(
    () => [...(openQuery.data?.content ?? []), ...(deliveredQuery.data?.content ?? [])],
    [openQuery.data?.content, deliveredQuery.data?.content],
  );

  const advanceMutation = useMutation({
    mutationFn: ({
      orderId,
      action,
      reason,
    }: {
      orderId: number;
      action: StoreOrderAction;
      reason?: string;
    }) => advanceStoreOrder(orderId, action, reason),
    onSuccess: (_updated, variables) => {
      void queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.orders });
      if (variables.action === "confirm") notify("info", "Sipariş onaylandı.");
      if (variables.action === "preparing") notify("info", "Sipariş mutfağa gönderildi.");
      if (variables.action === "ready") notify("info", "Sipariş hazır işaretlendi.");
      if (variables.action === "dispatch") notify("info", "Kurye teslimine çıkarıldı.");
      if (variables.action === "deliver") notify("info", "Sipariş teslim edildi.");
      if (variables.action === "reject") notify("info", "Sipariş reddedildi.");
    },
    onError: (error) => {
      notify("danger", error instanceof ApiError ? error.message : "Sipariş durumu güncellenemedi.");
    },
  });

  if (merchantLoading || accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {backHref ? (
          <DashboardPageHeader
            title="Online siparişler"
            hint="Teslimat kanbanı hazırlanıyor."
            back={
              <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            }
          />
        ) : null}
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yükleniyor…
        </div>
      </div>
    );
  }

  if (!merchant) {
    return <SetupPrompt backHref={backHref} />;
  }

  const slaMinutes = merchant.delivery.avgPrepMinutes || DEFAULT_STORE_SLA_MINUTES;
  const branchLocation = [merchant.business.district, merchant.business.city]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
  const listMode = mode === "list";
  const modeToggle = (
    <div className="flex rounded-lg border border-border p-0.5">
      <ModeButton
        active={!listMode}
        onClick={() => setMode("kanban")}
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
        label="Kanban"
      />
      <ModeButton
        active={listMode}
        onClick={() => setMode("list")}
        icon={<List className="h-3.5 w-3.5" />}
        label="Liste"
      />
    </div>
  );

  return (
    <div className={listMode ? "space-y-6 animate-fade-in" : "animate-fade-in"}>
      {listMode ? (
        <DashboardPageHeader
          title="Sipariş Akışı"
          hint="Teslimat kanbanı 10 saniyede bir yenilenir."
          back={
            <Link href={backHref ?? DASHBOARD_ROUTES.onlineOrder} aria-label="Geri" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
          action={modeToggle}
        />
      ) : null}

      {mode === "kanban" ? (
        <StoreDeliveryKanban
          orders={kanbanOrders}
          openCounts={openQuery.data?.openCounts ?? deliveredQuery.data?.openCounts}
          slaMinutes={slaMinutes}
          storeNo={merchant.storeNo}
          branchLocation={branchLocation || merchant.business.businessName}
          businessName={merchant.business.businessName}
          storeUrl={merchant.storeUrl}
          live={merchant.open}
          loading={openQuery.isLoading || deliveredQuery.isLoading}
          refreshing={openQuery.isFetching || deliveredQuery.isFetching}
          busyOrderId={advanceMutation.isPending ? advanceMutation.variables?.orderId : null}
          lastSyncAt={Math.max(openQuery.dataUpdatedAt, deliveredQuery.dataUpdatedAt)}
          backHref={backHref}
          onRefresh={() => {
            void openQuery.refetch();
            void deliveredQuery.refetch();
          }}
          onAdvance={(orderId, action, reason) => advanceMutation.mutate({ orderId, action, reason })}
          onSwitchToList={() => setMode("list")}
        />
      ) : (
        <OrderList
          filterId={filterId}
          onFilter={(id) => {
            setFilterId(id);
            setPage(0);
          }}
          pendingCount={pendingCount}
          loading={listQuery.isLoading}
          orders={listQuery.data?.content ?? []}
          currency={merchant.currency}
          page={page}
          totalPages={listQuery.data?.totalPages ?? 0}
          hasNext={Boolean(listQuery.data?.hasNext)}
          onPage={setPage}
        />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function OrderList({
  filterId,
  onFilter,
  pendingCount,
  loading,
  orders,
  currency,
  page,
  totalPages,
  hasNext,
  onPage,
}: {
  filterId: string;
  onFilter: (id: string) => void;
  pendingCount: number;
  loading: boolean;
  orders: StoreOrderSummary[];
  currency: string;
  page: number;
  totalPages: number;
  hasNext: boolean;
  onPage: (page: number | ((current: number) => number)) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {LIST_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onFilter(entry.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              entry.id === filterId
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-muted/40",
            )}
          >
            {entry.label}
            {entry.id === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Siparişler yükleniyor…
        </div>
      ) : orders.length === 0 ? (
        <div className={`${DASHBOARD_PANEL} text-sm text-muted-foreground`}>
          Bu filtrede sipariş bulunmuyor.
        </div>
      ) : (
        <StoreOrdersTable orders={orders} currency={currency} />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => onPage((current) => Math.max(current - 1, 0))}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Önceki
          </button>
          <span className="text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPage((current) => current + 1)}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      ) : null}
    </>
  );
}

function SetupPrompt({ backHref }: { backHref?: string }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {backHref ? (
        <DashboardPageHeader
          title="Online siparişler"
          hint="Önce mağazanızı kurmanız gerekiyor."
          back={
            <Link href={backHref} aria-label="Sipariş yönetimine dön" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
      ) : null}
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <p className="text-sm text-muted-foreground">Önce mağazanızı kurmanız gerekiyor.</p>
        <Link href={DASHBOARD_ROUTES.onlineOrderSetup} className="text-sm font-medium underline">
          Kurulumu başlat
        </Link>
      </div>
    </div>
  );
}
