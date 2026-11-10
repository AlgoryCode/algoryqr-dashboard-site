"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Info,
  LayoutGrid,
  Loader2,
  Locate,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  UserPlus,
} from "lucide-react";

import type { StoreOrderAction, StoreOrderStatus, StoreOrderSummary } from "@/lib/store-api";
import {
  countOpenStoreOrders,
  groupStoreKanbanOrders,
  isStoreKanbanDelayed,
  matchesStoreKanbanQuery,
  storeKanbanAssignCourier,
  storeKanbanCanReject,
  storeKanbanChipLabel,
  storeKanbanClock,
  storeKanbanInitials,
  storeKanbanPrepProgress,
  storeKanbanPrimaryAction,
  storeKanbanSlaTargetLabel,
  storeKanbanSyncClock,
  storeOrderElapsedMinutes,
  STORE_KANBAN_COLUMNS,
  type StoreKanbanColumnId,
} from "@/lib/store-kanban";
import {
  formatStoreAmount,
  STORE_DELIVERY_TYPE_LABEL,
  STORE_ORDER_STATUS_LABEL,
  STORE_PAYMENT_METHOD_LABEL,
} from "@/lib/store-ui";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

const COLUMN_DOT: Record<StoreKanbanColumnId, string> = {
  NEW: "bg-blue-600",
  KITCHEN: "bg-amber-500",
  TRANSIT: "bg-indigo-600",
  DONE: "bg-emerald-600",
};

type StoreDeliveryKanbanProps = {
  orders: StoreOrderSummary[];
  openCounts?: Partial<Record<StoreOrderStatus, number>>;
  slaMinutes: number;
  storeNo?: number | null;
  branchLocation?: string | null;
  businessName?: string | null;
  storeUrl?: string | null;
  operatorInitials?: string | null;
  live?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  busyOrderId?: number | null;
  lastSyncAt?: number | null;
  backHref?: string;
  onRefresh?: () => void;
  onAdvance?: (orderId: number, action: StoreOrderAction, reason?: string) => void;
  onSwitchToList?: () => void;
  kitchenEnabled?: boolean;
  courierEnabled?: boolean;
};

export function StoreDeliveryKanban({
  orders,
  openCounts = {},
  slaMinutes,
  storeNo,
  branchLocation,
  businessName,
  storeUrl,
  operatorInitials,
  live = true,
  loading = false,
  refreshing = false,
  busyOrderId = null,
  lastSyncAt,
  backHref,
  onRefresh,
  onAdvance,
  onSwitchToList,
  kitchenEnabled = true,
  courierEnabled = true,
}: StoreDeliveryKanbanProps) {
  const [query, setQuery] = useState("");
  const now = useTickingNow(10_000);

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesStoreKanbanQuery(order, query)),
    [orders, query],
  );
  const grouped = useMemo(() => groupStoreKanbanOrders(visibleOrders), [visibleOrders]);
  const delayedCount = useMemo(
    () =>
      now == null
        ? 0
        : visibleOrders.filter((order) => isStoreKanbanDelayed(order, slaMinutes, now)).length,
    [visibleOrders, slaMinutes, now],
  );

  const activeCount = countOpenStoreOrders(openCounts);
  const newCount = (openCounts.PENDING ?? 0) + (openCounts.CONFIRMED ?? 0);
  const preparingCount = (openCounts.PREPARING ?? 0) + (openCounts.READY ?? 0);
  const transitCount = openCounts.ON_THE_WAY ?? grouped.TRANSIT.length;
  const deliveredCount = openCounts.DELIVERED ?? grouped.DONE.length;
  const initials = operatorInitials?.trim() || storeKanbanInitials(businessName);
  const branchBadge =
    storeNo != null
      ? `Şube #${storeNo}${branchLocation ? ` (${branchLocation})` : ""}`
      : branchLocation || businessName || "Şube";
  const syncLabel = storeKanbanSyncClock(lastSyncAt ?? now);

  return (
    <div className="-mx-4 flex min-h-[calc(100svh-8.5rem)] flex-col bg-slate-100 pb-16 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 lg:-mx-6 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                aria-label="Sipariş yönetimine dön"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : null}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-900 text-white shadow-sm dark:border-slate-600">
              <ShoppingBag className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50 md:text-sm">
                  Online Sipariş
                </h1>
                <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {branchBadge}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-normal text-slate-500">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    live ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-emerald-600" : "bg-slate-400")} />
                  {live ? "Sistem Çevrimiçi" : "Mağaza kapalı"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>
                  SLA Hedefi: <strong className="font-semibold text-slate-700 dark:text-slate-200">{slaMinutes} dk</strong>
                </span>
                {syncLabel ? (
                  <>
                    <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">•</span>
                    <span className="hidden sm:inline">Son Senkron: {syncLabel}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToList ? (
              <button
                type="button"
                onClick={onSwitchToList}
                className="hidden items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:inline-flex"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                Görünüm & Filtre
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => downloadKanbanReport(visibleOrders)}
              className="hidden items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:inline-flex"
            >
              <Download className="h-4 w-4 text-slate-500" />
              Rapor İndir
            </button>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                aria-label="Yenile"
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </button>
            ) : null}
            <div className="mx-0.5 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            <button
              type="button"
              aria-label="Bildirimler"
              className="relative flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Bell className="h-4 w-4" />
              {delayedCount > 0 || (openCounts.PENDING ?? 0) > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
              ) : null}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-slate-200 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              {initials}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/80 xl:flex-row xl:items-center">
          <div className="custom-scrollbar flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <KpiPill>
              <span className="font-medium text-slate-500">Toplam Aktif:</span>
              <span className="font-bold text-slate-900 dark:text-slate-50">{activeCount} Sipariş</span>
            </KpiPill>
            <KpiPill>
              <span className="h-2 w-2 rounded-sm bg-blue-600" />
              <span className="font-medium text-slate-500">Yeni Kayıt:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{newCount}</span>
            </KpiPill>
            <KpiPill>
              <span className="h-2 w-2 rounded-sm bg-amber-500" />
              <span className="font-medium text-slate-500">Hazırlanan:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{preparingCount}</span>
            </KpiPill>
            <KpiPill>
              <span className="h-2 w-2 rounded-sm bg-indigo-600" />
              <span className="font-medium text-slate-500">Kuryede:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{transitCount}</span>
            </KpiPill>
            <KpiPill>
              <span className="h-2 w-2 rounded-sm bg-emerald-600" />
              <span className="font-medium text-slate-500">Teslim Edilen:</span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-400">{deliveredCount}</span>
            </KpiPill>
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 shadow-sm",
                delayedCount > 0
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                  : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
              )}
            >
              <AlertTriangle className={cn("h-3.5 w-3.5", delayedCount > 0 ? "text-amber-600" : "text-slate-400")} />
              <span className="font-medium">Termin Riski:</span>
              <span className="font-bold">{delayedCount} Sipariş</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ORD no, cari ünvan veya irsaliye no..."
                className="w-full rounded border border-slate-300 bg-white py-1 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            {storeUrl ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-slate-900 px-3 py-1 text-xs font-semibold tracking-tight text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Sipariş Girişi
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden px-4 py-3">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Siparişler yükleniyor…
          </div>
        ) : (
          <div className="custom-scrollbar flex flex-1 snap-x snap-mandatory flex-row gap-3.5 overflow-x-auto pb-3">
            {STORE_KANBAN_COLUMNS.map((column) => {
              const cards = grouped[column.id];
              return (
                <section
                  key={column.id}
                  className="flex w-[330px] max-h-[calc(100svh-16rem)] shrink-0 snap-start flex-col rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 md:w-[350px]"
                >
                  <div className="flex items-center justify-between rounded-t-md border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-sm", COLUMN_DOT[column.id])} />
                      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                        {column.title}
                      </h2>
                    </div>
                    <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {cards.length}
                    </span>
                  </div>
                  <div className="custom-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
                    {cards.length === 0 ? (
                      <p className="px-1 py-8 text-center text-xs text-slate-500">Bu kolonda sipariş yok.</p>
                    ) : (
                      cards.map((order) => (
                        <KanbanCard
                          key={order.id}
                          order={order}
                          columnId={column.id}
                          slaMinutes={slaMinutes}
                          now={now}
                          busy={busyOrderId === order.id}
                          kitchenEnabled={kitchenEnabled}
                          courierEnabled={courierEnabled}
                          onAdvance={onAdvance}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <nav className="z-20 flex items-center justify-around border-t border-slate-200 bg-white px-4 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <NavItem href={DASHBOARD_ROUTES.onlineOrderOrders} active icon={<LayoutGrid className="h-[18px] w-[18px]" />} label="Operasyon Panosu" />
        <NavItem href={DASHBOARD_ROUTES.onlineOrderCouriers} icon={<Truck className="h-[18px] w-[18px]" />} label="Filo & Kurye" />
        <button
          type="button"
          onClick={onSwitchToList}
          className="flex flex-col items-center justify-center px-3 py-1 text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ScrollText className="h-[18px] w-[18px]" />
          <span className="mt-0.5 text-[11px]">İrsaliye & Fatura</span>
        </button>
        <NavItem href={DASHBOARD_ROUTES.onlineOrder} icon={<BarChart3 className="h-[18px] w-[18px]" />} label="SLA Analitiği" />
        <NavItem href={DASHBOARD_ROUTES.onlineOrderSettings} icon={<Settings className="h-[18px] w-[18px]" />} label="Sistem Yönetimi" />
      </nav>
    </div>
  );
}

function KpiPill({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {children}
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center px-3 py-1 transition-colors",
        active ? "font-semibold text-slate-900 dark:text-slate-50" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
      )}
    >
      {icon}
      <span className="mt-0.5 text-[11px]">{label}</span>
    </Link>
  );
}

function KanbanCard({
  order,
  columnId,
  slaMinutes,
  now,
  busy,
  kitchenEnabled = true,
  courierEnabled = true,
  onAdvance,
}: {
  order: StoreOrderSummary;
  columnId: StoreKanbanColumnId;
  slaMinutes: number;
  now: number | null;
  busy: boolean;
  kitchenEnabled?: boolean;
  courierEnabled?: boolean;
  onAdvance?: (orderId: number, action: StoreOrderAction, reason?: string) => void;
}) {
  const delayed = now != null && isStoreKanbanDelayed(order, slaMinutes, now);
  const elapsedMinutes = now != null ? storeOrderElapsedMinutes(order.createdAt, now) : null;
  const action = storeKanbanPrimaryAction(order, delayed, { kitchenEnabled, courierEnabled });
  const assignCourier = storeKanbanAssignCourier(order, courierEnabled);
  const canReject = storeKanbanCanReject(order);
  const detailHref = DASHBOARD_ROUTES.onlineOrderDetail(order.id);
  const prep =
    order.status === "PREPARING" && now != null
      ? storeKanbanPrepProgress(order.createdAt, slaMinutes, now)
      : null;
  const clock = storeKanbanClock(order.createdAt);
  const slaLabel = now != null ? storeKanbanSlaTargetLabel(order.createdAt, slaMinutes, now) : `${slaMinutes} dk SLA`;
  const chip = storeKanbanChipLabel(order, delayed, elapsedMinutes, prep?.percent);
  const amount = formatStoreAmount(order.totalAmount, order.currency);

  const runAction = (next: StoreOrderAction) => {
    if (!onAdvance) return;
    if (next === "reject" || next === "cancel") {
      const reason = window.prompt("Red gerekçesi");
      if (reason === null) return;
      onAdvance(order.id, next, reason);
      return;
    }
    onAdvance(order.id, next);
  };

  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
        columnId === "DONE" && "opacity-95",
        delayed && "border-amber-200 hover:border-amber-300 dark:border-amber-500/30",
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={detailHref}
            className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          >
            #{order.orderNo}
          </Link>
          <span className={cn("text-[11px] font-normal text-slate-500", delayed && "font-medium text-amber-700")}>
            {columnId === "KITCHEN"
              ? `${order.itemCount} kalem`
              : columnId === "TRANSIT"
                ? `Çıkış: ${clock}`
                : columnId === "DONE"
                  ? `Teslim: ${clock}`
                  : clock}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold",
            delayed
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              : columnId === "NEW"
                ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                : columnId === "KITCHEN"
                  ? order.status === "READY"
                    ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                  : columnId === "TRANSIT"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
          )}
        >
          {delayed ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
          {columnId === "TRANSIT" && !delayed ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
          ) : null}
          {columnId === "DONE" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {chip}
        </span>
      </div>

      <div>
        <div className="text-xs font-bold leading-snug text-slate-900 dark:text-slate-50">{order.customerName}</div>
        <div className="mt-1 flex items-start gap-1 text-[11px] font-normal text-slate-600 dark:text-slate-300">
          {columnId === "KITCHEN" ? (
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          ) : (
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span className="line-clamp-1">{order.customerPhone}</span>
        </div>
      </div>

      {prep ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
            <span className="text-slate-600 dark:text-slate-300">Hazırlık & Paketleme</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Kalan: {prep.remainingMinutes} dk ({prep.percent}%)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-amber-600" style={{ width: `${prep.percent}%` }} />
          </div>
        </div>
      ) : null}

      {columnId === "TRANSIT" && order.courier ? (
        <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
              <Bike className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-50">{order.courier.fullName}</div>
              <div className="text-[10px] text-slate-500">{order.courier.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={`tel:${order.courier.phone}`}
              title="Kurye Arama"
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <Phone className="h-3 w-3" />
            </a>
            <Link
              href={detailHref}
              title="Harita"
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <Locate className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      {columnId === "NEW" || columnId === "DONE" || (columnId === "KITCHEN" && !prep) || (columnId === "TRANSIT" && !order.courier) ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-800/60">
          {columnId === "NEW" ? (
            <>
              <MetricCell label="Sevkiyat Tipi" value={`${STORE_DELIVERY_TYPE_LABEL[order.deliveryType]} / ${order.itemCount} Kalem`} />
              <MetricCell
                label="Hedef SLA / Termin"
                value={slaLabel}
                valueClassName={delayed ? "font-semibold text-amber-800 dark:text-amber-200" : "font-semibold text-slate-900 dark:text-slate-50"}
              />
              <MetricCell label="Ödeme & Cari" value={STORE_PAYMENT_METHOD_LABEL[order.paymentMethod]} />
              <MetricCell label="Fatura Tutarı" value={amount} strong />
            </>
          ) : null}
          {columnId === "KITCHEN" ? (
            <>
              <MetricCell
                label="Kurye Durumu"
                value={assignCourier ? "Atama Bekliyor" : order.courier?.fullName ?? STORE_DELIVERY_TYPE_LABEL[order.deliveryType]}
                valueClassName={assignCourier ? "font-medium text-amber-800 dark:text-amber-200" : undefined}
              />
              <MetricCell label="Planlanan Çıkış" value={slaLabel} strong />
            </>
          ) : null}
          {columnId === "TRANSIT" ? (
            <>
              <MetricCell label="Planlanan SLA" value={delayed ? "Kritik Termin" : slaLabel} strong />
              <MetricCell label="İrsaliye Tutar" value={amount} strong />
            </>
          ) : null}
          {columnId === "DONE" ? (
            <>
              <MetricCell label="Teslim Alan" value={order.customerName} />
              <MetricCell label="Teslim Eden Kurye" value={order.courier?.fullName ?? "Gel-al"} />
              <MetricCell label="Sipariş No" value={`#${order.orderNo}`} mono />
              <MetricCell label="İşlem Tutarı" value={amount} strong />
            </>
          ) : null}
        </div>
      ) : null}

      {columnId === "KITCHEN" && prep ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-800/60">
          <MetricCell label="Durum" value={STORE_ORDER_STATUS_LABEL[order.status]} />
          <MetricCell label="Tahmini Hazır Olma" value={`${prep.remainingMinutes} dk`} strong />
        </div>
      ) : null}

      {columnId === "TRANSIT" && order.courier ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-800/60">
          <MetricCell label="Planlanan SLA" value={delayed ? "Kritik Termin" : slaLabel} strong />
          <MetricCell label="İrsaliye Tutar" value={amount} strong />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1 dark:border-slate-800">
        {columnId === "NEW" ? (
          <Link href={detailHref} className="flex items-center gap-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ScrollText className="h-3.5 w-3.5" />
            İrsaliye Görüntüle
          </Link>
        ) : columnId === "TRANSIT" ? (
          <Link href={detailHref} className="flex items-center gap-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <Info className="h-3.5 w-3.5" />
            Rota Telemetrisi
          </Link>
        ) : columnId === "DONE" ? (
          <span className="text-[10px] text-slate-500">Kayıt arşivlendi</span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{amount}</span>
        )}

        <div className="flex items-center gap-1.5">
          {canReject && onAdvance ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction("reject")}
              className="h-6 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Reddet
            </button>
          ) : null}
          {assignCourier ? (
            <Link
              href={detailHref}
              className="flex h-6 items-center gap-1 rounded bg-blue-700 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-800"
            >
              <UserPlus className="h-3 w-3" />
              Kurye Görevlendir
            </Link>
          ) : action?.action === "markKitchenDeliveredToCourier" ? (
            <Link
              href={detailHref}
              className="flex h-6 items-center rounded bg-blue-700 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-800"
            >
              Kurye seç
            </Link>
          ) : action && onAdvance ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(action.action)}
              className={cn(
                "flex h-6 items-center gap-1 rounded px-2.5 text-[11px] font-medium text-white transition-colors disabled:opacity-50",
                action.action === "deliver" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-900 hover:bg-slate-800",
              )}
            >
              {busy ? "…" : action.label}
              {action.action === "confirm" && !delayed ? <ChevronRight className="h-3 w-3" /> : null}
              {delayed && action.action === "confirm" ? <Check className="h-3 w-3" /> : null}
              {action.action === "deliver" ? <Check className="h-3 w-3" /> : null}
            </button>
          ) : (
            <Link
              href={detailHref}
              className="flex h-6 items-center gap-1 rounded border border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {columnId === "DONE" ? (
                <>
                  <FileText className="h-3 w-3" />
                  POD Görüntüle
                </>
              ) : (
                "Detay Gör"
              )}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function MetricCell({
  label,
  value,
  strong,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div>
      <span className="block text-[10px] font-medium uppercase text-slate-400">{label}</span>
      <span
        className={cn(
          "font-medium text-slate-700 dark:text-slate-200",
          strong && "font-bold text-slate-900 dark:text-slate-50",
          mono && "font-mono text-slate-700",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function downloadKanbanReport(orders: StoreOrderSummary[]) {
  const header = ["Siparis", "Durum", "Musteri", "Telefon", "Tutar", "Kurye", "Tarih"];
  const rows = orders.map((order) => [
    order.orderNo,
    order.status,
    order.customerName,
    order.customerPhone,
    String(order.totalAmount),
    order.courier?.fullName ?? "",
    order.createdAt,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "operasyon-raporu.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function useTickingNow(intervalMs = 15_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
