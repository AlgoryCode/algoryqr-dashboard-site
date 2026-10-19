"use client";

import { useState } from "react";

import { BranchScopeFilter } from "@/components/dashboard/BranchScopeFilter";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { OverviewAlerts } from "@/components/dashboard/overview/OverviewAlerts";
import { OverviewBranchStatus } from "@/components/dashboard/overview/OverviewBranchStatus";
import { OverviewModules } from "@/components/dashboard/overview/OverviewModules";
import { OverviewOrderQueue } from "@/components/dashboard/overview/OverviewOrderQueue";
import { OverviewSummaryCards } from "@/components/dashboard/overview/OverviewSummaryCards";
import { ReportIssueCard } from "@/components/dashboard/ReportIssueCard";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { useBranches } from "@/hooks/use-branches";
import { useAccessSession } from "@/hooks/use-commerce";
import { useOverviewDashboard } from "@/hooks/use-overview-dashboard";
import { hasScope } from "@/lib/auth-user";
import type { BranchScope } from "@/lib/branch-scope";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_TILE_ROW } from "@/lib/dashboard-surface";

function todayLabel(): string {
  return new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

export default function DashboardOverviewView() {
  const { data: accessProfile, isLoading: accessLoading } = useAccessProfile();
  const accessSession = useAccessSession();
  const showMenus = hasScope(accessProfile, "QR_MENU_OWNER");
  const canReport = hasScope(accessProfile, "SMART_REPORTING_OWNER");
  const canUseWaiterPanel = hasScope(accessProfile, "WAITER_PANEL_OWNER");
  const branchesQuery = useBranches(showMenus);
  const branches = branchesQuery.data?.content ?? [];
  const [scope, setScope] = useState<BranchScope>("all");
  const effectiveScope: BranchScope =
    scope !== "all" && branches.some((branch) => branch.id === scope) ? scope : "all";
  const scopedBranches =
    effectiveScope === "all" ? branches : branches.filter((branch) => branch.id === effectiveScope);

  const overview = useOverviewDashboard(branches, effectiveScope, {
    revenue: showMenus && (canReport || canUseWaiterPanel),
    orders: showMenus,
    menus: showMenus,
    accounting: accessSession.data?.decision === "ALLOW",
    shifts: showMenus && canReport,
  });

  const liveOrdersHref = DASHBOARD_ROUTES.orders;
  const dataLoading = accessLoading || branchesQuery.isLoading;

  return (
    <div className="animate-fade-in space-y-6">
      <DashboardPageHeader
        title="Genel Bakış"
        hint={`Bugün, ${todayLabel()}`}
        action={
          branches.length > 1 ? (
            <BranchScopeFilter
              branches={branches}
              value={effectiveScope}
              onChange={setScope}
              label="Görünüm"
              className="w-full sm:w-60"
            />
          ) : null
        }
      />

      {showMenus || accessLoading ? (
        <>
          <section aria-label="Bugünün özeti" className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bugünün özeti{effectiveScope === "all" && branches.length > 1 ? " · tüm şubeler" : ""}
            </h2>
            <OverviewSummaryCards
              summary={overview.summary}
              loading={dataLoading || overview.summaryLoading}
              error={overview.summaryError}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewOrderQueue
              queue={overview.queue}
              loading={dataLoading || overview.queueLoading}
              href={liveOrdersHref}
            />
            <OverviewBranchStatus branches={scopedBranches} loading={dataLoading} />
          </div>

          <OverviewAlerts alerts={overview.alerts} loading={dataLoading || overview.alertsLoading} />
        </>
      ) : null}

      <OverviewModules />

      <section aria-label="Destek">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <ReportIssueCard className={`${DASHBOARD_TILE_ROW} items-start`} />
        </div>
      </section>
    </div>
  );
}
