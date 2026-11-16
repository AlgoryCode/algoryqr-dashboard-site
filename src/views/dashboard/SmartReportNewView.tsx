"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CalendarDays, Check, Loader2, Sparkles, Store } from "lucide-react";

import { useRequireScope } from "@/components/auth/RequireScope";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SmartReportGeneratingAnimation } from "@/components/dashboard/smart-report/SmartReportGeneratingAnimation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches } from "@/hooks/use-branches";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  SMART_REPORT_POLL_INTERVAL_MS,
  createSmartReportRequest,
  formatSmartReportPeriod,
  getSmartReportJobRequest,
  getSmartReportQuotaRequest,
  isSmartReportCompleted,
  isSmartReportFailed,
  resolveSmartReportProcessId,
  smartReportAddonCheckoutCode,
  smartReportPeriodRange,
  summarizeSmartReportQuota,
} from "@/lib/smart-report";
import { cn } from "@/lib/utils";


const DURATIONS = [
  { value: "last7", label: "7 gün" },
  { value: "last30", label: "30 gün" },
] as const;
type Duration = (typeof DURATIONS)[number]["value"];


function errorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } } | null)
    ?.response;
  if (response?.status === 429) return "Rapor hakkınız kalmadı. Ek rapor satın alabilirsiniz.";
  return response?.data?.message?.trim() || "Rapor başlatılamadı. Lütfen tekrar deneyin.";
}

function BackLink() {
  return (
    <Link href={DASHBOARD_ROUTES.smartReports} aria-label="Akıllı raporlara dön" className={DASHBOARD_BACK}>
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );
}

/** Animated wait while qr-service + ai-service build the report; polls until it is ready or failed. */
function GeneratingState({ jobId, label, onRetry }: { jobId: string; label: string; onRetry: () => void }) {
  const queryClient = useQueryClient();
  const jobQuery = useQuery({
    queryKey: ["smart-reports", "job", jobId],
    queryFn: () => getSmartReportJobRequest(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isSmartReportCompleted(status) || isSmartReportFailed(status) ? false : SMART_REPORT_POLL_INTERVAL_MS;
    },
  });
  const status = jobQuery.data?.status;
  const done = isSmartReportCompleted(status);
  const failed = isSmartReportFailed(status);

  useEffect(() => {
    if (done || failed) void queryClient.invalidateQueries({ queryKey: ["smart-reports", "list"] });
  }, [done, failed, queryClient]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
          <AlertCircle className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Rapor oluşturulamadı</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRetry}>Tekrar dene</Button>
          <Button asChild variant="outline">
            <Link href={DASHBOARD_ROUTES.smartReports}>Geçmiş raporlarım</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center animate-fade-in">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
          <Check className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Raporunuz hazır</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.smartReportDetail(jobId)}>Raporu görüntüle</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={DASHBOARD_ROUTES.smartReports}>Geçmiş raporlarım</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SmartReportGeneratingAnimation>
      <Button asChild variant="ghost" size="sm">
        <Link href={DASHBOARD_ROUTES.smartReports}>Geçmiş raporlarıma git</Link>
      </Button>
    </SmartReportGeneratingAnimation>
  );
}

export default function SmartReportNewView() {
  const { allowed, isLoading: accessLoading, isError, retry } = useRequireScope("SMART_REPORTING_OWNER");
  const queryClient = useQueryClient();
  const branchesQuery = useBranches();
  const quotaQuery = useQuery({
    queryKey: ["smart-reports", "quota"],
    queryFn: getSmartReportQuotaRequest,
    enabled: allowed,
  });
  const branches = useMemo(
    () => (branchesQuery.data?.content ?? []).filter((branch) => branch.active !== false),
    [branchesQuery.data],
  );
  const multiBranch = branches.length > 1;

  const [selectedScope, setScope] = useState<string>("");
  const [duration, setDuration] = useState<Duration>("last7");
  const [jobId, setJobId] = useState<string | null>(null);
  const range = smartReportPeriodRange(duration);

  // A report always covers exactly one branch: auto-pick the only one, otherwise the user must choose.
  const scope =
    branches.length === 1
      ? String(branches[0].id)
      : branches.some((b) => String(b.id) === selectedScope)
        ? selectedScope
        : "";
  const scopeLabel = branches.find((b) => String(b.id) === scope)?.name ?? "Şube";

  const quota = quotaQuery.data;
  const summary = quota ? summarizeSmartReportQuota(quota) : null;

  const createMutation = useMutation({
    mutationFn: () =>
      createSmartReportRequest({ branchId: Number(scope), from: range.from, to: range.to, locale: "tr" }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["smart-reports"] });
      setJobId(resolveSmartReportProcessId(data));
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["smart-reports", "quota"] });
    },
  });

  if (isError) return <AccessLoadError onRetry={() => void retry()} />;

  const header = <DashboardPageHeader title="Yeni rapor" back={<BackLink />} />;
  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {header}
        <DashboardLoadingState label="Yükleniyor…" />
      </div>
    );
  }

  const exhausted = summary?.exhausted ?? false;
  const noBranches = branchesQuery.isSuccess && branches.length === 0;
  const summaryLabel = `${scopeLabel} · ${formatSmartReportPeriod(range.from, range.to)}`;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 animate-fade-in">
      {header}

      <section className={DASHBOARD_SURFACE}>
        {jobId ? (
          <GeneratingState
            jobId={jobId}
            label={summaryLabel}
            onRetry={() => {
              setJobId(null);
              createMutation.reset();
            }}
          />
        ) : (
          <div className="space-y-6 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Şube</p>
              {noBranches ? (
                <p className="text-sm text-muted-foreground">
                  Önce bir şube ekleyin.{" "}
                  <Link href={DASHBOARD_ROUTES.myBranches} className="font-medium text-primary hover:underline">
                    Şubelere git
                  </Link>
                </p>
              ) : branchesQuery.isLoading ? (
                <div className="h-11 animate-pulse rounded-md bg-muted" />
              ) : (
                <Select value={scope} onValueChange={setScope} disabled={!multiBranch}>
                  <SelectTrigger className="h-11" aria-label="Şube">
                    <div className="flex min-w-0 items-center gap-2 [&>span]:truncate">
                      <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Şube seçin" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Süre</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Rapor süresi">
                {DURATIONS.map((option) => {
                  const active = option.value === duration;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setDuration(option.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{formatSmartReportPeriod(range.from, range.to)}</p>
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              {exhausted ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Rapor hakkınız bitti. Yeni rapor için ek rapor satın alın.
                  </p>
                  <Button asChild className="h-11 w-full">
                    <Link href={DASHBOARD_ROUTES.catalogProductCheckout(smartReportAddonCheckoutCode(quota))}>
                      Ek rapor al · {summary?.addonPriceLabel}
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || noBranches || branchesQuery.isLoading || !quota || !scope}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Rapor oluştur
                </Button>
              )}
              {createMutation.isError ? (
                <p className="text-sm text-destructive">{errorMessage(createMutation.error)}</p>
              ) : null}
              {summary && !exhausted ? (
                <p className="text-center text-xs text-muted-foreground">
                  Kalan rapor hakkınız: <span className="font-medium text-foreground">{summary.totalAvailable}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
