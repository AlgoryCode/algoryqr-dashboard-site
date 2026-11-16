"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

import { useRequireScope } from "@/components/auth/RequireScope";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SmartReportCreditDonut } from "@/components/dashboard/smart-report/SmartReportCreditDonut";
import { SmartReportRows } from "@/components/dashboard/smart-report/SmartReportList";
import { SmartReportUsageCard } from "@/components/dashboard/smart-report/SmartReportUsageCard";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  getSmartReportQuotaRequest,
  isSmartReportPending,
  listSmartReportsRequest,
  smartReportAddonCheckoutCode,
  summarizeSmartReportQuota,
} from "@/lib/smart-report";

const RECENT_COUNT = 5;

function BackLink() {
  return (
    <Link href={DASHBOARD_ROUTES.reportsHub} aria-label="Raporlara dön" className={DASHBOARD_BACK}>
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export default function SmartReportsView() {
  const { allowed, isLoading: accessLoading, isError, retry } = useRequireScope("SMART_REPORTING_OWNER");
  const recentQuery = useQuery({
    queryKey: ["smart-reports", "list", "recent"],
    queryFn: () => listSmartReportsRequest({ page: 0, size: RECENT_COUNT, status: "all" }),
    enabled: allowed,
    refetchInterval: (query) =>
      (query.state.data?.content ?? []).some((item) => isSmartReportPending(item.status)) ? 5_000 : false,
  });
  const quotaQuery = useQuery({
    queryKey: ["smart-reports", "quota"],
    queryFn: getSmartReportQuotaRequest,
    enabled: allowed,
  });

  if (isError) return <AccessLoadError onRetry={() => void retry()} />;

  const header = (
    <DashboardPageHeader
      title="Akıllı raporlar"
      back={<BackLink />}
      action={
        <Button asChild>
          <Link href={DASHBOARD_ROUTES.smartReportNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Rapor oluştur
          </Link>
        </Button>
      }
    />
  );

  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {header}
        <DashboardLoadingState label="Akıllı raporlar yükleniyor…" />
      </div>
    );
  }

  const quota = quotaQuery.data;
  const summary = quota ? summarizeSmartReportQuota(quota) : null;
  const total = recentQuery.data?.totalElements;

  return (
    <div className="space-y-6 animate-fade-in">
      {header}

      <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${DASHBOARD_SURFACE} space-y-3 p-4`} aria-label="Rapor özeti">
          <SmartReportCreditDonut />
          <div className="border-t border-border" />
          <Metric label="Oluşturulan" value={total ?? "–"} />
          <Metric
            label="Kalan hak"
            value={
              <span className={summary?.exhausted ? "text-red-600 dark:text-red-400" : undefined}>
                {summary ? summary.totalAvailable : "–"}
              </span>
            }
          />
          {summary?.exhausted ? (
            <Link
              href={DASHBOARD_ROUTES.catalogProductCheckout(smartReportAddonCheckoutCode(quota))}
              className="block border-t border-border pt-3 text-xs font-medium text-primary hover:underline"
            >
              Hakkınız bitti · Ek rapor al
            </Link>
          ) : null}
        </aside>

        <section className={`${DASHBOARD_SURFACE} overflow-hidden`} aria-labelledby="recent-reports-title">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 id="recent-reports-title" className="text-sm font-semibold text-foreground">
              Son raporlar
            </h2>
            {(total ?? 0) > 0 ? (
              <Link
                href={DASHBOARD_ROUTES.smartReportHistory}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Tümünü gör
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
          <SmartReportRows
            items={recentQuery.data?.content ?? []}
            isLoading={recentQuery.isLoading}
            isError={recentQuery.isError}
            emptyText="Henüz rapor yok. “Rapor oluştur” ile ilk raporunuzu başlatın."
          />
        </section>
      </div>

      <SmartReportUsageCard />
    </div>
  );
}
