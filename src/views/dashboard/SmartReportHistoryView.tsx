"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";

import { useRequireScope } from "@/components/auth/RequireScope";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SmartReportRows } from "@/components/dashboard/smart-report/SmartReportList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { isSmartReportPending, listSmartReportsRequest } from "@/lib/smart-report";

const PAGE_SIZE = 10;

function BackLink() {
  return (
    <Link href={DASHBOARD_ROUTES.smartReports} aria-label="Akıllı raporlara dön" className={DASHBOARD_BACK}>
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );
}

/** Every smart report, newest first, filtered by creation date and paginated by qr-service. */
export default function SmartReportHistoryView() {
  const { allowed, isLoading: accessLoading, isError, retry } = useRequireScope("SMART_REPORTING_OWNER");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const invalidRange = Boolean(from && to && from > to);

  const listQuery = useQuery({
    queryKey: ["smart-reports", "list", "history", { page, from, to }],
    queryFn: () =>
      listSmartReportsRequest({ page, size: PAGE_SIZE, status: "all", from: from || undefined, to: to || undefined }),
    enabled: allowed && !invalidRange,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      (query.state.data?.content ?? []).some((item) => isSmartReportPending(item.status)) ? 5_000 : false,
  });

  if (isError) return <AccessLoadError onRetry={() => void retry()} />;

  const header = <DashboardPageHeader title="Geçmiş raporlar" back={<BackLink />} />;
  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {header}
        <DashboardLoadingState label="Raporlar yükleniyor…" />
      </div>
    );
  }

  const data = listQuery.data;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);
  const filtered = Boolean(from || to);

  return (
    <div className="space-y-6 animate-fade-in">
      {header}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Başlangıç</span>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(0);
            }}
            className="h-9 w-40"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Bitiş</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(0);
            }}
            className="h-9 w-40"
          />
        </label>
        {filtered ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setFrom("");
              setTo("");
              setPage(0);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Temizle
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {data ? `${data.totalElements} rapor` : null}
        </span>
      </div>

      {invalidRange ? (
        <p className="text-sm text-destructive">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
      ) : (
        <section className={`${DASHBOARD_SURFACE} overflow-hidden`} aria-label="Raporlar">
          <SmartReportRows
            items={data?.content ?? []}
            isLoading={listQuery.isLoading}
            isError={listQuery.isError}
            emptyText={filtered ? "Bu tarih aralığında rapor yok." : "Henüz rapor yok."}
            skeletonRows={5}
          />
        </section>
      )}

      {!invalidRange && totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Sayfalar">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || listQuery.isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Önceki
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Sayfa {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages || listQuery.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
