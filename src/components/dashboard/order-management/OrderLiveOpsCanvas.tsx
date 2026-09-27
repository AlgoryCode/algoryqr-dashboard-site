"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  formatMenuPrice,
} from "@/components/menu-templates/types";
import {
  courierChannelCounts,
  formatOrderWhenCompact,
  groupOpsLaneOrders,
  groupSalonByWaiter,
  salonTableOrderStatusLabel,
  hourlyOrderSeries,
  isDeliveryOrder,
  managedOrderKey,
  orderAmount,
  orderChannel,
  type OrderChannel,
  ORDER_CHANNEL_LABEL,
  orderLocationLabel,
  orderStatusLabel,
  salonBoardOrders,
  restaurantLayoutFromOrderManagementHref,
  tableStatusTone,
  topProductShares,
  type LiveOpsKpiSnapshot,
  type OpsLane,
} from "@/lib/order-management";
import {
  isKitchenTicketDelayed,
  kitchenElapsedMinutes,
  KITCHEN_KANBAN_SLA_MINUTES,
} from "@/lib/kitchen-queue";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import type { OrderResponse } from "@/lib/ordering-api";
import { cn } from "@/lib/utils";

type OrderLiveOpsCanvasProps = {
  branchLabel: string;
  branchControl?: ReactNode;
  kitchenEnabled: boolean;
  courierEnabled: boolean;
  currency: string;
  kpis: LiveOpsKpiSnapshot;
  orders: OrderResponse[];
  delayedKeys: Set<string>;
  cancelledCount: number;
  delayedCount: number;
  menuPicker?: ReactNode;
  detailHref: (lane: OpsLane) => string;
  listHref: string;
  homeHref: string;
  ordersHref: string;
  kitchenHref: string;
  brandName: string;
  brandLogoUrl?: string | null;
  onSelectOrder: (order: OrderResponse) => void;
  onNewOrder: () => void;
  onLogout: () => void;
  loading?: boolean;
  error?: ReactNode;
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "material-symbols-outlined inline-block shrink-0 overflow-hidden align-middle leading-none",
        className,
      )}
      aria-hidden
    >
      {name}
    </span>
  );
}

const KPI_TONE = {
  orange: "bg-[#ffdf99]/80 text-[#775a00]",
  sky: "bg-[#ffdad4]/70 text-[#930001]",
  emerald: "bg-emerald-50 text-emerald-600",
} as const;

const TOP_NAV_LINK =
  "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-none transition-colors";

function topNavLinkClass(active: boolean) {
  return cn(
    TOP_NAV_LINK,
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

const SIDE_NAV_LINK =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors";

function sideNavLinkClass(active: boolean) {
  return cn(
    SIDE_NAV_LINK,
    active
      ? "bg-primary font-semibold text-primary-foreground"
      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

function KpiCard({
  label,
  icon,
  tone,
  children,
  footer,
}: {
  label: string;
  icon: string;
  tone: keyof typeof KPI_TONE;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</h3>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", KPI_TONE[tone])}>
          <Icon name={icon} className="text-[18px]" />
        </span>
      </header>
      <div className="flex flex-1 flex-col px-4 pb-3 pt-3">{children}</div>
      <footer className="mt-auto flex min-h-[76px] flex-col justify-center border-t border-border bg-muted/30 px-4 py-3">
        {footer}
      </footer>
    </article>
  );
}

function KpiValue({
  value,
  suffix,
  caption,
}: {
  value: ReactNode;
  suffix?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <>
      <div className="flex items-baseline gap-1.5">
        <p className="font-epilogue text-[32px] font-extrabold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {suffix ? <span className="text-[12px] font-medium text-muted-foreground">{suffix}</span> : null}
      </div>
      {caption ? <div className="mt-2 text-[12px] leading-5">{caption}</div> : null}
    </>
  );
}

export function OrderLiveOpsCanvas({
  branchLabel,
  branchControl,
  kitchenEnabled,
  courierEnabled,
  currency,
  kpis,
  orders,
  delayedKeys,
  cancelledCount,
  delayedCount,
  menuPicker,
  detailHref,
  listHref,
  homeHref,
  ordersHref,
  kitchenHref,
  brandName,
  brandLogoUrl,
  onSelectOrder,
  onNewOrder,
  onLogout,
  loading,
  error,
}: OrderLiveOpsCanvasProps) {
  const [courierChannel, setCourierChannel] = useState<OrderChannel | null>(null);
  const salonOrders = salonBoardOrders(orders, kitchenEnabled);
  const waiterGroups = groupSalonByWaiter(salonOrders, { waiterIndexOrders: orders });
  const lanes = groupOpsLaneOrders(orders, kitchenEnabled);
  const kitchenTickets = kitchenEnabled
    ? [
        ...lanes.kitchen,
        ...orders.filter((o) => o.status === "READY" && !isDeliveryOrder(o)),
      ]
    : [];
  const preparing = kitchenTickets.filter((o) => o.status !== "READY");
  const courierLane = lanes.courier;
  const courierTickets = courierChannel
    ? courierLane.filter((order) => orderChannel(order) === courierChannel)
    : courierLane;
  const channels = courierChannelCounts(orders);
  const products = topProductShares(orders, 5);
  const hourly = hourlyOrderSeries(orders).slice(12, 23);
  const maxHourly = Math.max(1, ...hourly.map((h) => h.orders));
  const peak = hourly.reduce((best, point) => (point.orders > best.orders ? point : best), hourly[0] ?? {
    hour: "19:00",
    orders: 0,
    revenue: 0,
  });
  const currentHour = new Date().getHours();
  const matrix = salonOrders.slice(0, 6);
  const revenueTarget = Math.max(Math.round(kpis.revenue * 1.13), Math.round(kpis.revenue) + 1);
  const revenuePct = revenueTarget > 0 ? Math.min(100, (kpis.revenue / revenueTarget) * 100) : 0;
  const fleetActivePct =
    kpis.courierOnRoad + kpis.courierWaiting > 0
      ? Math.round((kpis.courierOnRoad / (kpis.courierOnRoad + kpis.courierWaiting)) * 100)
      : 0;

  const topNav = [
    { label: "Canlı Operasyon", short: "Canlı", icon: "bolt", href: homeHref, active: true },
    { label: "KDS İstasyon", short: "KDS", icon: "skillet", href: kitchenHref, active: false, hide: !kitchenEnabled },
    { label: "Sipariş Akışı", short: "Akış", icon: "receipt_long", href: listHref, active: false },
    { label: "Masa & Kat", short: "Masa", icon: "table_restaurant", href: restaurantLayoutFromOrderManagementHref(homeHref), active: false },
    { label: "Garson Takibi", short: "Garson", icon: "person_apron", href: detailHref("waiter"), active: false },
    { label: "Kurye Filosu", short: "Kurye", icon: "two_wheeler", href: detailHref("courier"), active: false, hide: !courierEnabled },
    { label: "Finans & Rapor", short: "Finans", icon: "analytics", href: DASHBOARD_ROUTES.reportsHub, active: false },
  ].filter((item) => !item.hide);

  const sideNav = [
    { label: "Canlı İzleme", icon: "dashboard", href: homeHref, active: true },
    { label: "Mutfak KDS", icon: "skillet", href: kitchenHref, active: false, hide: !kitchenEnabled },
    { label: "Kat Planı", icon: "table_restaurant", href: restaurantLayoutFromOrderManagementHref(homeHref), active: false },
    { label: "Kurye Takip", icon: "two_wheeler", href: detailHref("courier"), active: false, hide: !courierEnabled },
    { label: "Envanter", icon: "inventory_2", href: DASHBOARD_ROUTES.stock, active: false },
    { label: "Ayarlar", icon: "tune", href: DASHBOARD_ROUTES.account, active: false },
  ].filter((item) => !item.hide);

  const opsColumnCount = 1 + Number(kitchenEnabled) + Number(courierEnabled);
  const opsColClass =
    opsColumnCount === 1 ? "lg:col-span-12" : opsColumnCount === 2 ? "lg:col-span-6" : "lg:col-span-4";
  const kpiCount = 3 + Number(kitchenEnabled) + Number(courierEnabled);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground antialiased">
      {/* ===== TOP BAR ===== */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 shadow-sm md:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-sm">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="restaurant" className="text-[20px] font-bold" />
              )}
            </div>
            <span className="max-w-[12rem] truncate text-[18px] font-bold tracking-tight text-foreground">
              {brandName}
            </span>
          </div>
          <div className="flex max-w-[16rem] items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            {branchControl ?? (
              <span className="truncate text-[13px] font-medium text-foreground">Şube: {branchLabel}</span>
            )}
          </div>
          {menuPicker ? <div className="hidden lg:block">{menuPicker}</div> : null}
        </div>

        <nav className="no-scrollbar hidden h-full min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto lg:flex">
          <Link
            href={ordersHref}
            title="Sipariş Yönetimine dön"
            className={topNavLinkClass(false)}
          >
            <Icon name="arrow_back" className="text-[15px]" />
            <span className="hidden 2xl:inline">Sipariş Yönetimi</span>
            <span className="2xl:hidden">Yönetim</span>
          </Link>
          {topNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={topNavLinkClass(item.active)}
            >
              <Icon name={item.icon} className="text-[15px]" />
              <span className="hidden 2xl:inline">{item.label}</span>
              <span className="2xl:hidden">{item.short}</span>
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 2xl:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" />
            </span>
            <span className="text-[12px] font-semibold text-emerald-700">Normal Tolerans (0.4s)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Ses"
            >
              <Icon name="volume_up" className="text-[22px]" />
            </button>
            <button
              type="button"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Bildirimler"
            >
              <Icon name="notifications" className="text-[22px]" />
              {delayedCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
              ) : null}
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
              title="Acil"
            >
              <Icon name="emergency_home" className="text-[22px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={onNewOrder}
            className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground shadow-sm transition-transform active:scale-95 hover:bg-primary/90 sm:flex"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Yeni Sipariş Girişi
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col justify-between border-r border-border bg-card p-4 xl:flex">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                <Icon name="storefront" className="text-[18px]" />
              </div>
              <div>
                <div className="truncate text-[13px] font-bold text-foreground">{brandName}</div>
                <div className="text-[11px] font-medium text-muted-foreground">Terminal #04</div>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              {sideNav.map((item) => (
                <Link key={item.label} href={item.href} className={sideNavLinkClass(item.active)}>
                  <Icon name={item.icon} className="text-[18px]" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="my-4 flex flex-col gap-2 rounded-2xl border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Terminal Durumu</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Icon name="coffee" className="text-[16px] text-muted-foreground" />
              Mola Modu
            </button>
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <a
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              href={homeHref}
            >
              <Icon name="check_circle" className="text-[18px] text-emerald-600" />
              Sistem Durumu
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Icon name="logout" className="text-[18px]" />
              Çıkış
            </button>
          </div>
        </aside>

        {/* ===== MAIN ===== */}
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background p-3 md:p-6 xl:ml-64">
          {error}
          {loading ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
              Operasyon paneli yükleniyor...
            </div>
          ) : null}

          {/* KPI ROW */}
          <section
            className={cn(
              "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2",
              kpiCount >= 5 && "lg:grid-cols-5",
              kpiCount === 4 && "lg:grid-cols-4",
              kpiCount <= 3 && "lg:grid-cols-3",
            )}
          >
            <KpiCard
              label="Günlük canlı ciro"
              icon="payments"
              tone="orange"
              footer={
                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#615e57]">
                      Hedef {formatMenuPrice(revenueTarget, currency) || "₺0"}
                    </span>
                    <span className="font-semibold tabular-nums text-[#1c1c18]">
                      %{revenuePct.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e2dc]">
                    <div className="h-full rounded-full bg-[#ffc72c]" style={{ width: `${revenuePct}%` }} />
                  </div>
                </div>
              }
            >
              <KpiValue
                value={formatMenuPrice(kpis.revenue, currency) || "₺0"}
                caption={
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <Icon name="trending_up" className="text-[14px]" />
                    Canlı dönem cirosu
                  </span>
                }
              />
            </KpiCard>

            <KpiCard
              label="Aktif siparişler"
              icon="receipt_long"
              tone="sky"
              footer={
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#ffdf99] px-1 py-1.5">
                    <span className="block text-[15px] font-semibold tabular-nums text-[#775a00]">{kpis.tableOrders}</span>
                    <span className="text-[10px] font-medium text-[#615e57]">Masa içi</span>
                  </div>
                  <div className="rounded-xl bg-[#ffdad4] px-1 py-1.5">
                    <span className="block text-[15px] font-semibold tabular-nums text-[#930001]">{kpis.deliveryOrders}</span>
                    <span className="text-[10px] font-medium text-[#615e57]">Paket</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-1 py-1.5">
                    <span className="block text-[15px] font-semibold tabular-nums text-emerald-700">{kpis.pickupOrders}</span>
                    <span className="text-[10px] font-medium text-[#615e57]">Gel-al</span>
                  </div>
                </div>
              }
            >
              <KpiValue
                value={kpis.openOrders}
                caption={<span className="text-[#615e57]">Operasyondaki toplam akış</span>}
              />
            </KpiCard>

            {kitchenEnabled ? (
            <KpiCard
              label="Mutfak ort. süre"
              icon="timer"
              tone="emerald"
              footer={
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#615e57]">Canlı mutfak ortalaması</span>
                  <span className="font-semibold text-[#4f4633]">{preparing.length} aktif bilet</span>
                </div>
              }
            >
              <KpiValue
                value={
                  kpis.kitchenAvgMinutes != null
                    ? kpis.kitchenAvgMinutes.toLocaleString("tr-TR", {
                        maximumFractionDigits: 1,
                        minimumFractionDigits: 1,
                      })
                    : "—"
                }
                suffix="dakika"
                caption={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      kpis.kitchenOnTarget
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#ffb4a8] bg-[#ffdad6] text-[#93000a]",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", kpis.kitchenOnTarget ? "bg-emerald-600" : "bg-[#ba1a1a]")} />
                    Hedef &lt;{kpis.kitchenTargetMinutes} dk
                    <span className="font-medium opacity-80">
                      {kpis.kitchenOnTarget ? "Başarılı" : "Aşım"}
                    </span>
                  </span>
                }
              />
            </KpiCard>
            ) : null}

            {courierEnabled ? (
            <KpiCard
              label="Kurye filosu"
              icon="two_wheeler"
              tone="sky"
              footer={
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-700">Aktif filo %{fleetActivePct}</span>
                  <span className="text-[#615e57]">{courierTickets.length} aktif paket</span>
                </div>
              }
            >
              <KpiValue
                value={kpis.courierOnRoad}
                suffix="yolda"
                caption={
                  <span className="text-[#615e57]">
                    {kpis.courierWaiting} beklemede
                    {kpis.courierAvgMinutes != null
                      ? ` · ort. ${kpis.courierAvgMinutes.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} dk`
                      : ""}
                  </span>
                }
              />
            </KpiCard>
            ) : null}

            <KpiCard
              label="Masa doluluk"
              icon="table_bar"
              tone="orange"
              footer={
                <div>
                  <div className="flex gap-1">
                    {Array.from({ length: 8 }).map((_, i) => {
                      const filled =
                        kpis.totalTables > 0 &&
                        i < Math.round(((kpis.tableOccupancyPercent ?? 0) / 100) * 8);
                      return (
                        <span
                          key={i}
                          className={cn("h-1.5 flex-1 rounded-full", filled ? "bg-[#ffc72c]" : "bg-[#e5e2dc]")}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#615e57]">{kpis.emptyTables} masa boş</span>
                    <span className="font-medium text-emerald-700">{kpis.tableOrders} aktif sipariş</span>
                  </div>
                </div>
              }
            >
              <KpiValue
                value={kpis.tableOccupancyPercent != null ? `%${kpis.tableOccupancyPercent}` : "—"}
                suffix="doluluk"
                caption={
                  <span className="text-[#615e57]">
                    {kpis.totalTables > 0
                      ? `${kpis.occupiedTables} / ${kpis.totalTables} masa dolu`
                      : "Masa verisi yok"}
                  </span>
                }
              />
            </KpiCard>
          </section>

          {/* 3 COLUMN OPS */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* SALON */}
            <div className={cn("flex min-h-[32rem] flex-col rounded-3xl border border-[#d3c5ac]/35 bg-white p-4 ambient-shadow", opsColClass)}>
              <div className="flex items-center justify-between border-b border-[#ebe8e2] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Icon name="person_apron" className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="font-epilogue text-[18px] font-bold text-[#1c1c18]">Salon &amp; Masa Akışı</h2>
                    <span className="text-[11px] font-medium text-[#615e57]">
                      Görevli Servis Personeli ({waiterGroups.length} Garson)
                    </span>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Canlı
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
                {waiterGroups.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[#615e57]">Aktif salon siparişi yok.</p>
                ) : (
                  waiterGroups.map((group) => (
                    <div
                      key={group.key}
                      className="space-y-1.5 rounded-2xl border border-[#d3c5ac]/35 bg-[#f6f3ed]/90 p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffdf99] text-xs font-bold text-[#775a00]">
                            {group.initials}
                          </div>
                          <div>
                            <span className="text-[13px] font-bold text-[#1c1c18]">{group.waiterName}</span>
                            {group.tableLabels.length > 0 ? (
                              <span className="ml-1.5 text-[11px] text-[#615e57]">
                                ({group.tableLabels.slice(0, 4).join(", ")})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          {group.activeTableCount} Masa Aktif
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {group.orders.slice(0, 3).map((order) => {
                          const tone = tableStatusTone(order);
                          return (
                            <button
                              key={managedOrderKey(order)}
                              type="button"
                              onClick={() => onSelectOrder(order)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg border border-[#d3c5ac]/45 border-l-4 bg-white p-2.5 text-left shadow-sm",
                                tone === "occupied" && "border-l-[#775a00]",
                                tone === "serving" && "border-l-emerald-500",
                                tone === "waiting" && "border-l-[#df2d1f]",
                                tone === "delayed" && "border-l-[#ba1a1a]",
                                tone === "empty" && "border-l-[#d3c5ac]",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-[#1c1c18]">
                                  {orderLocationLabel(order)}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    tone === "occupied" && "bg-[#ffdf99] text-[#5a4300]",
                                    tone === "serving" && "bg-emerald-100 text-emerald-800",
                                    tone === "waiting" && "bg-[#ffdad4] text-[#930001]",
                                    tone === "delayed" && "bg-[#ffdad6] text-[#93000a]",
                                    tone === "empty" && "bg-[#f0eee8] text-[#4f4633]",
                                  )}
                                >
                                  {salonTableOrderStatusLabel(order, orders)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-[#1c1c18]">
                                  {formatMenuPrice(order.totalAmount ?? undefined, currency)}
                                </span>
                                {order.status === "READY" ? (
                                  <span className="rounded-full bg-[#ffc72c] px-2.5 py-1 text-[11px] font-bold text-[#251a00]">
                                    Mutfak hazır
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#615e57]">
                                    {formatOrderWhenCompact(order.submittedAt || order.createdAt)}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                <div className="rounded-2xl border border-[#d3c5ac]/35 bg-[#f6f3ed] p-2.5">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#615e57]">
                    Hızlı Masa Durum Dağılımı
                  </span>
                  <div className="grid grid-cols-6 gap-1.5 text-center">
                    {(matrix.length > 0 ? matrix : Array.from({ length: 6 }).map((_, i) => null)).map(
                      (order, i) => {
                        if (!order) {
                          return (
                            <span
                              key={`empty-${i}`}
                              className="rounded-lg border border-[#d3c5ac]/45 bg-white p-1.5 text-[12px] font-semibold text-[#615e57]"
                            >
                              M{i + 1}
                            </span>
                          );
                        }
                        const tone = tableStatusTone(order);
                        return (
                          <button
                            key={managedOrderKey(order)}
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className={cn(
                              "rounded-lg border p-1.5 text-[12px] font-bold",
                              tone === "occupied" && "border-[#f6bf22]/70 bg-[#ffdf99] text-[#775a00]",
                              tone === "serving" && "border-emerald-200 bg-emerald-100 text-emerald-800",
                              tone === "waiting" && "border-[#ffb4a8] bg-[#ffdad4] text-[#930001]",
                              tone === "delayed" && "border-[#ffb4a8] bg-[#ffdad6] text-[#93000a]",
                              tone === "empty" && "border-[#d3c5ac]/45 bg-white text-[#615e57]",
                            )}
                          >
                            {orderLocationLabel(order).replace(/^Masa\s+/i, "M").slice(0, 3)}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-[#615e57]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#ffc72c]" /> Dolu
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" /> Serviste
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#d3c5ac]" /> Boş
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#ffdad6]0" /> Gecikme
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {kitchenEnabled ? (
            <div className={cn("flex min-h-[32rem] flex-col rounded-3xl border border-[#d3c5ac]/35 bg-white p-4 ambient-shadow", opsColClass)}>
              <div className="flex items-center justify-between border-b border-[#ebe8e2] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffdf99] text-[#5a4300]">
                    <Icon name="skillet" className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="font-epilogue text-[18px] font-bold text-[#1c1c18]">Mutfak KDS Ekranı</h2>
                    <span className="text-[11px] font-medium text-[#615e57]">Canlı mutfak kuyruğu</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#f0eee8] px-2 py-0.5 text-[11px] font-semibold text-[#4f4633]">
                  <span className="h-2 w-2 rounded-full bg-[#ffc72c]" />
                  {kitchenTickets.length} Bilet
                </div>
              </div>

              <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
                    {kitchenTickets.length === 0 ? (
                      <p className="py-10 text-center text-xs text-[#615e57]">Mutfak kuyruğu boş.</p>
                    ) : (
                      kitchenTickets.slice(0, 6).map((order) => {
                        const now = Date.now();
                        const elapsed = kitchenElapsedMinutes(order, now) ?? 0;
                        const late = delayedKeys.has(managedOrderKey(order)) || isKitchenTicketDelayed(order, now);
                        const ready = order.status === "READY";
                        const items = order.items ?? [];
                        const channel = orderChannel(order);
                        const offTable = channel !== "QR" && channel !== "WAITER";
                        const customer = order.customerName?.trim();
                        const phone = order.customerPhone?.trim();
                        const address = order.deliveryAddress?.trim();
                        const note = order.note?.trim();
                        return (
                          <div
                            key={managedOrderKey(order)}
                            className={cn(
                              "rounded-2xl border p-2.5",
                              late && "border-[#ffb4a8] bg-[#ffdad6]/80 shadow-[0_0_12px_rgba(239,68,68,0.08)]",
                              ready && !late && "border-emerald-200 bg-emerald-50/50",
                              !late && !ready && "border-[#d3c5ac]/45 bg-[#f6f3ed]/90",
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-between border-b pb-1.5",
                                late ? "border-[#ffb4a8]" : ready ? "border-emerald-200" : "border-[#d3c5ac]/55",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "text-[14px] font-bold",
                                    late ? "text-[#ba1a1a]" : ready ? "text-emerald-700" : "text-[#775a00]",
                                  )}
                                >
                                  #{order.orderNumber || order.id}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    late
                                      ? "bg-[#ffdad6] font-bold text-[#93000a]"
                                      : ready
                                        ? "bg-emerald-100 font-bold text-emerald-800"
                                        : "border border-[#d3c5ac]/45 bg-white text-[#1c1c18]",
                                  )}
                                >
                                  {channel === "PHONE"
                                    ? `Telefon · ${orderLocationLabel(order)}`
                                    : orderLocationLabel(order)}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-[11px] font-semibold",
                                  late ? "font-bold text-[#ba1a1a]" : ready ? "text-emerald-700" : "text-[#4f4633]",
                                )}
                              >
                                <Icon
                                  name={late ? "warning" : ready ? "check_circle" : "schedule"}
                                  className={cn("text-[14px]", !late && !ready && "text-[#775a00]")}
                                />
                                <span>
                                  {late
                                    ? `${elapsed.toFixed(0)}. dk - Zaman Uyarısı!`
                                    : ready
                                      ? "Hazır (Servis Bekliyor)"
                                      : `Hazırlanıyor • ${elapsed.toFixed(0)} / ${KITCHEN_KANBAN_SLA_MINUTES} dk`}
                                </span>
                              </div>
                            </div>
                            {offTable && (customer || phone || address || note) ? (
                              <div className="space-y-0.5 border-b border-[#d3c5ac]/35 py-1.5 text-[11px] leading-snug text-[#4f4633]">
                                {customer || phone ? (
                                  <p className="font-semibold text-[#1c1c18]">
                                    {[customer, phone].filter(Boolean).join(" · ")}
                                  </p>
                                ) : null}
                                {address ? <p>{address}</p> : null}
                                {note ? <p>Not: {note}</p> : null}
                              </div>
                            ) : null}
                            <div className="space-y-1 py-2 text-[12px] text-[#1c1c18]">
                              {items.slice(0, 4).map((item) => {
                                const options = item.selectedOptions
                                  ?.map((option) => option.optionName)
                                  .filter(Boolean)
                                  .join(", ");
                                const name = item.productName?.trim();
                                return (
                                  <div
                                    key={`${managedOrderKey(order)}-${item.id ?? item.productId}`}
                                    className="flex items-start justify-between gap-2"
                                  >
                                    <span>
                                      <strong>{item.quantity}x</strong> {name || "ürün"}
                                      {options ? (
                                        <span className="block text-[11px] font-normal text-[#615e57]">{options}</span>
                                      ) : null}
                                      {item.note?.trim() ? (
                                        <span className="block text-[11px] font-normal text-[#615e57]">
                                          Not: {item.note.trim()}
                                        </span>
                                      ) : null}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {late ? (
                              <div className="mt-1 grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(order)}
                                  className="rounded-full bg-[#df2d1f] py-1.5 text-center text-[11px] font-bold text-white shadow-sm hover:bg-[#ba0a06]"
                                >
                                  ŞEFİ UYAR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(order)}
                                  className="rounded-lg border border-[#d3c5ac]/45 bg-white py-1.5 text-center text-[11px] font-bold text-[#4f4633] hover:bg-[#f0eee8]"
                                >
                                  FIRINDAN ÇIKAR
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectOrder(order)}
                                className={cn(
                                  "mt-1 flex w-full items-center justify-center gap-1 rounded-full py-2 text-[11px] font-bold",
                                  ready
                                    ? "bg-[#ffc72c] text-[#251a00] hover:bg-[#f6bf22]"
                                    : "border border-[#d3c5ac]/45 bg-white text-[#775a00] hover:bg-[#f6f3ed]",
                                )}
                              >
                                <Icon name={ready ? "notifications_active" : "check"} className="text-xs" />
                                {ready
                                  ? "GARSONA ÇAĞRI BİLDİRİMİ GÖNDER"
                                  : "HAZIRLANDI OLARAK İŞARETLE"}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Link
                    href={detailHref("kitchen")}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-[#ffc72c] py-2.5 text-[12px] font-bold text-[#251a00] hover:bg-[#f6bf22]"
                  >
                    <Icon name="notifications_active" className="text-xs" />
                    GARSONA ÇAĞRI BİLDİRİMİ GÖNDER
                  </Link>
            </div>
            ) : null}

            {courierEnabled ? (
            <div className={cn("flex min-h-[32rem] flex-col rounded-3xl border border-[#d3c5ac]/35 bg-white p-4 ambient-shadow", opsColClass)}>
              <div className="flex items-center justify-between border-b border-[#ebe8e2] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffdad4] text-[#930001]">
                    <Icon name="two_wheeler" className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="font-epilogue text-[18px] font-bold text-[#1c1c18]">Kurye &amp; Paket Filosu</h2>
                    <span className="text-[11px] font-medium text-[#615e57]">Entegre Kanallar &amp; GPS İzleme</span>
                  </div>
                </div>
                <span className="rounded-full border border-[#ffb4a8] bg-[#ffdad4]/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#930001]">
                  {courierLane.length} Aktif
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {channels.map((ch, idx) => {
                  const selected = courierChannel === ch.key;
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setCourierChannel((current) =>
                          current === ch.key ? null : (ch.key as OrderChannel),
                        )
                      }
                      className={cn(
                        "rounded-lg border p-1.5 transition-colors",
                        selected
                          ? "border-[#ffc72c] bg-[#ffc72c] text-[#251a00]"
                          : "border-[#d3c5ac]/45 bg-[#f6f3ed] hover:border-[#ffc72c]",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-[13px] font-bold",
                          !selected && idx === 0 && "text-[#775a00]",
                          !selected && idx === 1 && "text-[#930001]",
                          !selected && idx === 2 && "text-emerald-700",
                          !selected && idx === 3 && "text-[#1c1c18]",
                        )}
                      >
                        {ch.count}
                      </span>
                      <span className={cn("text-[10px] font-medium", selected ? "text-[#251a00]" : "text-[#615e57]")}>
                        {ch.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {courierTickets.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[#615e57]">
                    {courierChannel ? "Bu kanalda aktif paket siparişi yok." : "Aktif paket siparişi yok."}
                  </p>
                ) : (
                  courierTickets.slice(0, 6).map((order) => {
                    const channel = orderChannel(order);
                    const onRoad = order.status === "ON_THE_WAY";
                    const waiting = order.status === "READY";
                    const initials = (order.customerName || ORDER_CHANNEL_LABEL[channel])
                      .split(/\s+/)
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toLocaleUpperCase("tr-TR");
                    return (
                      <div
                        key={managedOrderKey(order)}
                        className="space-y-1.5 rounded-2xl border border-[#d3c5ac]/35 bg-[#f6f3ed]/90 p-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                                onRoad && "bg-[#ffdad4] text-[#930001]",
                                waiting && "bg-[#ffdf99] text-[#775a00]",
                                !onRoad && !waiting && "bg-[#e5e2dc] text-[#4f4633]",
                              )}
                            >
                              {initials || "PK"}
                            </div>
                            <div>
                              <span className="text-[13px] font-bold text-[#1c1c18]">
                                {order.customerName?.trim() || ORDER_CHANNEL_LABEL[channel]}
                              </span>
                              <span className="ml-1 font-mono text-[10px] text-[#615e57]">
                                ({ORDER_CHANNEL_LABEL[channel]})
                              </span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              onRoad && "bg-[#ffdad4] text-[#930001]",
                              waiting && "bg-[#ffdf99] text-[#775a00]",
                              !onRoad && !waiting && "bg-emerald-100 text-emerald-800",
                            )}
                          >
                            {onRoad ? "Teslimatta" : waiting ? "Şubede Bekliyor" : orderStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="space-y-1 rounded-lg border border-[#d3c5ac]/45 bg-white p-2.5 text-[12px] shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#1c1c18]">
                              Sipariş #{order.orderNumber || order.id} ({ORDER_CHANNEL_LABEL[channel]})
                            </span>
                            <span className={cn("text-[11px] font-bold", onRoad ? "text-[#930001]" : "text-[#775a00]")}>
                              {formatMenuPrice(orderAmount(order.totalAmount), currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#615e57]">
                            <span className="truncate">
                              {order.deliveryAddress?.trim() || orderLocationLabel(order)}
                            </span>
                            <span>{formatOrderWhenCompact(order.submittedAt || order.createdAt)}</span>
                          </div>
                        </div>
                        {waiting ? (
                          <div className="flex items-center justify-between rounded-lg border border-[#d3c5ac]/45 bg-white p-2">
                            <span className="text-[11px] text-[#615e57]">Hazır siparişe atanmayı bekliyor</span>
                            <button
                              type="button"
                              onClick={() => onSelectOrder(order)}
                              className="rounded-lg border border-[#d3c5ac]/45 bg-[#f0eee8] px-3 py-1 text-[11px] font-semibold text-[#1c1c18] hover:bg-[#e5e2dc]"
                            >
                              Sipariş Ata
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            ) : null}
          </section>

          {/* BOTTOM INSIGHTS */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-3xl border border-[#d3c5ac]/35 bg-white p-4 ambient-shadow lg:col-span-7">
              <div className="mb-3 flex items-center justify-between border-b border-[#ebe8e2] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="leaderboard" className="text-[22px] text-[#775a00]" />
                  <h3 className="font-epilogue text-[18px] font-bold text-[#1c1c18]">Günün En Çok Satan Ürünleri</h3>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#615e57]">
                  Top 5 Performans
                </span>
              </div>
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#615e57]">Henüz ürün satışı yok.</p>
                ) : (
                  products.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between rounded-2xl border border-[#d3c5ac]/35 bg-[#f6f3ed]/90 p-3 transition-colors hover:border-[#ffc72c]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-5 text-[13px] font-extrabold",
                            index === 0 ? "text-[#775a00]" : "text-[#817661]",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-[#1c1c18]">{product.name}</div>
                          <div className="text-[11px] text-[#615e57]">Pay: %{product.share.toFixed(0)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-bold text-[#1c1c18]">
                          {formatMenuPrice(product.revenue, currency) || "0 ₺"}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700">
                          {product.quantity} Porsiyon Satıldı
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-[#d3c5ac]/35 bg-white p-4 ambient-shadow lg:col-span-5">
              <div>
                <div className="flex items-center justify-between border-b border-[#ebe8e2] pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="insights" className="text-[22px] text-[#775a00]" />
                    <h3 className="font-epilogue text-[18px] font-bold text-[#1c1c18]">Saatlik Yoğunluk &amp; Güvenlik</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-[#615e57]">12:00 - 23:00</span>
                </div>
                <div className="mt-4 space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#615e57]">
                    Sipariş Yoğunluk Dağılımı (Saatlik)
                  </span>
                  <div className="flex h-28 items-end justify-between gap-1.5 rounded-2xl border border-[#d3c5ac]/35 bg-[#f6f3ed] px-3 pt-4">
                    {hourly.map((point) => {
                      const hourNum = Number(point.hour.slice(0, 2));
                      const height = Math.max(10, Math.round((point.orders / maxHourly) * 100));
                      const isPeak = point.hour === peak.hour && peak.orders > 0;
                      const isCurrent = hourNum === currentHour;
                      return (
                        <div key={point.hour} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className={cn(
                              "w-full rounded-t",
                              isPeak && "bg-[#ffc72c]",
                              isCurrent && !isPeak && "bg-[#775a00]",
                              !isPeak && !isCurrent && point.orders > maxHourly * 0.55 && "bg-[#f6bf22]",
                              !isPeak && !isCurrent && point.orders <= maxHourly * 0.55 && "bg-[#e5e2dc]",
                            )}
                            style={{ height: `${height}%` }}
                          />
                          <span
                            className={cn(
                              "text-[9px] font-semibold",
                              isPeak ? "font-bold text-[#775a00]" : isCurrent ? "font-bold text-[#930001]" : "text-[#817661]",
                            )}
                          >
                            {String(hourNum).padStart(2, "0")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#ebe8e2] pt-3">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#615e57]">
                      İptal / İade Oranı
                    </span>
                    <span className="text-[14px] font-bold text-emerald-800">{cancelledCount} İptal</span>
                  </div>
                  <Icon name="verified" className="text-emerald-600" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-[#ffb4a8] bg-[#ffdad6]/80 p-2.5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#615e57]">
                      Gecikme Uyarısı
                    </span>
                    <span className="text-[14px] font-bold text-[#ba1a1a]">{delayedCount} Sipariş</span>
                  </div>
                  <Icon name="notifications_paused" className="text-[#ba1a1a]" />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
