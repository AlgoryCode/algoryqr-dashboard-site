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
import { OverviewPage } from "@/components/dashboard/smart-report/overview-layout";
import AnalyticsWaiterPerformancePanel from "@/components/dashboard/AnalyticsWaiterPerformancePanel";
import { useBranchAnalyticsReport } from "@/hooks/use-branch-analytics-report";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { useBranchWaiterPerformanceReport } from "@/hooks/use-branch-waiter-performance-report";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import { hasScope } from "@/lib/auth-user";
import { SlidingTabSelect } from "@/components/ui/sliding-tab-select";
import { listMenuUsers } from "@/lib/waiter-api";
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

type ReportView = "overview" | "menu" | "revenue" | "personnel";

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
  const [reportView, setReportView] = useState<ReportView>("overview");
  const [waiterId, setWaiterId] = useState<number | null>(null);
  const activeReportView: ReportView = reportView;
  const tooltipStyle = useTooltipStyle();
  const { data: accessProfile } = useAccessProfile();
  const canUseSmartReporting = hasScope(accessProfile, "SMART_REPORTING_OWNER");
  const canUseWaiterPanel = hasScope(accessProfile, "WAITER_PANEL_OWNER");
  const canUseRevenue = canUseSmartReporting || canUseWaiterPanel;
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
          (activeReportView === "overview" || activeReportView === "revenue"),
  );
  const revenueQuery = useBranchRevenueReport(
    branchId,
    reportMenuId,
    range.from,
    range.to,
    canUseRevenue &&
      branchId != null &&
      (activeReportView === "overview" ||
        activeReportView === "revenue" ||
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
      .filter((row) => row.waiterId != null)
      .map((row) => ({ id: row.waiterId as number, name: row.displayName }));
  }, [personnelQuery.data, waitersQuery.data]);
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
    const urlBranch = searchParams.get("branch");
    const urlQr = searchParams.get("qr");
    if (activeReportView === "menu") {
      if (qrId == null) return;
      if (urlBranch === String(branchId) && urlQr === String(qrId)) return;
      router.replace(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId, qrId), {
        scroll: false,
      });
      return;
    }
    if (urlBranch === String(branchId) && urlQr == null) return;
    router.replace(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId), { scroll: false });
  }, [activeReportView, branchId, qrId, router, searchParams]);

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
  const personnelLoading = selectionLoading || personnelQuery.isLoading;
  const overviewLoading =
    selectionLoading ||
    reportQuery.isLoading ||
    (canUseRevenue && revenueQuery.isLoading);
  const loading =
    activeReportView === "overview"
      ? overviewLoading
      : activeReportView === "revenue"
        ? revenueLoading
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
          <SlidingTabSelect
              variant="nav"
              ariaLabel="Rapor türü"
              value={reportView}
              onValueChange={(next) => {
                if (next === "revenue" && !canUseRevenue) {
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
                { value: "overview", label: "Genel Bakış" },
                { value: "menu", label: "Menü" },
                ...(canUseRevenue ? [{ value: "revenue" as const, label: "Ciro" }] : []),
                ...(canUseRevenue ? [{ value: "personnel" as const, label: "Personel" }] : []),
              ]}
            />
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

      {activeReportView === "overview" &&
      branchId != null &&
      reportQuery.isError &&
      (!canUseRevenue || revenueQuery.isError) ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Rapor yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
        </div>
      ) : null}

      {activeReportView === "overview" &&
      branchId != null &&
      !overviewLoading &&
      !(reportQuery.isError && (!canUseRevenue || revenueQuery.isError)) ? (
        <OverviewPage
          revenue={revenueQuery.data}
          visits={reportQuery.data}
          canUseRevenue={canUseRevenue}
        />
      ) : null}

      {activeReportView === "menu" && branchId != null && menuId != null && reportQuery.isError ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Menü raporu yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
        </div>
      ) : null}

      {activeReportView === "revenue" && branchId != null && !canUseRevenue ? (
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

      {activeReportView === "personnel" && branchId != null && !canUseRevenue ? (
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
