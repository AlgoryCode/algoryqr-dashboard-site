"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { useRequireScope } from "@/components/auth/RequireScope";
import BranchSmartReportStory from "@/components/dashboard/BranchSmartReportStory";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SmartReportFeedbackCard } from "@/components/dashboard/smart-report/SmartReportFeedbackCard";
import { SmartReportGeneratingAnimation } from "@/components/dashboard/smart-report/SmartReportGeneratingAnimation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  buildChannelComparisonHtml,
  buildMerchantKpiHtml,
  buildSmartReportMarkdown,
  getMerchantDetailedReportRequest,
  getSmartReportJobRequest,
  isMerchantWideSmartReport,
  isSmartReportFailed,
  isSmartReportPending,
  normalizeSmartReportResult,
  SMART_REPORT_POLL_INTERVAL_MS,
  smartReportStatusLabel,
  smartReportTitle,
  type SmartReportDetailResponse,
  markSmartReportDownloaded,
} from "@/lib/smart-report";
import { getBranchRevenueReportRequest } from "@/lib/api";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  downloadSmartReportPdf,
  smartReportMarkdownToHtml,
} from "@/lib/smart-report-pdf";

type Props = {
  jobId: string;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SmartReportDetailView({ jobId }: Props) {
  const { allowed, isLoading: accessLoading, isError, retry } = useRequireScope("SMART_REPORTING_OWNER");
  const { toast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["smart-reports", "detail", jobId],
    queryFn: () => getSmartReportJobRequest(jobId),
    enabled: allowed,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isSmartReportPending(status) ? SMART_REPORT_POLL_INTERVAL_MS : false;
    },
  });

  if (isError) {
    return <AccessLoadError onRetry={() => void retry()} />;
  }

  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title="Akıllı rapor"
          hint="Rapor detayı yükleniyor"
          back={
            <Link href={DASHBOARD_ROUTES.smartReports} aria-label="Raporlara dön" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
        <DashboardLoadingState label="Rapor detayı hazırlanıyor…" />
      </div>
    );
  }

  const detail = detailQuery.data as SmartReportDetailResponse | undefined;
  const result = normalizeSmartReportResult(detail);
  const pending = isSmartReportPending(detail?.status);
  const failed = isSmartReportFailed(detail?.status);
  const markdown = result ? buildSmartReportMarkdown(result) : "";
  const bodyHtml = markdown
    ? smartReportMarkdownToHtml(markdown, { inlineStyles: false })
    : "";

  async function handleDownloadPdf() {
    if (!result || !markdown) return;
    setPdfLoading(true);
    try {
      const remoteUrl = detail?.pdfUrl?.trim();
      if (remoteUrl) {
        window.open(remoteUrl, "_blank", "noopener,noreferrer");
        markSmartReportDownloaded(jobId);
        return;
      }
      let prefixHtml = "";
      if (detail && isMerchantWideSmartReport(detail) && detail.from && detail.to) {
        try {
          const report = await getMerchantDetailedReportRequest(detail.from, detail.to);
          prefixHtml =
            buildMerchantKpiHtml(report) +
            buildChannelComparisonHtml(report.revenue?.channels ?? []);
        } catch {
        }
      } else if (detail?.branchId != null && detail.from && detail.to) {
        try {
          const revenue = await getBranchRevenueReportRequest(
            detail.branchId,
            detail.from,
            detail.to,
            null,
          );
          prefixHtml = buildChannelComparisonHtml(revenue.channels ?? []);
        } catch {
        }
      }
      await downloadSmartReportPdf({
        title: result.title || (detail ? smartReportTitle(detail) : "Akilli Rapor"),
        markdown,
        prefixHtml,
        subtitle: detail
          ? `${smartReportTitle(detail)} · ${detail.from} – ${detail.to} · Oluşturulma: ${formatDateTime(detail.completedAt || detail.createdAt)}`
          : undefined,
        fileName: `akilli-rapor-${detail?.branchId ?? detail?.menuId ?? "tum-subeler"}-${detail?.from ?? ""}-${detail?.to ?? ""}.pdf`,
      });
      markSmartReportDownloaded(jobId);
    } catch {
      toast({
        title: "PDF indirilemedi",
        description: "Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title={result?.title || (detail ? smartReportTitle(detail) : "Akıllı rapor")}
        hint={
          detail
            ? `${smartReportTitle(detail)} · ${detail.from} – ${detail.to}`
            : "Rapor detayı"
        }
        back={
          <Link href={DASHBOARD_ROUTES.smartReports} aria-label="Raporlara dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        action={
          result && markdown && !pending ? (
            <Button onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
              {pdfLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF olarak indir
            </Button>
          ) : null
        }
      />

      {detailQuery.isLoading ? (
        <DashboardLoadingState label="Rapor yükleniyor…" />
      ) : detailQuery.isError ? (
        <p className="text-sm text-destructive">Rapor yüklenemedi.</p>
      ) : (
        <div className="space-y-4">
          <div className={`${DASHBOARD_SURFACE} grid gap-2 px-3 py-2.5 text-sm sm:grid-cols-3`}>
            <div>
              <p className="text-xs text-muted-foreground">Durum</p>
              <p className="font-medium text-foreground">{smartReportStatusLabel(detail?.status)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">İstek</p>
              <p className="font-medium text-foreground">
                {formatDateTime(detail?.requestedAt || detail?.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tamamlanma</p>
              <p className="font-medium text-foreground">{formatDateTime(detail?.completedAt)}</p>
            </div>
          </div>

          {detail?.status === "completed" && result ? (
            <SmartReportFeedbackCard
              jobId={jobId}
              sectionHeadings={result.sections
                .map((section) => section.heading?.trim())
                .filter((heading): heading is string => Boolean(heading))}
            />
          ) : null}

          {pending ? (
            <div className={DASHBOARD_SURFACE}>
              <SmartReportGeneratingAnimation />
            </div>
          ) : null}

          {failed ? (
            <p className="text-sm text-destructive">
              {detail?.errorMessage || "Rapor oluşturulamadı."}
            </p>
          ) : null}

          {detail?.branchId != null && result && !pending ? (
            <BranchSmartReportStory
              branchId={detail.branchId}
              from={detail.from}
              to={detail.to}
              branchName={detail.branchName}
              result={result}
            />
          ) : null}

          {detail?.branchId == null && bodyHtml && !pending ? (
            <div
              className={`${DASHBOARD_SURFACE} p-4 text-sm text-foreground [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5`}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : null}

          {detail?.branchId == null && !bodyHtml && result && !pending ? (
            <p className="text-sm text-muted-foreground">Rapor içeriği bulunamadı.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
