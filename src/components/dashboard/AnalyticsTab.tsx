"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";

import { BranchReportPicker, useBranchReportSelection } from "@/components/dashboard/BranchReportPicker";
import BranchReportDashboard from "@/components/dashboard/smart-report/BranchReportDashboard";
import { OverviewPage } from "@/components/dashboard/smart-report/overview-layout";
import TrafficSection from "@/components/dashboard/smart-report/TrafficSection";
import AnalyticsWaiterPerformancePanel from "@/components/dashboard/AnalyticsWaiterPerformancePanel";
import { useBranchAnalyticsReport } from "@/hooks/use-branch-analytics-report";
import { useBranchRevenueReport } from "@/hooks/use-branch-revenue-report";
import { useBranchWaiterPerformanceReport } from "@/hooks/use-branch-waiter-performance-report";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
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

type ReportView = "overview" | "visits" | "revenue" | "personnel";

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
    loading: selectionLoading,
    empty: noBranches,
    select,
  } = useBranchReportSelection(initialBranchId, initialQrId);
  const range = useMemo(() => reportingPeriodRange(period), [period]);
  const reportQuery = useBranchAnalyticsReport(
    branchId,
    null,
    range.from,
    range.to,
    branchId != null,
  );
  const revenueQuery = useBranchRevenueReport(
    branchId,
    null,
    range.from,
    range.to,
    canUseRevenue &&
      branchId != null &&
      (activeReportView === "overview" ||
        activeReportView === "revenue" ||
        activeReportView === "personnel"),
  );
  const personnelQuery = useBranchWaiterPerformanceReport(
    branchId,
    null,
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
        ? null
        : DASHBOARD_ROUTES.reportsHub;

  useEffect(() => {
    setWaiterId(null);
  }, [branchId]);

  useEffect(() => {
    if (waiterId == null) return;
    if (!waiterOptions.some((row) => row.id === waiterId)) {
      setWaiterId(null);
    }
  }, [waiterId, waiterOptions]);

  const visitLoading = selectionLoading || reportQuery.isLoading;
  const revenueLoading = selectionLoading || revenueQuery.isLoading;
  const personnelLoading = selectionLoading || personnelQuery.isLoading;
  const overviewLoading =
    selectionLoading || reportQuery.isLoading || (canUseRevenue && revenueQuery.isLoading);
  const loading =
    activeReportView === "overview"
      ? overviewLoading
      : activeReportView === "revenue"
        ? revenueLoading
        : activeReportView === "personnel"
          ? personnelLoading
          : visitLoading;

  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background/95 py-1 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : null}
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
                { value: "visits", label: "Ürün & Ziyaret" },
                ...(canUseRevenue ? [{ value: "revenue" as const, label: "Ciro" }] : []),
                ...(canUseRevenue ? [{ value: "personnel" as const, label: "Personel" }] : []),
              ]}
            />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <BranchReportPicker
              branches={branches}
              selectedBranchId={branchId}
              waiters={waiterOptions}
              selectedWaiterId={waiterId}
              showWaiterFilter={activeReportView === "personnel"}
              onSelect={(nextBranchId, nextWaiterId) => {
                if (nextBranchId !== branchId) {
                  select(nextBranchId, null);
                  setWaiterId(null);
                  router.replace(
                    DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(nextBranchId),
                    { scroll: false },
                  );
                  return;
                }
                setWaiterId(nextWaiterId);
              }}
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

      {branchId != null && loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
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

      {activeReportView === "visits" && branchId != null && reportQuery.isError ? (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card p-6 text-sm text-muted-foreground">
          Rapor yüklenemedi. Yetkinizi ve menü sahipliğini kontrol edin.
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

      {activeReportView === "visits" && branchId != null && !visitLoading && !reportQuery.isError && report ? (
        <TrafficSection visits={report} />
      ) : null}
    </div>
  );
}
