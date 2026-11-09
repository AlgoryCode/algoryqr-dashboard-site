"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Lock,
  QrCode,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  BranchReportPicker,
  preferredMenuQrForBranch,
  useBranchReportSelection,
} from "@/components/dashboard/BranchReportPicker";
import BranchReportDashboard from "@/components/dashboard/smart-report/BranchReportDashboard";
import { MenuReportSection } from "@/components/dashboard/smart-report/MenuReportSection";
import { OrdersPage } from "@/components/dashboard/smart-report/orders-layout";
import AnalyticsWaiterPerformancePanel from "@/components/dashboard/AnalyticsWaiterPerformancePanel";
import {
  REPORT_CARD,
  ReportLoadingSkeleton,
  ReportStateCard,
  ReportTypeNav,
  ResponsiveSheet,
  formatReportRange,
  type ReportTypeItem,
} from "@/components/dashboard/reports/ReportShell";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatBranchListLabel } from "@/lib/branch";
import { cn } from "@/lib/utils";
import { useBranchAnalyticsReport } from "@/hooks/use-branch-analytics-report";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { useBranchWaiterPerformanceReport } from "@/hooks/use-branch-waiter-performance-report";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import { hasScope } from "@/lib/auth-user";
import { SlidingTabSelect } from "@/components/ui/sliding-tab-select";
import { listMenuUsers, STAFF_ROLE_LABEL } from "@/lib/personnel-management-api";
import { filterStaffReport } from "@/components/dashboard/smart-report/staff-metrics";
import {
  reportingPeriodRange,
  type AnalyticsPeriod,
} from "@/reporting";

function useTooltipStyle() {
  if (typeof document === "undefined") {
    return {
      backgroundColor: "hsl(0 0% 100%)",
      border: "1px solid hsl(0 0% 88%)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "hsl(0 0% 10%)",
      boxShadow: "0 2px 8px hsl(0 0% 0% / 0.08)",
    };
  }
  const isDark = document.documentElement.classList.contains("dark");
  return {
    backgroundColor: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
    border: isDark ? "1px solid hsl(0 0% 15%)" : "1px solid hsl(0 0% 88%)",
    borderRadius: "8px",
    fontSize: "12px",
    color: isDark ? "hsl(0 0% 93%)" : "hsl(0 0% 10%)",
    boxShadow: isDark ? "none" : "0 2px 8px hsl(0 0% 0% / 0.08)",
  };
}

type ReportView = "menu" | "revenue" | "orders" | "personnel";

const PERIOD_OPTIONS: ReadonlyArray<{ value: AnalyticsPeriod; label: string }> = [
  { value: "1d", label: "Bugün" },
  { value: "yesterday", label: "Dün" },
  { value: "7d", label: "Son 7 gün" },
  { value: "30d", label: "Son 30 gün" },
];

function parseReportView(value: string | null): ReportView | null {
  return value === "menu" || value === "revenue" || value === "orders" || value === "personnel" ? value : null;
}

export default function AnalyticsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialBranchId = useMemo(() => {
    const raw = Number(searchParams.get("branch"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const initialQrId = useMemo(() => {
    const raw = Number(searchParams.get("qr"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  // null: kullanıcı seçim yapmadı; paket durumuna göre varsayılan görünüm kullanılır.
  const [reportView, setReportView] = useState<ReportView | null>(() =>
    parseReportView(searchParams.get("view")),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const [waiterId, setWaiterId] = useState<number | null>(null);
  // Personel detayından gelen ?staff=ID; personel listesi yüklenince bir kez seçilir.
  const pendingStaffIdRef = useRef<number | null>(
    (() => {
      const raw = Number(searchParams.get("staff"));
      return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
    })(),
  );
  const tooltipStyle = useTooltipStyle();
  const { data: accessProfile, isPending: accessPending } = useAccessProfile();
  const canUseSmartReporting = hasScope(accessProfile, "SMART_REPORTING_OWNER");
  const canUseWaiterPanel = hasScope(accessProfile, "WAITER_PANEL_OWNER");
  const canUseRevenue = canUseSmartReporting || canUseWaiterPanel;
  const activeReportView: ReportView =
    reportView ?? (accessPending || canUseRevenue ? "revenue" : "menu");
  const {
    branches,
    selection,
    branchId,
    qrId,
    menuId,
    loading: selectionLoading,
    empty: noBranches,
    select,
  } = useBranchReportSelection(initialBranchId, initialQrId);
  const range = useMemo(() => reportingPeriodRange(period), [period]);
  const reportMenuId = activeReportView === "menu" ? menuId : null;
  const reportQuery = useBranchAnalyticsReport(
    branchId,
    reportMenuId,
    range.from,
    range.to,
    activeReportView === "menu"
      ? branchId != null && menuId != null
      : branchId != null &&
          (activeReportView === "revenue" || activeReportView === "orders"),
  );
  const revenueQuery = useBranchRevenueReport(
    branchId,
    reportMenuId,
    range.from,
    range.to,
    canUseRevenue &&
      branchId != null &&
      (activeReportView === "revenue" ||
        activeReportView === "orders" ||
        activeReportView === "personnel" ||
        (activeReportView === "menu" && menuId != null)),
  );
  const personnelQuery = useBranchWaiterPerformanceReport(
    branchId,
    reportMenuId,
    range.from,
    range.to,
    canUseRevenue && branchId != null && activeReportView === "personnel",
  );
  const waitersQuery = useQuery({
    queryKey: ["menu-users", branchId],
    queryFn: () => listMenuUsers(branchId as number),
    enabled: canUseRevenue && branchId != null && activeReportView === "personnel",
    retry: 1,
  });
  const waiterOptions = useMemo(() => {
    const fromRoster = (waitersQuery.data?.waiters ?? [])
      .filter((row) => row.active !== false)
      .map((row) => ({ id: row.id, name: row.displayName }));
    if (fromRoster.length > 0) return fromRoster;
    return (personnelQuery.data?.waiters ?? [])
      .map((row) => ({ id: row.staffId ?? row.waiterId, name: row.displayName }))
      .filter((row): row is { id: number; name: string } => row.id != null);
  }, [personnelQuery.data, waitersQuery.data]);
  const staffRoles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of waitersQuery.data?.waiters ?? []) {
      if (!row.staffRole) continue;
      const label = row.staffRole === "KITCHEN" ? "Aşçı" : STAFF_ROLE_LABEL[row.staffRole];
      map[row.displayName] = label;
      map[String(row.id)] = label;
    }
    return map;
  }, [waitersQuery.data]);
  const staffReport = useMemo(
    () =>
      personnelQuery.data ? filterStaffReport(personnelQuery.data, waiterId) : undefined,
    [personnelQuery.data, waiterId],
  );
  const report = reportQuery.data;
  const backHref =
    selection?.menu?.qrId != null
      ? DASHBOARD_ROUTES.digitalMenuEdit(selection.menu.qrId)
      : pathname === DASHBOARD_ROUTES.reportsHub
        ? DASHBOARD_ROUTES.overview
        : DASHBOARD_ROUTES.reportsHub;
  const backLabel =
    selection?.menu?.qrId != null
      ? "Menüye dön"
      : pathname === DASHBOARD_ROUTES.reportsHub
        ? "Genel bakışa dön"
        : "Raporlara dön";

  useEffect(() => {
    setWaiterId(null);
  }, [branchId, menuId]);

  useEffect(() => {
    if (branchId == null) return;
    if (activeReportView === "menu" && qrId == null) return;
    const target =
      activeReportView === "menu" && qrId != null
        ? DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId, qrId)
        : DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId);
    const targetUrl = new URL(target, "http://dashboard.local");
    const currentQuery = searchParams.toString();
    const targetQuery = targetUrl.searchParams.toString();
    if (pathname === targetUrl.pathname && currentQuery === targetQuery) return;
    router.replace(target, { scroll: false });
  }, [activeReportView, branchId, pathname, qrId, router, searchParams]);

  useEffect(() => {
    if (activeReportView !== "menu" || branchId == null || qrId != null) return;
    const branch = branches.find((item) => item.id === branchId);
    if (!branch) return;
    const nextQr = preferredMenuQrForBranch(branch);
    if (nextQr != null) select(branchId, nextQr);
  }, [activeReportView, branchId, branches, qrId, select]);

  useEffect(() => {
    const pending = pendingStaffIdRef.current;
    if (pending == null || waiterOptions.length === 0) return;
    pendingStaffIdRef.current = null;
    if (waiterOptions.some((row) => row.id === pending)) {
      setWaiterId(pending);
    }
  }, [waiterOptions]);

  useEffect(() => {
    if (waiterId == null) return;
    if (!waiterOptions.some((row) => row.id === waiterId)) {
      setWaiterId(null);
    }
  }, [waiterId, waiterOptions]);

  const menuLoading = selectionLoading || reportQuery.isLoading;
  const revenueLoading = selectionLoading || revenueQuery.isLoading;
  const ordersLoading = revenueLoading;
  const personnelLoading = selectionLoading || personnelQuery.isLoading;
  const loading = accessPending
    ? activeReportView !== "menu"
    : activeReportView === "revenue"
      ? revenueLoading
      : activeReportView === "orders"
        ? ordersLoading
        : activeReportView === "personnel"
          ? personnelLoading
          : menuLoading;
  const menuOrderCount = revenueQuery.data?.kpis?.orderCount ?? null;

  const activeQueries = [
    activeReportView === "menu" || activeReportView === "revenue" || activeReportView === "orders"
      ? reportQuery
      : null,
    canUseRevenue ? revenueQuery : null,
    activeReportView === "personnel" && canUseRevenue ? personnelQuery : null,
  ].filter((query): query is NonNullable<typeof query> => query != null);
  const refreshing = activeQueries.some((query) => query.isFetching);
  const lastUpdatedAt = Math.max(0, ...activeQueries.map((query) => query.dataUpdatedAt ?? 0));
  const lastUpdatedLabel =
    lastUpdatedAt > 0
      ? new Date(lastUpdatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      : null;
  const refreshAll = () => {
    for (const query of activeQueries) void query.refetch();
  };

  const branchLabel = selection?.branch ? formatBranchListLabel(selection.branch) : null;
  const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "";
  const rangeLabel = formatReportRange(range.from, range.to);
  const selectedWaiterName =
    waiterId != null ? waiterOptions.find((row) => row.id === waiterId)?.name ?? null : null;

  const locked = !accessPending && !canUseRevenue && activeReportView !== "menu";
  const reportTypes: ReportTypeItem<ReportView>[] = [
    { value: "revenue", label: "Ciro", description: "Satış, tahsilat, kanal ve kategori", icon: Banknote, locked: !accessPending && !canUseRevenue },
    { value: "orders", label: "Sipariş", description: "Günlük ve saatlik sipariş akışı", icon: ShoppingBag, locked: !accessPending && !canUseRevenue },
    { value: "personnel", label: "Personel", description: "Satılan ürün, ciro, bahşiş, komisyon", icon: Users, locked: !accessPending && !canUseRevenue },
    { value: "menu", label: "Menü", description: "Ziyaret, ilgi ve ürün görüntülenme", icon: QrCode },
  ];

  const changeReportView = (next: ReportView) => {
    if (next !== "personnel") setWaiterId(null);
    setReportView(next);
  };

  const handleBranchSelect = (nextBranchId: number) => {
    const branch = branches.find((item) => item.id === nextBranchId);
    const nextQr = activeReportView === "menu" && branch ? preferredMenuQrForBranch(branch) : null;
    select(nextBranchId, nextQr);
    setWaiterId(null);
    router.replace(
      activeReportView === "menu"
        ? DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(nextBranchId, nextQr)
        : DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(nextBranchId),
      { scroll: false },
    );
  };

  const handleMenuSelect = (nextQrId: number) => {
    if (branchId == null) return;
    select(branchId, nextQrId);
    router.replace(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId, nextQrId), { scroll: false });
  };

  const picker = (
    <BranchReportPicker
      branches={branches}
      selectedBranchId={branchId}
      selectedQrId={qrId}
      waiters={waiterOptions}
      selectedWaiterId={waiterId}
      showMenuFilter={activeReportView === "menu"}
      showWaiterFilter={activeReportView === "personnel" && canUseRevenue}
      onBranchSelect={handleBranchSelect}
      onMenuSelect={handleMenuSelect}
      onWaiterSelect={setWaiterId}
    />
  );

  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={refreshAll}
      disabled={refreshing || branchId == null}
      aria-label="Raporu yenile"
      title={lastUpdatedLabel ? `Son güncelleme ${lastUpdatedLabel}` : "Raporu yenile"}
    >
      <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
    </Button>
  );

  const upsell = (title: string) => (
    <ReportStateCard
      icon={Lock}
      tone="upsell"
      title={title}
      description="Bu rapor Pro veya Ultimate paket ile kullanılabilir. Paketi yükselttiğinizde ciro, sipariş ve personel raporları açılır."
      action={{ label: "Paketleri incele", href: DASHBOARD_ROUTES.accountPackagesHighlight("SMART_REPORTING") }}
    />
  );

  const loadError = (title: string, retry: () => void) => (
    <ReportStateCard
      icon={AlertTriangle}
      tone="danger"
      title={title}
      description="Bağlantınızı, yetkinizi ve menü sahipliğini kontrol edip tekrar deneyin."
      action={{ label: "Tekrar dene", onClick: retry }}
    />
  );

  const showLoading =
    branchId != null && (activeReportView === "menu" ? menuId != null : !locked) && loading;

  return (
    <div className="min-w-0 space-y-5 animate-fade-in">
      {/* Başlık */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} aria-label={backLabel} className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Raporlar</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              {branchLabel ? <span className="font-medium text-foreground">{branchLabel}</span> : null}
              {branchLabel ? <span aria-hidden>·</span> : null}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {rangeLabel}
              </span>
              {lastUpdatedLabel ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Güncellendi {lastUpdatedLabel}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {noBranches ? (
        <ReportStateCard
          icon={Building2}
          title="Henüz şube yok"
          description="Raporlar şube bazında hazırlanır. Başlamak için ilk şubenizi oluşturun."
          action={{ label: "Şube oluştur", href: DASHBOARD_ROUTES.branchCreate }}
        />
      ) : (
        <div className="space-y-3">
          {!accessPending ? (
            <ReportTypeNav items={reportTypes} value={activeReportView} onChange={changeReportView} />
          ) : null}

          {/* Filtreler */}
          <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1 backdrop-blur">
            {isMobile ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className={cn(
                    REPORT_CARD,
                    "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label="Filtreleri aç"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {branchLabel ?? "Şube seçin"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {periodLabel}
                      {selectedWaiterName ? ` · ${selectedWaiterName}` : ""}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                {refreshButton}
              </div>
            ) : (
              <div className={cn(REPORT_CARD, "flex flex-wrap items-center gap-3 p-2.5")}>
                <div className="min-w-0 flex-1">{picker}</div>
                <SlidingTabSelect
                  variant="soft"
                  ariaLabel="Rapor dönemi"
                  value={period}
                  onValueChange={(next) => setPeriod(next as AnalyticsPeriod)}
                  items={PERIOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                />
                {refreshButton}
              </div>
            )}
          </div>

          {selectedWaiterName && activeReportView === "personnel" ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Filtre:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs font-medium text-primary">
                <UserRound className="h-3 w-3" />
                {selectedWaiterName}
                <button
                  type="button"
                  onClick={() => setWaiterId(null)}
                  className="rounded-full p-0.5 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Personel filtresini kaldır"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          ) : null}
        </div>
      )}

      {showLoading ? <ReportLoadingSkeleton /> : null}

      {/* Menü */}
      {activeReportView === "menu" && branchId != null && menuId == null && !selectionLoading ? (
        <ReportStateCard
          icon={QrCode}
          title="Bu şubede menü yok"
          description="Menü raporu için şubeye bağlı en az bir dijital menü gerekir."
          action={{ label: "Menü oluştur", href: DASHBOARD_ROUTES.digitalMenuCreateForBranch(branchId) }}
        />
      ) : null}
      {activeReportView === "menu" && branchId != null && menuId != null && reportQuery.isError
        ? loadError("Menü raporu yüklenemedi", () => void reportQuery.refetch())
        : null}
      {activeReportView === "menu" && branchId != null && menuId != null && !menuLoading && !reportQuery.isError && report ? (
        <MenuReportSection report={report} orderCount={menuOrderCount} />
      ) : null}

      {/* Ciro */}
      {activeReportView === "revenue" && branchId != null && locked ? upsell("Ciro raporu paketinizde yok") : null}
      {activeReportView === "revenue" && branchId != null && canUseRevenue && revenueQuery.isError
        ? loadError("Ciro raporu yüklenemedi", () => void revenueQuery.refetch())
        : null}
      {activeReportView === "revenue" && branchId != null && canUseRevenue && !revenueLoading && !revenueQuery.isError && revenueQuery.data ? (
        <BranchReportDashboard
          revenue={revenueQuery.data}
          visits={reportQuery.data}
          waiter={staffReport}
          loading={revenueLoading}
          allowedTabs={["overview", "revenue", "channels", "products"]}
          initialTab="overview"
        />
      ) : null}

      {/* Sipariş */}
      {activeReportView === "orders" && branchId != null && locked ? upsell("Sipariş raporu paketinizde yok") : null}
      {activeReportView === "orders" && branchId != null && canUseRevenue && revenueQuery.isError
        ? loadError("Sipariş raporu yüklenemedi", () => void revenueQuery.refetch())
        : null}
      {activeReportView === "orders" && branchId != null && canUseRevenue && !ordersLoading && !revenueQuery.isError && revenueQuery.data ? (
        <OrdersPage revenue={revenueQuery.data} />
      ) : null}

      {/* Personel */}
      {activeReportView === "personnel" && branchId != null && locked ? upsell("Personel raporu paketinizde yok") : null}
      {activeReportView === "personnel" && branchId != null && canUseRevenue && personnelQuery.isError
        ? loadError("Personel raporu yüklenemedi", () => void personnelQuery.refetch())
        : null}
      {activeReportView === "personnel" && branchId != null && canUseRevenue && !personnelLoading && !personnelQuery.isError && personnelQuery.data ? (
        revenueQuery.data ? (
          <BranchReportDashboard
            revenue={revenueQuery.data}
            waiter={staffReport}
            allowedTabs={["staff"]}
            initialTab="staff"
            staffRoles={staffRoles}
            onStaffFocus={(id) => setWaiterId(id)}
          />
        ) : (
          <AnalyticsWaiterPerformancePanel report={staffReport ?? personnelQuery.data} tooltipStyle={tooltipStyle} />
        )
      ) : null}

      {/* Mobil filtre penceresi */}
      <ResponsiveSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        icon={SlidersHorizontal}
        title="Rapor filtreleri"
        description="Şube, dönem ve personel seçimi rapora hemen uygulanır."
        footer={
          <Button type="button" className="w-full" onClick={() => setFiltersOpen(false)}>
            Raporu göster
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Şube ve filtre</p>
            {picker}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Dönem</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Rapor dönemi">
              {PERIOD_OPTIONS.map((option) => {
                const selected = option.value === period;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPeriod(option.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span className="flex items-center justify-between text-sm font-medium text-foreground">
                      {option.label}
                      {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatReportRange(reportingPeriodRange(option.value).from, reportingPeriodRange(option.value).to)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ResponsiveSheet>
    </div>
  );
}
