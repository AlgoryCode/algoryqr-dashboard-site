"use client";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { OverviewAttention } from "@/components/dashboard/overview/OverviewAttention";
import { OverviewBranchStatus } from "@/components/dashboard/overview/OverviewBranchStatus";
import { OverviewLauncher } from "@/components/dashboard/overview/OverviewLauncher";
import { OverviewQuickActions } from "@/components/dashboard/overview/OverviewQuickActions";
import { ReportIssueCard } from "@/components/dashboard/ReportIssueCard";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { useBranches } from "@/hooks/use-branches";
import { useAccessSession } from "@/hooks/use-commerce";
import { useOverviewDashboard } from "@/hooks/use-overview-dashboard";
import { hasScope } from "@/lib/auth-user";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";

function greeting(hour = new Date().getHours()): string {
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Home page: what to start, what needs a decision, which branches are open, and every app.
 * Sales figures live in Raporlar; repeating them here only pushed the useful parts down.
 */
export default function DashboardOverviewView() {
  const { data: accessProfile, isLoading: accessLoading } = useAccessProfile();
  const accessSession = useAccessSession();
  const showMenus = hasScope(accessProfile, "QR_MENU_OWNER");
  const canReport = hasScope(accessProfile, "SMART_REPORTING_OWNER");
  const branchesQuery = useBranches(showMenus);
  const branches = branchesQuery.data?.content ?? [];

  const overview = useOverviewDashboard(branches, "all", {
    revenue: false,
    orders: showMenus,
    menus: showMenus,
    accounting: accessSession.data?.decision === "ALLOW",
    shifts: showMenus && canReport,
  });
  const dataLoading = accessLoading || branchesQuery.isLoading;

  return (
    <div className="animate-fade-in space-y-8">
      <DashboardPageHeader title={greeting()} hint={todayLabel()} />

      <OverviewQuickActions />

      {showMenus || accessLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <OverviewAttention
            queue={overview.queue}
            alerts={overview.alerts}
            loading={dataLoading || overview.queueLoading || overview.alertsLoading}
          />
          <OverviewBranchStatus branches={branches} loading={dataLoading} />
        </div>
      ) : null}

      <OverviewLauncher />

      <ReportIssueCard
        className={`${DASHBOARD_SURFACE} flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30 sm:max-w-sm`}
      />
    </div>
  );
}
