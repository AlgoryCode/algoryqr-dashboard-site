"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  formatMenuPrice,
} from "@/components/menu-templates/types";
import {
  courierChannelCounts,
  formatOrderWhenCompact,
  groupOpsLaneOrders,
  groupSalonByWaiter,
  hourlyOrderSeries,
  isDeliveryOrder,
  managedOrderKey,
  orderAmount,
  orderChannel,
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
  kitchenEnabled: boolean;
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
  orange: "bg-orange-50 text-[#c2410c]",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
} as const;

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
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</h3>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", KPI_TONE[tone])}>
          <Icon name={icon} className="text-[18px]" />
        </span>
      </header>
      <div className="flex flex-1 flex-col px-4 pb-3 pt-3">{children}</div>
      <footer className="mt-auto flex min-h-[76px] flex-col justify-center border-t border-slate-100 bg-slate-50/70 px-4 py-3">
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
        <p className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
          {value}
        </p>
        {suffix ? <span className="text-[12px] font-medium text-slate-500">{suffix}</span> : null}
      </div>
      {caption ? <div className="mt-2 text-[12px] leading-5">{caption}</div> : null}
    </>
  );
}

export function OrderLiveOpsCanvas({
  branchLabel,
  kitchenEnabled,
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
  const salonOrders = salonBoardOrders(orders, kitchenEnabled);
  const waiterGroups = groupSalonByWaiter(salonOrders);
  const lanes = groupOpsLaneOrders(orders, kitchenEnabled);
  const kitchenTickets = kitchenEnabled
    ? [
        ...lanes.kitchen,
        ...orders.filter((o) => o.status === "READY" && !isDeliveryOrder(o)),
      ]
    : [];
  const preparing = kitchenTickets.filter((o) => o.status !== "READY");
  const courierTickets = lanes.courier;
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
    { label: "Kurye Filosu", short: "Kurye", icon: "two_wheeler", href: detailHref("courier"), active: false },
    { label: "Finans & Rapor", short: "Finans", icon: "analytics", href: DASHBOARD_ROUTES.reportsHub, active: false },
  ].filter((item) => !item.hide);

  const sideNav = [
    { label: "Canlı İzleme", icon: "dashboard", href: homeHref, active: true },
    { label: "Mutfak KDS", icon: "skillet", href: kitchenHref, active: false, hide: !kitchenEnabled },
    { label: "Kat Planı", icon: "table_restaurant", href: restaurantLayoutFromOrderManagementHref(homeHref), active: false },
    { label: "Kurye Takip", icon: "two_wheeler", href: detailHref("courier"), active: false },
    { label: "Envanter", icon: "inventory_2", href: DASHBOARD_ROUTES.stock, active: false },
    { label: "Ayarlar", icon: "tune", href: DASHBOARD_ROUTES.account, active: false },
  ].filter((item) => !item.hide);

  return (
    <div
      className="flex h-svh flex-col overflow-hidden bg-[#f8f9fb] text-slate-900 antialiased"
      style={{ fontFamily: '"Plus Jakarta Sans", Manrope, sans-serif' }}
    >
      {/* ===== TOP BAR ===== */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#c2410c] text-white shadow-sm">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="restaurant" className="text-[20px] font-bold" />
              )}
            </div>
            <span className="max-w-[12rem] truncate text-[15px] font-bold tracking-tight text-slate-900">
              {brandName}
            </span>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 xl:flex">
            <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
            <span className="text-[13px] font-medium text-slate-900">Şube: {branchLabel}</span>
            <Icon name="expand_more" className="text-[18px] text-slate-400" />
          </div>
          {menuPicker ? <div className="hidden lg:block">{menuPicker}</div> : null}
        </div>

        <nav className="hidden h-full min-w-0 flex-nowrap items-center gap-0.5 lg:flex">
          <Link
            href={ordersHref}
            title="Sipariş Yönetimine dön"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] font-medium leading-none text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
              className={cn(
                "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] font-medium leading-none transition-colors",
                item.active
                  ? "bg-[#c2410c] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon name={item.icon} className="text-[15px]" />
              <span className="hidden 2xl:inline">{item.label}</span>
              <span className="2xl:hidden">{item.short}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 2xl:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" />
            </span>
            <span className="text-[12px] font-semibold text-emerald-700">Normal Tolerans (0.4s)</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" title="Ses">
              <Icon name="volume_up" className="text-[22px]" />
            </button>
            <button type="button" className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" title="Bildirimler">
              <Icon name="notifications" className="text-[22px]" />
              {delayedCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#c2410c]" />
              ) : null}
            </button>
            <button type="button" className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50" title="Acil">
              <Icon name="emergency_home" className="text-[22px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={onNewOrder}
            className="hidden items-center gap-1 rounded-lg bg-[#c2410c] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-transform active:scale-95 hover:bg-orange-700 sm:flex"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Yeni Sipariş Girişi
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 xl:flex">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50">
                <Icon name="storefront" className="text-[18px] text-[#c2410c]" />
              </div>
              <div>
                <div className="truncate text-[13px] font-bold text-slate-900">{brandName}</div>
                <div className="text-[11px] font-medium text-slate-500">Terminal #04</div>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              {sideNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                    item.active
                      ? "border border-orange-200 bg-orange-50 font-bold text-[#c2410c]"
                      : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon name={item.icon} className="text-[18px]" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="my-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Terminal Durumu</span>
              <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              <Icon name="coffee" className="text-[16px] text-slate-600" />
              Mola Modu
            </button>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
            <a className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50" href={homeHref}>
              <Icon name="check_circle" className="text-[18px] text-emerald-600" />
              Sistem Durumu
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <Icon name="logout" className="text-[18px]" />
              Çıkış
            </button>
          </div>
        </aside>

        {/* ===== MAIN ===== */}
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f8f9fb] p-3 md:p-6 xl:ml-64">
          {error}
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Operasyon paneli yükleniyor...
            </div>
          ) : null}

          {/* KPI ROW */}
          <section className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Günlük canlı ciro"
              icon="payments"
              tone="orange"
              footer={
                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Hedef {formatMenuPrice(revenueTarget, currency) || "₺0"}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      %{revenuePct.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                    <div className="h-full rounded-full bg-[#c2410c]" style={{ width: `${revenuePct}%` }} />
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
                  <div className="rounded-md bg-orange-50 px-1 py-1.5">
                    <span className="block text-[15px] font-semibold tabular-nums text-[#c2410c]">{kpis.tableOrders}</span>
                    <span className="text-[10px] font-medium text-slate-500">Masa içi</span>
                  </div>
                  <div className="rounded-md bg-sky-50 px-1 py-1.5">
                    <span className="block text-[15px] font-semibold tabular-nums text-sky-700">{kpis.deliveryOrders}</span>
                    <span className="text-[10px] font-medium text-slate-500">Paket</span>
                  </div>
                  <div className="rounded-md bg-emerald-50 px-1 py-1.5">
                    <span className="block text-[15px] font-semibold tabular-nums text-emerald-700">{kpis.pickupOrders}</span>
                    <span className="text-[10px] font-medium text-slate-500">Gel-al</span>
                  </div>
                </div>
              }
            >
              <KpiValue
                value={kpis.openOrders}
                caption={<span className="text-slate-500">Operasyondaki toplam akış</span>}
              />
            </KpiCard>

            <KpiCard
              label="Mutfak ort. süre"
              icon="timer"
              tone="emerald"
              footer={
                kitchenEnabled ? (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Canlı mutfak ortalaması</span>
                    <span className="font-semibold text-slate-700">{preparing.length} aktif bilet</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">Siparişler doğrudan garsona atanıyor</p>
                )
              }
            >
              {kitchenEnabled ? (
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
                          : "border-rose-200 bg-rose-50 text-rose-700",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", kpis.kitchenOnTarget ? "bg-emerald-600" : "bg-rose-600")} />
                      Hedef &lt;{kpis.kitchenTargetMinutes} dk
                      <span className="font-medium opacity-80">
                        {kpis.kitchenOnTarget ? "Başarılı" : "Aşım"}
                      </span>
                    </span>
                  }
                />
              ) : (
                <KpiValue
                  value="Kapalı"
                  caption={<span className="text-slate-500">Mutfak bu şubede aktif değil</span>}
                />
              )}
            </KpiCard>

            <KpiCard
              label="Kurye filosu"
              icon="two_wheeler"
              tone="sky"
              footer={
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-700">Aktif filo %{fleetActivePct}</span>
                  <span className="text-slate-500">{courierTickets.length} aktif paket</span>
                </div>
              }
            >
              <KpiValue
                value={kpis.courierOnRoad}
                suffix="yolda"
                caption={
                  <span className="text-slate-500">
                    {kpis.courierWaiting} beklemede
                    {kpis.courierAvgMinutes != null
                      ? ` · ort. ${kpis.courierAvgMinutes.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} dk`
                      : ""}
                  </span>
                }
              />
            </KpiCard>

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
                          className={cn("h-1.5 flex-1 rounded-full", filled ? "bg-[#c2410c]" : "bg-slate-200")}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{kpis.emptyTables} masa boş</span>
                    <span className="font-medium text-emerald-700">{kpis.tableOrders} aktif sipariş</span>
                  </div>
                </div>
              }
            >
              <KpiValue
                value={kpis.tableOccupancyPercent != null ? `%${kpis.tableOccupancyPercent}` : "—"}
                suffix="doluluk"
                caption={
                  <span className="text-slate-500">
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
            <div className="flex min-h-[32rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <Icon name="person_apron" className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">Salon &amp; Masa Akışı</h2>
                    <span className="text-[11px] font-medium text-slate-500">
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
                  <p className="py-10 text-center text-xs text-slate-500">Aktif salon siparişi yok.</p>
                ) : (
                  waiterGroups.map((group) => (
                    <div
                      key={group.key}
                      className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#c2410c]">
                            {group.initials}
                          </div>
                          <div>
                            <span className="text-[13px] font-bold text-slate-900">{group.waiterName}</span>
                            {group.tableLabels.length > 0 ? (
                              <span className="ml-1.5 text-[11px] text-slate-500">
                                ({group.tableLabels.slice(0, 4).join(", ")})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          {group.orders.length} Masa Aktif
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
                                "flex w-full items-center justify-between rounded-lg border border-slate-200 border-l-4 bg-white p-2.5 text-left shadow-sm",
                                tone === "occupied" && "border-l-[#c2410c]",
                                tone === "serving" && "border-l-emerald-500",
                                tone === "waiting" && "border-l-sky-500",
                                tone === "delayed" && "border-l-rose-500",
                                tone === "empty" && "border-l-slate-400",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-slate-900">
                                  {orderLocationLabel(order)}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    tone === "occupied" && "bg-orange-100 text-orange-900",
                                    tone === "serving" && "bg-emerald-100 text-emerald-800",
                                    tone === "waiting" && "bg-sky-100 text-sky-800",
                                    tone === "delayed" && "bg-rose-100 text-rose-800",
                                    tone === "empty" && "bg-slate-100 text-slate-700",
                                  )}
                                >
                                  {orderStatusLabel(order.status)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-slate-900">
                                  {formatMenuPrice(order.totalAmount ?? undefined, currency)}
                                </span>
                                {order.status === "READY" ? (
                                  <span className="rounded-lg bg-[#c2410c] px-2.5 py-1 text-[11px] font-semibold text-white">
                                    POS Hazır
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
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

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Hızlı Masa Durum Dağılımı
                  </span>
                  <div className="grid grid-cols-6 gap-1.5 text-center">
                    {(matrix.length > 0 ? matrix : Array.from({ length: 6 }).map((_, i) => null)).map(
                      (order, i) => {
                        if (!order) {
                          return (
                            <span
                              key={`empty-${i}`}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-[12px] font-semibold text-slate-500"
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
                              tone === "occupied" && "border-orange-200 bg-orange-100 text-[#c2410c]",
                              tone === "serving" && "border-emerald-200 bg-emerald-100 text-emerald-800",
                              tone === "waiting" && "border-sky-200 bg-sky-100 text-sky-800",
                              tone === "delayed" && "border-rose-200 bg-rose-100 text-rose-800",
                              tone === "empty" && "border-slate-200 bg-white text-slate-500",
                            )}
                          >
                            {orderLocationLabel(order).replace(/^Masa\s+/i, "M").slice(0, 3)}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#c2410c]" /> Dolu
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" /> Serviste
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" /> Boş
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Gecikme
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KITCHEN */}
            <div className="flex min-h-[32rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-[#c2410c]">
                    <Icon name="skillet" className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">Mutfak KDS Ekranı</h2>
                    <span className="text-[11px] font-medium text-slate-500">
                      {kitchenEnabled ? "Canlı mutfak kuyruğu" : "Mutfak kapalı — garsona yönlendirme"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-[#c2410c]" />
                  {kitchenTickets.length} Bilet
                </div>
              </div>

              {!kitchenEnabled ? (
                <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                  <Icon name="skillet" className="mb-3 text-[36px] text-slate-300" />
                  <p className="text-sm font-bold text-slate-900">Mutfak aktif değil</p>
                  <p className="mt-2 max-w-xs text-xs text-slate-500">
                    Şubede mutfak kapalı olduğu için seçilen siparişler mutfağa eklenmez; doğrudan
                    garsona atanır.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
                    {kitchenTickets.length === 0 ? (
                      <p className="py-10 text-center text-xs text-slate-500">Mutfak kuyruğu boş.</p>
                    ) : (
                      kitchenTickets.slice(0, 6).map((order) => {
                        const now = Date.now();
                        const elapsed = kitchenElapsedMinutes(order, now) ?? 0;
                        const late = delayedKeys.has(managedOrderKey(order)) || isKitchenTicketDelayed(order, now);
                        const ready = order.status === "READY";
                        const items = order.items ?? [];
                        return (
                          <div
                            key={managedOrderKey(order)}
                            className={cn(
                              "rounded-xl border p-2.5",
                              late && "border-rose-200 bg-rose-50/40 shadow-[0_0_12px_rgba(239,68,68,0.08)]",
                              ready && !late && "border-emerald-200 bg-emerald-50/50",
                              !late && !ready && "border-slate-200 bg-slate-50/70",
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-between border-b pb-1.5",
                                late ? "border-rose-200" : ready ? "border-emerald-200" : "border-slate-200/80",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "text-[14px] font-bold",
                                    late ? "text-rose-600" : ready ? "text-emerald-700" : "text-[#c2410c]",
                                  )}
                                >
                                  #{order.orderNumber || order.id}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    late
                                      ? "bg-rose-100 font-bold text-rose-800"
                                      : ready
                                        ? "bg-emerald-100 font-bold text-emerald-800"
                                        : "border border-slate-200 bg-white text-slate-800",
                                  )}
                                >
                                  {orderLocationLabel(order)}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-[11px] font-semibold",
                                  late ? "font-bold text-rose-600" : ready ? "text-emerald-700" : "text-slate-600",
                                )}
                              >
                                <Icon
                                  name={late ? "warning" : ready ? "check_circle" : "schedule"}
                                  className={cn("text-[14px]", !late && !ready && "text-[#c2410c]")}
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
                            <div className="space-y-1 py-2 text-[12px] text-slate-800">
                              {items.slice(0, 3).map((item) => (
                                <div
                                  key={`${managedOrderKey(order)}-${item.id ?? item.productId}`}
                                  className="flex items-center justify-between"
                                >
                                  <span>
                                    <strong>{item.quantity}x</strong>{" "}
                                    {item.productName?.trim() || "ürün"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {late ? (
                              <div className="mt-1 grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(order)}
                                  className="rounded-lg bg-rose-600 py-1.5 text-center text-[11px] font-bold text-white shadow-sm hover:bg-rose-700"
                                >
                                  ŞEFİ UYAR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(order)}
                                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-center text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                                >
                                  FIRINDAN ÇIKAR
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectOrder(order)}
                                className={cn(
                                  "mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold shadow-sm",
                                  ready
                                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                                    : "border border-slate-200 bg-white text-[#c2410c] hover:bg-slate-100",
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
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-700 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-800"
                  >
                    <Icon name="notifications_active" className="text-xs" />
                    GARSONA ÇAĞRI BİLDİRİMİ GÖNDER
                  </Link>
                </>
              )}
            </div>

            {/* COURIER */}
            <div className="flex min-h-[32rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                    <Icon name="two_wheeler" className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">Kurye &amp; Paket Filosu</h2>
                    <span className="text-[11px] font-medium text-slate-500">Entegre Kanallar &amp; GPS İzleme</span>
                  </div>
                </div>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                  {courierTickets.length} Aktif
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {channels.map((ch, idx) => (
                  <div key={ch.key} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                    <span
                      className={cn(
                        "block text-[13px] font-bold",
                        idx === 0 && "text-[#c2410c]",
                        idx === 1 && "text-sky-700",
                        idx === 2 && "text-emerald-700",
                        idx === 3 && "text-slate-800",
                      )}
                    >
                      {ch.count}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{ch.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {courierTickets.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-500">Aktif paket siparişi yok.</p>
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
                        className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                                onRoad && "bg-sky-100 text-sky-700",
                                waiting && "bg-orange-100 text-[#c2410c]",
                                !onRoad && !waiting && "bg-slate-200 text-slate-600",
                              )}
                            >
                              {initials || "PK"}
                            </div>
                            <div>
                              <span className="text-[13px] font-bold text-slate-900">
                                {order.customerName?.trim() || ORDER_CHANNEL_LABEL[channel]}
                              </span>
                              <span className="ml-1 font-mono text-[10px] text-slate-500">
                                ({ORDER_CHANNEL_LABEL[channel]})
                              </span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              onRoad && "bg-sky-100 text-sky-800",
                              waiting && "bg-orange-100 text-[#c2410c]",
                              !onRoad && !waiting && "bg-emerald-100 text-emerald-800",
                            )}
                          >
                            {onRoad ? "Teslimatta" : waiting ? "Şubede Bekliyor" : orderStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">
                              Sipariş #{order.orderNumber || order.id} ({ORDER_CHANNEL_LABEL[channel]})
                            </span>
                            <span className={cn("text-[11px] font-bold", onRoad ? "text-sky-700" : "text-[#c2410c]")}>
                              {formatMenuPrice(orderAmount(order.totalAmount), currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate">
                              {order.deliveryAddress?.trim() || orderLocationLabel(order)}
                            </span>
                            <span>{formatOrderWhenCompact(order.submittedAt || order.createdAt)}</span>
                          </div>
                        </div>
                        {waiting ? (
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
                            <span className="text-[11px] text-slate-500">Hazır siparişe atanmayı bekliyor</span>
                            <button
                              type="button"
                              onClick={() => onSelectOrder(order)}
                              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-200"
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
          </section>

          {/* BOTTOM INSIGHTS */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="leaderboard" className="text-[#c2410c]" />
                  <h3 className="text-[15px] font-bold text-slate-900">Günün En Çok Satan Ürünleri</h3>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Top 5 Performans
                </span>
              </div>
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Henüz ürün satışı yok.</p>
                ) : (
                  products.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-5 text-[13px] font-extrabold",
                            index === 0 ? "text-[#c2410c]" : "text-slate-400",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-slate-900">{product.name}</div>
                          <div className="text-[11px] text-slate-500">Pay: %{product.share.toFixed(0)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-bold text-slate-900">
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

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="insights" className="text-[#c2410c]" />
                    <h3 className="text-[15px] font-bold text-slate-900">Saatlik Yoğunluk &amp; Güvenlik</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">12:00 - 23:00</span>
                </div>
                <div className="mt-4 space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Sipariş Yoğunluk Dağılımı (Saatlik)
                  </span>
                  <div className="flex h-28 items-end justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 pt-4">
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
                              isPeak && "bg-[#c2410c] shadow-sm",
                              isCurrent && !isPeak && "bg-sky-500",
                              !isPeak && !isCurrent && point.orders > maxHourly * 0.55 && "bg-orange-300",
                              !isPeak && !isCurrent && point.orders <= maxHourly * 0.55 && "bg-slate-200",
                            )}
                            style={{ height: `${height}%` }}
                          />
                          <span
                            className={cn(
                              "text-[9px] font-semibold",
                              isPeak ? "font-bold text-[#c2410c]" : isCurrent ? "font-bold text-sky-700" : "text-slate-400",
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
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      İptal / İade Oranı
                    </span>
                    <span className="text-[14px] font-bold text-emerald-800">{cancelledCount} İptal</span>
                  </div>
                  <Icon name="verified" className="text-emerald-600" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-2.5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Gecikme Uyarısı
                    </span>
                    <span className="text-[14px] font-bold text-rose-600">{delayedCount} Sipariş</span>
                  </div>
                  <Icon name="notifications_paused" className="text-rose-600" />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
