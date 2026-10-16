"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  BranchReportPicker,
  preferredMenuQrForBranch,
  useBranchReportSelection,
} from "@/components/dashboard/BranchReportPicker";
import BranchReportDashboard from "@/components/dashboard/smart-report/BranchReportDashboard";
import { MenuReportSection } from "@/components/dashboard/smart-report/MenuReportSection";
import { OrdersPage } from "@/components/dashboard/smart-report/orders-layout";
import AnalyticsWaiterPerformancePanel from "@/components/dashboard/AnalyticsWaiterPerformancePanel";
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
  const [reportView, setReportView] = useState<ReportView>("revenue");
  const [waiterId, setWaiterId] = useState<number | null>(null);
  const tooltipStyle = useTooltipStyle();
  const { data: accessProfile, isPending: accessPending } = useAccessProfile();
  const canUseSmartReporting = hasScope(accessProfile, "SMART_REPORTING_OWNER");
  const canUseWaiterPanel = hasScope(accessProfile, "WAITER_PANEL_OWNER");
  const canUseRevenue = canUseSmartReporting || canUseWaiterPanel;
  const activeReportView: ReportView =
    !accessPending && !canUseRevenue && reportView !== "menu" ? "menu" : reportView;
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

  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background/95 py-1 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} aria-label={backLabel} className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Raporlar
            </h1>
          </div>
        </div>
      </div>

      {noBranches ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Raporlar için önce bir şube oluşturun.{" "}
          <Link
            href={DASHBOARD_ROUTES.branchCreate}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Şube oluştur
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {!accessPending ? (
            <SlidingTabSelect
              variant="nav"
              ariaLabel="Rapor türü"
              value={activeReportView}
              onValueChange={(next) => {
                if (next === "revenue" && !canUseRevenue) {
                  return;
                }
                if (next === "orders" && !canUseRevenue) {
                  return;
                }
                if (next === "personnel" && !canUseRevenue) {
                  return;
                }
                if (next !== "personnel") {
                  setWaiterId(null);
                }
                setReportView(next as ReportView);
              }}
              items={[
                ...(canUseRevenue ? [{ value: "revenue" as const, label: "Ciro" }] : []),
                { value: "menu", label: "Menü" },
                ...(canUseRevenue ? [{ value: "orders" as const, label: "Sipariş" }] : []),
                ...(canUseRevenue ? [{ value: "personnel" as const, label: "Personel" }] : []),
              ]}
            />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <BranchReportPicker
              branches={branches}
              selectedBranchId={branchId}
              selectedQrId={qrId}
              waiters={waiterOptions}
              selectedWaiterId={waiterId}
              showMenuFilter={activeReportView === "menu"}
              showWaiterFilter={activeReportView === "personnel"}
              onBranchSelect={(nextBranchId) => {
                const branch = branches.find((item) => item.id === nextBranchId);
                const nextQr =
                  activeReportView === "menu" && branch
                    ? preferredMenuQrForBranch(branch)
                    : null;
                select(nextBranchId, nextQr);
                setWaiterId(null);
                router.replace(
                  activeReportView === "menu"
                    ? DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(nextBranchId, nextQr)
                    : DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(nextBranchId),
                  { scroll: false },
                );
              }}
              onMenuSelect={(nextQrId) => {
                if (branchId == null) return;
                select(branchId, nextQrId);
                router.replace(
                  DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId, nextQrId),
                  { scroll: false },
                );
              }}
              onWaiterSelect={setWaiterId}
            />
            <div className="flex justify-end">
              <SlidingTabSelect
                variant="soft"
                ariaLabel="Rapor dönemi"
                value={period}
                onValueChange={(next) => setPeriod(next as AnalyticsPeriod)}
                items={[
                  { value: "yesterday", label: "Dün" },
                  { value: "1d", label: "Bugün" },
                  { value: "7d", label: "7 gün" },
                  { value: "30d", label: "30 gün" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {branchId != null &&
      (activeReportView === "menu" ? menuId != null : true) &&
      loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      {activeReportView === "menu" &&
      branchId != null &&
      menuId == null &&
      !selectionLoading ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Bu şubede raporlanacak menü yok.{" "}
          <Link
            href={DASHBOARD_ROUTES.digitalMenuCreateForBranch(branchId)}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Menü oluştur
          </Link>
        </div>
      ) : null}

      {activeReportView === "menu" && branchId != null && menuId != null && reportQuery.isError ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Menü raporu yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
        </div>
      ) : null}

      {activeReportView === "revenue" && branchId != null && !accessPending && !canUseRevenue ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Ciro raporları Pro veya Ultimate paket ile kullanılabilir.{" "}
          <Link
            href={DASHBOARD_ROUTES.accountPackagesHighlight("SMART_REPORTING")}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Paketleri incele
          </Link>
        </div>
      ) : null}

      {activeReportView === "revenue" && branchId != null && canUseRevenue && revenueQuery.isError ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Ciro raporu yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
        </div>
      ) : null}

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

      {activeReportView === "orders" && branchId != null && !accessPending && !canUseRevenue ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Sipariş raporları Pro veya Ultimate paket ile kullanılabilir.{" "}
          <Link
            href={DASHBOARD_ROUTES.accountPackagesHighlight("SMART_REPORTING")}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Paketleri incele
          </Link>
        </div>
      ) : null}

      {activeReportView === "orders" && branchId != null && canUseRevenue && revenueQuery.isError ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Sipariş raporu yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
        </div>
      ) : null}

      {activeReportView === "orders" &&
      branchId != null &&
      canUseRevenue &&
      !ordersLoading &&
      !revenueQuery.isError &&
      revenueQuery.data ? (
        <OrdersPage revenue={revenueQuery.data} />
      ) : null}

      {activeReportView === "personnel" && branchId != null && !accessPending && !canUseRevenue ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Personel raporları Pro veya Ultimate paket ile kullanılabilir.{" "}
          <Link
            href={DASHBOARD_ROUTES.accountPackagesHighlight("SMART_REPORTING")}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Paketleri incele
          </Link>
        </div>
      ) : null}

      {activeReportView === "personnel" && branchId != null && canUseRevenue && personnelQuery.isError ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Personel raporu yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
        </div>
      ) : null}

      {activeReportView === "personnel" && branchId != null && canUseRevenue && !personnelLoading && !personnelQuery.isError && personnelQuery.data ? (
        revenueQuery.data ? (
          <BranchReportDashboard
            revenue={revenueQuery.data}
            waiter={staffReport}
            allowedTabs={["staff"]}
            initialTab="staff"
            staffRoles={staffRoles}
          />
        ) : (
          <AnalyticsWaiterPerformancePanel
            report={staffReport ?? personnelQuery.data}
            tooltipStyle={tooltipStyle}
          />
        )
      ) : null}

      {activeReportView === "menu" &&
      branchId != null &&
      menuId != null &&
      !menuLoading &&
      !reportQuery.isError &&
      report ? (
        <MenuReportSection report={report} orderCount={menuOrderCount} />
      ) : null}
    </div>
  );
}
