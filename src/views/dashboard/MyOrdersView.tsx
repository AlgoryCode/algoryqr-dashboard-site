"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  ChefHat,
  ConciergeBell,
  Globe,
  Loader2,
  Phone,
  QrCode,
  Search,
  SlidersHorizontal,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";

import { DigitalMenuHubGate } from "@/components/dashboard/digital-menu/DigitalMenuHubGate";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ListPagination } from "@/components/dashboard/ListPagination";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { PrintOrderButton } from "@/components/dashboard/PrintOrderButton";
import { TONE_BUTTON, TONES, type Tone } from "@/components/dashboard/tone";
import { OrderCancelDialog } from "@/components/orders/OrderCancelDialog";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { useNewOrderAlert } from "@/hooks/use-new-order-alert";
import type { BranchItem } from "@/lib/branch";
import { formatBranchAmount } from "@/lib/branch-detail";
import { menusInBranchScope } from "@/lib/branch-scope";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { listAllManagedOrders, orderReference } from "@/lib/managed-orders";
import { cancelManagedOrder, nextDashboardOrderStep, runOrderFlowAction } from "@/lib/order-actions";
import { isOrderCancellable, ORDER_FLOW_ACTION_STATUS, type OrderCancelRequest, type OrderFlowStep } from "@/lib/order-flow";
import {
  ORDER_LATE_MINUTES,
  ORDER_PAGE_SIZE,
  ORDER_TAB_LABEL,
  hiddenOrderFilterCount,
  isLateOrder,
  matchesOrderTab,
  orderAgeMinutes,
  orderStatusTone,
  orderTabCounts,
  parseOrderListFilters,
  serializeOrderListFilters,
  visibleOrderTabs,
  type OrderListFilters,
} from "@/lib/order-list";
import {
  filterManagedOrders,
  formatOrderWhen,
  formatOrderWhenCompact,
  itemSummary,
  managedOrderKey,
  sumOrderRevenue,
  ORDER_CHANNEL_LABEL,
  ORDER_CHANNELS,
  orderAmount,
  orderChannel,
  orderCustomerName,
  orderLocationLabel,
  orderStatusLabel,
  orderTimeline,
  type OrderChannel,
} from "@/lib/order-management";
import type { OrderResponse } from "@/lib/ordering-api";
import { formatSelectedOptionLines } from "@/lib/receipt-ticket";
import { cn } from "@/lib/utils";

const QUERY_KEY = "my-orders";
const SEARCH_DEBOUNCE_MS = 250;

const CHANNEL_ICON: Record<OrderChannel, ComponentType<{ className?: string }>> = {
  QR: QrCode,
  WAITER: ConciergeBell,
  ONLINE: Globe,
  PHONE: Phone,
  UBER_EATS: Store,
  YEMEKSEPETI: Store,
};

/** The button colour follows the status the order moves to. */
function stepTone(step: OrderFlowStep): Tone {
  const tone = orderStatusTone(ORDER_FLOW_ACTION_STATUS[step.action]);
  return tone === "muted" ? "teal" : tone;
}

function marketplacePrintProps(order: OrderResponse) {
  const channel = orderChannel(order);
  if (channel === "UBER_EATS" || channel === "YEMEKSEPETI") {
    return {
      kind: "marketplace" as const,
      source: (channel === "UBER_EATS" ? "UBER_EATS" : "YEMEK_SEPETI") as "UBER_EATS" | "YEMEK_SEPETI",
      order: {
        id: order.id,
        externalOrderId: order.externalOrderId || String(order.id),
        orderNumber: order.orderNumber,
        deliveryType: order.deliveryType,
        totalAmount: orderAmount(order.totalAmount),
        currency: order.currency,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        note: order.note,
        packageCreatedAt: order.submittedAt || order.createdAt,
        items: (order.items ?? []).map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
          detail: [...formatSelectedOptionLines(item.selectedOptions), item.note?.trim()].filter(Boolean).join("\n") || null,
        })),
      },
    };
  }
  return { kind: "kitchen" as const, order };
}

function OrderPrintButton({ order }: { order: OrderResponse }) {
  const props = marketplacePrintProps(order);
  return props.kind === "marketplace" ? (
    <PrintOrderButton kind="marketplace" source={props.source} order={props.order} branchId={order.branchId} />
  ) : (
    <PrintOrderButton kind="kitchen" order={props.order} branchId={order.branchId} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = orderStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
        tone === "muted" ? "bg-muted text-muted-foreground" : TONES[tone],
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

function AgeLabel({ order, now }: { order: OrderResponse; now: number }) {
  const late = isLateOrder(order, now);
  const age = orderAgeMinutes(order, now);
  const when = order.submittedAt || order.createdAt;
  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular-nums", late ? "font-medium text-[#F03245]" : "text-muted-foreground")}
      title={formatOrderWhen(when)}
    >
      {late ? <TriangleAlert className="size-3" aria-hidden /> : null}
      {late && age != null && age < 24 * 60
        ? age < 60
          ? `${age} dk`
          : `${Math.floor(age / 60)} sa ${age % 60 ? `${age % 60} dk` : ""}`.trim()
        : formatOrderWhenCompact(when, now)}
    </span>
  );
}

function StepButton({
  step,
  busy,
  onRun,
  className,
}: {
  step: OrderFlowStep;
  busy: boolean;
  onRun: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onRun}
      className={cn(TONE_BUTTON, TONES[stepTone(step)], "h-8 gap-1.5 px-3 text-xs font-semibold disabled:opacity-60", className)}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {step.label}
    </button>
  );
}

export default function MyOrdersView() {
  return (
    <DigitalMenuHubGate>
      <MyOrdersContent />
    </DigitalMenuHubGate>
  );
}

function MyOrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();
  const branchesQuery = useBranches(true);
  const branches = useMemo(() => branchesQuery.data?.content ?? [], [branchesQuery.data]);
  const branchById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);

  // Filters live in the address, so the list survives a trip to the kitchen screen and back.
  const filters = useMemo(() => parseOrderListFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [search, setSearch] = useState(filters.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const searchTimer = useRef<number | null>(null);
  const listTop = useRef<HTMLDivElement | null>(null);
  const alert = useNewOrderAlert();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearInterval(id);
      if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    };
  }, []);

  const branchScope = filters.branch !== "all" && branchById.has(filters.branch) ? filters.branch : "all";
  const menus = useMemo(() => menusInBranchScope(branches, branchScope), [branches, branchScope]);
  const menuIds = menus.map((menu) => menu.menuId);
  const listKey = JSON.stringify([menuIds, filters.range.from, filters.range.to]);

  const ordersQuery = useQuery({
    queryKey: [QUERY_KEY, menuIds, filters.range.from, filters.range.to],
    enabled: !branchesQuery.isLoading,
    queryFn: async () => {
      const result = await listAllManagedOrders(menus, filters.range);
      alert.observe(listKey, result.orders);
      return result;
    },
    // Without a start date the whole history is downloaded, so it is refreshed far less often.
    refetchInterval: filters.range.from ? 8_000 : 120_000,
  });
  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data]);

  // Everything except the status tab: the tabs and the summary count inside this scope.
  const scoped = useMemo(
    () =>
      filterManagedOrders(orders, {
        from: filters.range.from,
        to: filters.range.to,
        query: filters.query,
        status: "all",
        channel: filters.channel,
        branchId: branchScope,
      }),
    [orders, filters.range.from, filters.range.to, filters.query, filters.channel, branchScope],
  );
  const counts = useMemo(() => orderTabCounts(scoped, now), [scoped, now]);
  const visible = useMemo(() => scoped.filter((order) => matchesOrderTab(order, filters.tab, now)), [scoped, filters.tab, now]);
  const revenue = useMemo(() => sumOrderRevenue(scoped, false), [scoped]);

  const totalPages = Math.max(1, Math.ceil(visible.length / ORDER_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const pageOrders = visible.slice((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE);
  const detail = detailKey ? orders.find((order) => managedOrderKey(order) === detailKey) ?? null : null;
  const hiddenFilters = hiddenOrderFilterCount(filters);
  const narrowed = hiddenFilters > 0 || filters.query.trim() !== "" || filters.tab !== "open";

  const update = (patch: Partial<OrderListFilters>) => {
    const current = parseOrderListFilters(new URLSearchParams(window.location.search));
    const query = serializeOrderListFilters({ ...current, page: 1, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => update({ query: value }), SEARCH_DEBOUNCE_MS);
  };

  const clearAll = () => {
    if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    setSearch("");
    router.replace(pathname, { scroll: false });
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const stepMutation = useMutation({
    mutationFn: ({ order, step }: { order: OrderResponse; step: OrderFlowStep }) => runOrderFlowAction(order, step.action),
    onSuccess: async (_order, { order, step }) => {
      await refresh();
      notify("info", `${orderReference(order)} · ${step.label}`);
    },
    onError: (error) => notify("danger", error instanceof Error ? error.message : "Sipariş güncellenemedi."),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ order, request }: { order: OrderResponse; request: OrderCancelRequest }) =>
      cancelManagedOrder(order, request),
    onSuccess: async () => {
      setCancelOrder(null);
      await refresh();
      notify("info", "Sipariş iptal edildi.");
    },
    onError: (error) => notify("danger", error instanceof Error ? error.message : "Sipariş iptal edilemedi."),
  });

  const stepFor = (order: OrderResponse) =>
    nextDashboardOrderStep(order, order.branchId != null ? branchById.get(order.branchId) : null);
  const stepBusy = (order: OrderResponse) =>
    stepMutation.isPending && stepMutation.variables != null && managedOrderKey(stepMutation.variables.order) === managedOrderKey(order);

  const branchOptions = [
    { value: "all", label: "Tüm şubeler" },
    ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
  ];
  const channelOptions = [
    { value: "all", label: "Tüm kaynaklar" },
    ...ORDER_CHANNELS.map((channel) => ({ value: channel, label: ORDER_CHANNEL_LABEL[channel] })),
  ];

  const selectFields = (
    <>
      {branches.length > 1 ? (
        <SearchableSelect
          className="h-9 w-full"
          value={String(branchScope)}
          onValueChange={(value) => update({ branch: value && value !== "all" ? Number(value) : "all" })}
          options={branchOptions}
          placeholder="Tüm şubeler"
          searchPlaceholder="Şube ara..."
        />
      ) : null}
      <SearchableSelect
        className="h-9 w-full"
        value={filters.channel}
        onValueChange={(value) => update({ channel: (value || "all") as OrderListFilters["channel"] })}
        options={channelOptions}
        placeholder="Tüm kaynaklar"
        searchPlaceholder="Kaynak ara..."
      />
    </>
  );

  const summary = [
    { label: "Aktif", value: String(counts.open), tab: "open" as const },
    { label: `Gecikmiş (${ORDER_LATE_MINUTES}+ dk)`, value: String(counts.late), tab: "late" as const, alert: counts.late > 0 },
    { label: "Sipariş", value: String(counts.all), tab: "all" as const },
    { label: "Ciro (teslim)", value: formatBranchAmount(revenue) },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <DashboardPageHeader
        title="Siparişlerim"
        hint="QR, garson, online ve pazaryeri siparişleri tek listede."
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => alert.setSoundOn(!alert.soundOn)}
              aria-pressed={alert.soundOn}
              aria-label={alert.soundOn ? "Yeni sipariş sesini kapat" : "Yeni sipariş sesini aç"}
              title={alert.soundOn ? "Yeni siparişte ses çalar" : "Ses kapalı"}
            >
              {alert.soundOn ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            </Button>
            <Button asChild variant="outline" className="h-9 flex-1 gap-1.5 sm:flex-none">
              <Link href={DASHBOARD_ROUTES.kitchenScreen(branchScope === "all" ? null : branchScope)}>
                <ChefHat className="size-4" />
                Mutfak ekranı
              </Link>
            </Button>
          </div>
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
        {summary.map((item) => {
          const content = (
            <>
              <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              <span
                className={cn(
                  "text-xl font-semibold tabular-nums tracking-tight",
                  item.alert ? "text-[#F03245]" : "text-foreground",
                )}
              >
                {item.value}
              </span>
            </>
          );
          const base = "flex min-w-[8.5rem] flex-col gap-0.5 rounded-2xl border border-border bg-card px-4 py-3 text-left";
          return item.tab ? (
            <button
              key={item.label}
              type="button"
              onClick={() => update({ tab: item.tab })}
              className={cn(
                base,
                "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filters.tab === item.tab && "border-foreground/20 bg-muted/40",
              )}
            >
              {content}
            </button>
          ) : (
            <div key={item.label} className={base}>
              {content}
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="space-y-2.5 border-b border-border p-3 lg:p-4">
          <div className={cn("flex gap-2 md:grid", branches.length > 1 ? "md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]" : "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                className="h-9 w-full pl-9"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Müşteri, masa veya sipariş no"
                aria-label="Sipariş ara"
              />
            </div>
            <Button type="button" variant="outline" className="h-9 shrink-0 gap-1.5 md:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="size-3.5" />
              Filtre
              {hiddenFilters > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {hiddenFilters}
                </span>
              ) : null}
            </Button>
            <div className="hidden md:contents">{selectFields}</div>
          </div>
          <div className="hidden md:block">
            <DateRangeFilter label="" value={filters.range} onChange={(range) => update({ range })} />
          </div>
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Sipariş durumu" className="-mx-3 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] lg:mx-0 lg:px-0">
              {visibleOrderTabs(counts, filters.tab).map((tab) => {
                const selected = filters.tab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => update({ tab })}
                    className={cn(
                      "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "bg-foreground text-background"
                        : tab === "late"
                          ? "bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {ORDER_TAB_LABEL[tab]}
                    <span className="tabular-nums opacity-70">{counts[tab]}</span>
                  </button>
                );
              })}
            </div>
            {narrowed ? (
              <button
                type="button"
                onClick={clearAll}
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
                Temizle
              </button>
            ) : null}
          </div>
        </div>

        {ordersQuery.data?.storeFailed ? (
          <p className="flex items-center gap-2 border-b border-border bg-[#FFF4E8] px-4 py-2 text-xs text-[#C2410C] dark:bg-[#F97316]/15 dark:text-[#FB923C]">
            <TriangleAlert className="size-3.5 shrink-0" />
            Online mağaza siparişleri alınamadı; liste yalnızca menü siparişlerini gösteriyor.
          </p>
        ) : null}

        <div ref={listTop} className="scroll-mt-20" />
        {ordersQuery.isLoading || branchesQuery.isLoading ? (
          <ul aria-label="Siparişler yükleniyor" className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-3 py-3 lg:px-4">
                <Skeleton className="h-5 w-20 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3.5 w-14" />
              </li>
            ))}
          </ul>
        ) : ordersQuery.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">Siparişler alınamadı.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void ordersQuery.refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-sm font-medium">
              {filters.tab === "open" ? "Şu an aktif sipariş yok" : "Bu filtrelerle sipariş yok"}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {filters.tab === "open"
                ? "Yeni sipariş geldiğinde burada görünür ve ses çalar."
                : "Durumu, tarihi veya kaynağı değiştirerek tekrar bakın."}
            </p>
            {filters.tab !== "all" && counts.all > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => update({ tab: "all" })}>
                Tüm siparişleri göster ({counts.all})
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[7.5rem_minmax(0,1.6fr)_minmax(0,1.2fr)_5.5rem_6rem_9rem] lg:gap-4">
              <span>Durum</span>
              <span>Sipariş</span>
              <span>Kaynak ve konum</span>
              <span>Süre</span>
              <span className="text-right">Tutar</span>
              <span className="sr-only">İşlem</span>
            </div>
            <ul className="divide-y divide-border">
              {pageOrders.map((order) => (
                <OrderRow
                  key={managedOrderKey(order)}
                  order={order}
                  now={now}
                  highlighted={alert.highlighted.has(managedOrderKey(order))}
                  step={stepFor(order)}
                  stepBusy={stepBusy(order)}
                  onStep={(step) => stepMutation.mutate({ order, step })}
                  onOpen={() => setDetailKey(managedOrderKey(order))}
                />
              ))}
            </ul>
            <ListPagination
              page={page}
              pageSize={ORDER_PAGE_SIZE}
              total={visible.length}
              unit="sipariş"
              onPage={(next) => {
                update({ page: next });
                listTop.current?.scrollIntoView({ block: "start" });
              }}
            />
          </>
        )}
      </section>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4">
          <SheetHeader className="p-0 text-left">
            <SheetTitle>Filtrele</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2.5">
            <DateRangeFilter label="Tarih" value={filters.range} onChange={(range) => update({ range })} />
            {selectFields}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={clearAll} disabled={!narrowed}>
              Temizle
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              {visible.length} siparişi göster
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <OrderDetailSheet
        order={detail}
        now={now}
        branch={detail?.branchId != null ? branchById.get(detail.branchId) ?? null : null}
        step={detail ? stepFor(detail) : null}
        stepBusy={detail ? stepBusy(detail) : false}
        onStep={(step) => detail && stepMutation.mutate({ order: detail, step })}
        onCancel={() => detail && setCancelOrder(detail)}
        onClose={() => setDetailKey(null)}
      />

      <OrderCancelDialog
        open={cancelOrder != null}
        subject={cancelOrder ? `${orderLocationLabel(cancelOrder)} ${orderReference(cancelOrder)}` : null}
        busy={cancelMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !cancelMutation.isPending) setCancelOrder(null);
        }}
        onConfirm={(request) => {
          if (!cancelOrder) return;
          cancelMutation.mutate({ order: cancelOrder, request });
        }}
      />
    </div>
  );
}

function OrderRow({
  order,
  now,
  highlighted,
  step,
  stepBusy,
  onStep,
  onOpen,
}: {
  order: OrderResponse;
  now: number;
  highlighted: boolean;
  step: OrderFlowStep | null;
  stepBusy: boolean;
  onStep: (step: OrderFlowStep) => void;
  onOpen: () => void;
}) {
  const channel = orderChannel(order);
  const ChannelIcon = CHANNEL_ICON[channel];
  const customer = orderCustomerName(order);
  const location = orderLocationLabel(order);
  const amount = formatBranchAmount(orderAmount(order.totalAmount), order.currency);
  const items = itemSummary(order);

  return (
    <li
      className={cn(
        "relative px-3 py-2.5 transition-colors hover:bg-muted/40 lg:grid lg:grid-cols-[7.5rem_minmax(0,1.6fr)_minmax(0,1.2fr)_5.5rem_6rem_9rem] lg:items-center lg:gap-4 lg:px-4",
        highlighted && "bg-[#E8FDF2] dark:bg-[#128C7E]/15",
      )}
    >
      <div className="hidden lg:block">
        <StatusBadge status={order.status} />
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="truncate text-left text-sm font-semibold text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {orderReference(order)} · {customer}
          </button>
          <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums lg:hidden">{amount}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{items}</p>
        <div className="mt-1 flex items-center gap-2 text-xs lg:hidden">
          <StatusBadge status={order.status} />
          <span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground">
            <ChannelIcon className="size-3 shrink-0" />
            {location}
          </span>
          <span className="ml-auto shrink-0">
            <AgeLabel order={order} now={now} />
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 lg:block">
        <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
          <ChannelIcon className="size-3.5 shrink-0 text-muted-foreground" />
          {ORDER_CHANNEL_LABEL[channel]}
        </p>
        <p className="truncate text-xs text-muted-foreground">{location}</p>
      </div>

      <div className="hidden text-xs lg:block">
        <AgeLabel order={order} now={now} />
      </div>

      <p className="hidden text-right text-sm font-semibold tabular-nums lg:block">{amount}</p>

      <div className={cn("relative z-10 justify-end lg:flex", step ? "mt-2 flex lg:mt-0" : "hidden")}>
        {step ? <StepButton step={step} busy={stepBusy} onRun={() => onStep(step)} className="w-full lg:w-auto" /> : null}
      </div>
    </li>
  );
}

function OrderDetailSheet({
  order,
  now,
  branch,
  step,
  stepBusy,
  onStep,
  onCancel,
  onClose,
}: {
  order: OrderResponse | null;
  now: number;
  branch: BranchItem | null;
  step: OrderFlowStep | null;
  stepBusy: boolean;
  onStep: (step: OrderFlowStep) => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const open = order != null;
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        {order ? <OrderDetail order={order} now={now} branch={branch} step={step} stepBusy={stepBusy} onStep={onStep} onCancel={onCancel} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function OrderDetail({
  order,
  now,
  branch,
  step,
  stepBusy,
  onStep,
  onCancel,
}: {
  order: OrderResponse;
  now: number;
  branch: BranchItem | null;
  step: OrderFlowStep | null;
  stepBusy: boolean;
  onStep: (step: OrderFlowStep) => void;
  onCancel: () => void;
}) {
  const channel = orderChannel(order);
  const cancellable = isOrderCancellable(order.status, order.deliveryType === "DELIVERY");
  const timeline = orderTimeline(order);
  const late = isLateOrder(order, now);
  const details = [
    { label: "Kaynak", value: ORDER_CHANNEL_LABEL[channel] },
    { label: "Konum", value: orderLocationLabel(order) },
    { label: "Şube", value: branch?.name ?? null },
    { label: "Müşteri", value: orderCustomerName(order) },
    { label: "Telefon", value: order.customerPhone },
    { label: "Adres", value: order.deliveryAddress },
    { label: "Garson", value: order.waiterName },
    { label: "Not", value: order.note },
    { label: "Mutfak notu", value: order.kitchenNote },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value?.trim()));

  return (
    <>
      <SheetHeader className="space-y-2 border-b border-border p-4 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-base">{orderReference(order)}</SheetTitle>
          <StatusBadge status={order.status} />
          {late ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF0F3] px-1.5 py-0.5 text-xs font-medium text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]">
              <TriangleAlert className="size-3" />
              Gecikti
            </span>
          ) : null}
        </div>
        <SheetDescription>
          {formatOrderWhen(order.submittedAt || order.createdAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 p-4">
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          {details.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="break-words text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>

        {(order.items ?? []).length > 0 ? (
          <div className="rounded-xl border border-border">
            <ul className="divide-y divide-border text-sm">
              {(order.items ?? []).map((item, index) => (
                <li key={item.id ?? `${item.productId}-${index}`} className="flex justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium tabular-nums">{item.quantity}×</span> {item.productName || "Ürün"}
                    {item.selectedOptions?.length ? (
                      <span className="block text-xs text-muted-foreground">
                        {item.selectedOptions.map((option) => option.optionName).filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    {item.note ? <span className="block text-xs text-muted-foreground">{item.note}</span> : null}
                  </span>
                  {item.lineTotal != null || item.unitPrice != null ? (
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatBranchAmount(orderAmount(item.lineTotal ?? Number(item.unitPrice) * item.quantity), order.currency)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border px-3 py-2 text-sm font-semibold">
              <span>Toplam</span>
              <span className="tabular-nums">{formatBranchAmount(orderAmount(order.totalAmount), order.currency)}</span>
            </div>
          </div>
        ) : null}

        {timeline.length > 0 ? (
          <ol className="space-y-2 border-l border-border pl-4 text-xs">
            {timeline.map((event) => (
              <li key={event.key} className="relative">
                <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-border" aria-hidden />
                <span className="font-medium text-foreground">{event.label}</span>
                <span className="text-muted-foreground"> · {formatOrderWhen(event.at)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-background p-4">
        {step ? <StepButton step={step} busy={stepBusy} onRun={() => onStep(step)} className="h-9 flex-1" /> : null}
        <OrderPrintButton order={order} />
        {cancellable ? (
          <Button type="button" variant="outline" size="sm" className="text-[#F03245] hover:text-[#F03245]" onClick={onCancel}>
            İptal et
          </Button>
        ) : null}
      </div>
    </>
  );
}
