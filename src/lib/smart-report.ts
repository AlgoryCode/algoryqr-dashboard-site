import type {
  MenuAnalyticsReportResponse,
  MenuRevenueReportResponse,
  MenuWaiterPerformanceReportResponse,
} from "@/lib/api";
import { api } from "@/lib/api/client";

export type SmartReportJobStatus =
  | "queued"
  | "processing"
  | "running"
  | "completed"
  | "failed";

export type SmartReportUiStatus = "idle" | "pending" | "ready" | "failed";

export type SmartReportResult = {
  title: string;
  summary: string;
  sections: { key?: string; heading: string; body: string }[];
  rawMarkdown: string;
  model?: string | null;
  promptVersion?: string | null;
  usage?: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
  } | null;
};

export type SmartReportAccepted = {
  jobId: string;
  processId?: string;
  status: SmartReportJobStatus;
};

export type SmartReportJobResponse = {
  jobId: string;
  processId?: string;
  status: SmartReportJobStatus;
  result?: SmartReportResult | null;
  resultText?: string | null;
  pdfUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
};

export type SmartReportDetailResponse = SmartReportJobResponse & {
  menuId?: number | null;
  menuName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  from: string;
  to: string;
  locale?: string | null;
  requestedAt?: string | null;
};

export type SmartReportListItem = {
  jobId: string;
  processId?: string;
  menuId?: number | null;
  menuName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  from: string;
  to: string;
  locale?: string | null;
  status?: SmartReportJobStatus;
  createdAt: string;
  completedAt?: string | null;
  /** Which credit paid for the report. */
  creditSource?: SmartReportCreditSource | null;
};

export type SmartReportListPage = {
  content: SmartReportListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type SmartReportQuota = {
  period: "DAY" | "WEEK" | string;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  lastUsage?: string | null;
  paidCredits?: number;
  addonProductCode?: string | null;
  addonUnitPrice?: number | string | null;
  /** Extra credit earned by giving feedback this week and not yet spent; already included in limit/remaining. */
  bonusCredits?: number;
  /** True while feedback can still earn this week's extra credit. */
  feedbackBonusAvailable?: boolean;
};

export const SMART_REPORT_ADDON_PRODUCT_CODE = "SMART_REPORTING_ADDON";
export const SMART_REPORT_POLL_INTERVAL_MS = 5_000;

export type SmartReportJobScope = {
  branchId: number | null;
  menuId: number | null;
  from: string;
  to: string;
};

export function smartReportTitle(
  item: Pick<SmartReportListItem, "branchName" | "menuName">,
): string {
  return item.branchName?.trim() || item.menuName?.trim() || "Akilli rapor";
}

export const MERCHANT_WIDE_REPORT_LABEL = "Tüm şubeler";

/** A merchant-wide report has neither a branch nor a menu scope. */
export function isMerchantWideSmartReport(
  item: Pick<SmartReportListItem, "branchId" | "menuId"> | null | undefined,
): boolean {
  return !!item && item.branchId == null && item.menuId == null;
}

export function matchesSmartReportScope(
  item: Pick<SmartReportListItem, "branchId" | "menuId" | "from" | "to">,
  scope: SmartReportJobScope,
): boolean {
  if (item.from !== scope.from || item.to !== scope.to) {
    return false;
  }
  if (scope.menuId != null) {
    return item.menuId === scope.menuId;
  }
  if (scope.branchId != null) {
    return item.branchId === scope.branchId;
  }
  return false;
}

export function findLatestSmartReportForScope(
  items: SmartReportListItem[],
  scope: SmartReportJobScope,
): SmartReportListItem | null {
  for (const item of items) {
    if (matchesSmartReportScope(item, scope)) {
      return item;
    }
  }
  return null;
}

export function resolveSmartReportProcessId(
  value: { jobId?: string | null; processId?: string | null } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value.processId === "string" && value.processId.length > 0) {
    return value.processId;
  }
  if (typeof value.jobId === "string" && value.jobId.length > 0) {
    return value.jobId;
  }
  return null;
}

export function isSmartReportPending(
  status: SmartReportJobStatus | null | undefined,
): boolean {
  return status === "queued" || status === "processing" || status === "running";
}

export function isSmartReportCompleted(
  status: SmartReportJobStatus | null | undefined,
): boolean {
  return status === "completed";
}

export function isSmartReportFailed(
  status: SmartReportJobStatus | null | undefined,
): boolean {
  return status === "failed";
}

export function smartReportStatusLabel(
  status: SmartReportJobStatus | null | undefined,
): string {
  if (status == null) return "—";
  if (isSmartReportPending(status)) return "Hazırlanıyor";
  if (isSmartReportCompleted(status)) return "Hazır";
  if (isSmartReportFailed(status)) return "Başarısız";
  return status;
}

export function toSmartReportUiStatus(
  status: SmartReportJobStatus | null | undefined,
): SmartReportUiStatus {
  if (status == null) return "idle";
  if (isSmartReportPending(status)) return "pending";
  if (status === "completed") return "ready";
  return "failed";
}

export function isSmartReportQuotaExhausted(quota: SmartReportQuota | null | undefined): boolean {
  if (!quota) return false;
  if ((quota.paidCredits ?? 0) > 0) return false;
  if (quota.limit <= 0) return true;
  return quota.remaining <= 0;
}

export function smartReportAddonCheckoutCode(quota: SmartReportQuota | null | undefined): string {
  const code = quota?.addonProductCode?.trim();
  return code && code.length > 0 ? code : SMART_REPORT_ADDON_PRODUCT_CODE;
}

export function normalizeSmartReportResult(
  detail: Pick<SmartReportJobResponse, "result" | "resultText"> | null | undefined,
): SmartReportResult | null {
  if (!detail) return null;
  if (detail.result) {
    const rawMarkdown =
      detail.result.rawMarkdown?.trim() ||
      detail.resultText?.trim() ||
      "";
    return {
      ...detail.result,
      rawMarkdown:
        rawMarkdown ||
        [detail.result.summary, ...(detail.result.sections ?? []).map((s) => s.body)]
          .filter(Boolean)
          .join("\n\n"),
    };
  }
  const text = detail.resultText?.trim();
  if (!text) return null;
  return {
    title: "Akilli Rapor",
    summary: text.slice(0, 280),
    sections: [],
    rawMarkdown: text,
  };
}

export async function createSmartReportRequest(body: {
  branchId?: number | null;
  menuId?: number | null;
  from: string;
  to: string;
  locale?: string;
}): Promise<SmartReportAccepted> {
  if (body.branchId != null) {
    const response = await api.post<SmartReportAccepted>(
      `/features/SMART_REPORTING/branches/${body.branchId}/reports`,
      {
        from: body.from,
        to: body.to,
        locale: body.locale ?? "tr",
      },
    );
    return response.data;
  }
  const response = await api.post<SmartReportAccepted>("/smart-reports", body);
  return response.data;
}

export async function getSmartReportJobRequest(
  jobId: string,
): Promise<SmartReportDetailResponse | SmartReportJobResponse> {
  const response = await api.get<SmartReportDetailResponse>(`/smart-reports/${jobId}`);
  return response.data;
}

export async function listSmartReportsRequest(params?: {
  page?: number;
  size?: number;
  status?: SmartReportJobStatus | "all";
  /** Created-date range, inclusive (yyyy-MM-dd). */
  from?: string;
  to?: string;
}): Promise<SmartReportListPage> {
  const response = await api.get<SmartReportListPage>("/smart-reports", {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      sort: "createdAt,desc",
      status: params?.status ?? "all",
      ...(params?.from ? { from: params.from } : {}),
      ...(params?.to ? { to: params.to } : {}),
    },
  });
  return response.data;
}

export async function getSmartReportQuotaRequest(): Promise<SmartReportQuota> {
  const response = await api.get<SmartReportQuota>("/smart-reports/quota");
  return response.data;
}

export function smartReportQuotaLabel(quota: SmartReportQuota): string {
  const paid = quota.paidCredits ?? 0;
  const freeLabel =
    quota.period === "WEEK"
      ? `Bu hafta ${quota.used}/${quota.limit} ucretsiz hak`
      : `Bugun ${quota.used}/${quota.limit} ucretsiz hak`;
  if (paid > 0) {
    return `${freeLabel}; ${paid} satin alinan hak`;
  }
  return freeLabel;
}

export function buildSmartReportMarkdown(
  result: Pick<SmartReportResult, "summary" | "sections" | "rawMarkdown">,
): string {
  const fromSections =
    result.sections?.length > 0
      ? result.sections
          .map((section) => `## ${section.heading}\n\n${section.body}`)
          .join("\n\n")
      : "";
  return (
    result.rawMarkdown?.trim() ||
    [result.summary?.trim(), fromSections].filter(Boolean).join("\n\n")
  );
}

export function buildChannelComparisonMarkdown(
  channels: Array<{
    code: string;
    label: string;
    revenue?: number | string | null;
    orderCount?: number;
    avgOrderValue?: number | string | null;
    sharePercent?: number | string | null;
    connected: boolean;
  }>,
  currency = "TRY",
): string {
  if (!channels.length) return "";
  const lines = channels.map((channel) => {
    if (!channel.connected && Number(channel.revenue ?? 0) <= 0) {
      return `- ${channel.label}: Bağlı değil`;
    }
    const revenue = Number(channel.revenue ?? 0).toFixed(2);
    const share = Number(channel.sharePercent ?? 0).toFixed(0);
    const aov = Number(channel.avgOrderValue ?? 0).toFixed(2);
    return `- ${channel.label}: ${revenue} ${currency} (%${share}) · ${channel.orderCount ?? 0} sipariş · ort. ${aov} ${currency}`;
  });
  return ["## Satış kanalları", "", ...lines].join("\n");
}

export function buildChannelComparisonHtml(
  channels: Array<{
    code: string;
    label: string;
    revenue?: number | string | null;
    sharePercent?: number | string | null;
    connected: boolean;
  }>,
): string {
  if (!channels.length) return "";
  const max = Math.max(...channels.map((c) => Number(c.revenue ?? 0)), 1);
  const bars = channels
    .map((channel) => {
      const value = Number(channel.revenue ?? 0);
      const width = Math.max(4, Math.round((value / max) * 100));
      const color = channel.code === "UBER_EATS" ? "#4f46e5" : "#16a34a";
      const label = !channel.connected && value <= 0
        ? `${escapePdf(channel.label)} — Bağlı değil`
        : `${escapePdf(channel.label)} — %${Number(channel.sharePercent ?? 0).toFixed(0)}`;
      return `<div style="margin:0 0 10px">
        <div style="font-size:12px;margin:0 0 4px;color:#111">${label}</div>
        <div style="height:14px;background:#f3f4f6;border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${width}%;background:${color};border-radius:999px"></div>
        </div>
      </div>`;
    })
    .join("");
  return `<h2 style="font-size:16px;margin:16px 0 8px;font-weight:700">Satış kanalları</h2>${bars}`;
}

function escapePdf(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type SmartReportPeriodPreset = "last7" | "last30" | "thisMonth" | "lastMonth";

export const SMART_REPORT_PERIOD_OPTIONS: { value: SmartReportPeriodPreset; label: string }[] = [
  { value: "last7", label: "Son 7 gün" },
  { value: "last30", label: "Son 30 gün" },
  { value: "thisMonth", label: "Bu ay" },
  { value: "lastMonth", label: "Geçen ay" },
];

function toIsoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive from/to (yyyy-MM-dd, local time) for a smart report period preset. */
export function smartReportPeriodRange(
  preset: SmartReportPeriodPreset,
  today: Date = new Date(),
): { from: string; to: string } {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (preset) {
    case "last7":
      return { from: toIsoDay(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6)), to: toIsoDay(end) };
    case "thisMonth":
      return { from: toIsoDay(new Date(end.getFullYear(), end.getMonth(), 1)), to: toIsoDay(end) };
    case "lastMonth":
      return {
        from: toIsoDay(new Date(end.getFullYear(), end.getMonth() - 1, 1)),
        to: toIsoDay(new Date(end.getFullYear(), end.getMonth(), 0)),
      };
    case "last30":
    default:
      return { from: toIsoDay(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29)), to: toIsoDay(end) };
  }
}

/** Every detailed report of the merchant across all branches (qr-service aggregate). */
export type MerchantDetailedReport = {
  scopeName?: string | null;
  from: string;
  to: string;
  visits?: MenuAnalyticsReportResponse | null;
  revenue?: MenuRevenueReportResponse | null;
  waiter?: MenuWaiterPerformanceReportResponse | null;
};

export async function getMerchantDetailedReportRequest(
  from: string,
  to: string,
): Promise<MerchantDetailedReport> {
  const response = await api.get<MerchantDetailedReport>("/analytics/merchant/detailed-report", {
    params: { from, to },
  });
  return response.data;
}

function formatPdfNumber(value: number | string | null | undefined, fractionDigits = 0): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** KPI summary block placed above the AI text in the merchant-wide PDF. */
export function buildMerchantKpiHtml(report: MerchantDetailedReport): string {
  const kpis = report.revenue?.kpis;
  const visits = report.visits?.kpis;
  const currency = kpis?.currency?.trim() || "TRY";
  const cells: [string, string][] = [
    ["Toplam ciro", `${formatPdfNumber(kpis?.totalRevenue, 2)} ${escapePdf(currency)}`],
    ["Sipariş", formatPdfNumber(kpis?.orderCount)],
    ["Ortalama sepet", `${formatPdfNumber(kpis?.avgOrderValue, 2)} ${escapePdf(currency)}`],
    ["Menü oturumu", formatPdfNumber(visits?.sessions)],
    ["Ürün görüntüleme", formatPdfNumber(visits?.productViews)],
  ];
  const tiles = cells
    .map(
      ([label, value]) => `<div style="flex:1 1 120px;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px">
        <div style="font-size:10px;color:#6b7280;margin:0 0 2px">${label}</div>
        <div style="font-size:14px;font-weight:700;color:#111">${value}</div>
      </div>`,
    )
    .join("");
  return `<h2 style="font-size:16px;margin:0 0 8px;font-weight:700">Özet göstergeler</h2>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px">${tiles}</div>`;
}


/** What the merchant can still create, in the order credits are spent (free first, then purchased). */
export type SmartReportQuotaSummary = {
  freeLimit: number;
  freeRemaining: number;
  freeUsed: number;
  paidCredits: number;
  totalAvailable: number;
  exhausted: boolean;
  /** Which credit the next report consumes. */
  nextSource: "free" | "paid" | null;
  periodLabel: string;
  addonPriceLabel: string;
};

export function formatTryAmount(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL`;
}

export function summarizeSmartReportQuota(quota: SmartReportQuota): SmartReportQuotaSummary {
  const freeLimit = Math.max(quota.limit ?? 0, 0);
  const freeRemaining = Math.min(Math.max(quota.remaining ?? 0, 0), freeLimit);
  const paidCredits = Math.max(quota.paidCredits ?? 0, 0);
  const totalAvailable = freeRemaining + paidCredits;
  return {
    freeLimit,
    freeRemaining,
    freeUsed: freeLimit - freeRemaining,
    paidCredits,
    totalAvailable,
    exhausted: totalAvailable <= 0,
    nextSource: freeRemaining > 0 ? "free" : paidCredits > 0 ? "paid" : null,
    periodLabel: quota.period === "WEEK" ? "haftalık" : "günlük",
    addonPriceLabel: formatTryAmount(quota.addonUnitPrice) || "200 TL",
  };
}

const TR_SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "17 Eki – 15 Kas 2026"; the year is shown once when both days share it. */
export function formatSmartReportPeriod(from: string, to: string): string {
  const start = parseIsoDay(from);
  const end = parseIsoDay(to);
  if (!start || !end) return [from, to].filter(Boolean).join(" – ");
  const endLabel = end.toLocaleDateString("tr-TR", TR_SHORT_DATE);
  const startLabel =
    start.getFullYear() === end.getFullYear()
      ? start.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
      : start.toLocaleDateString("tr-TR", TR_SHORT_DATE);
  return `${startLabel} – ${endLabel}`;
}

export type SmartReportStatusFilter = "all" | "ready" | "pending" | "failed";

export function smartReportStatusGroup(
  status: SmartReportJobStatus | null | undefined,
): Exclude<SmartReportStatusFilter, "all"> {
  if (isSmartReportCompleted(status)) return "ready";
  if (isSmartReportFailed(status)) return "failed";
  return "pending";
}

export function countSmartReportsByStatus(
  items: Pick<SmartReportListItem, "status">[],
): Record<SmartReportStatusFilter, number> {
  const counts: Record<SmartReportStatusFilter, number> = { all: items.length, ready: 0, pending: 0, failed: 0 };
  for (const item of items) counts[smartReportStatusGroup(item.status)] += 1;
  return counts;
}

const DOWNLOADED_STORAGE_KEY = "smart-report-downloaded";

/** Report ids whose PDF was downloaded in this browser (per-device; the API does not track downloads). */
export function readDownloadedSmartReports(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DOWNLOADED_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function markSmartReportDownloaded(id: string): void {
  try {
    const ids = readDownloadedSmartReports();
    ids.add(id);
    window.localStorage.setItem(DOWNLOADED_STORAGE_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {
    // Storage unavailable (private mode): the badge just stays "Hazır".
  }
}

export type SmartReportBadge = "pending" | "ready" | "downloaded" | "failed";

export function smartReportBadge(
  status: SmartReportJobStatus | null | undefined,
  downloaded: boolean,
): SmartReportBadge {
  const group = smartReportStatusGroup(status);
  if (group === "ready") return downloaded ? "downloaded" : "ready";
  return group;
}

export type SmartReportFeedbackHelpful = "YES" | "NO";
export type SmartReportRecommendationsFit = "FITS" | "PARTLY" | "NOT_FIT";
export type SmartReportDetailLevel = "SHORTER" | "SAME" | "LONGER";

/** "Did you like this report?" — YES carries an optional comment, NO carries the follow-up answers and an optional note. */
export type SmartReportFeedbackRequest = {
  helpful: SmartReportFeedbackHelpful;
  recommendationsFit?: SmartReportRecommendationsFit | null;
  unclearSections?: string[];
  focusAreas?: string[];
  detailLevel?: SmartReportDetailLevel | null;
  note?: string | null;
};

export type SmartReportFeedbackResponse = {
  jobId: string;
  helpful: string | null;
  recommendationsFit: SmartReportRecommendationsFit | null;
  unclearSections: string[];
  focusAreas: string[];
  detailLevel: SmartReportDetailLevel | null;
  note: string | null;
  revisionJobId: string | null;
  updatedAt: string | null;
  /** True when this feedback earned the weekly extra report credit. */
  bonusGranted?: boolean;
};

export async function getSmartReportFeedbackRequest(
  jobId: string,
): Promise<SmartReportFeedbackResponse | null> {
  const response = await api.get<SmartReportFeedbackResponse | "">(`/smart-reports/${jobId}/feedback`);
  if (response.status === 204 || !response.data) return null;
  return response.data as SmartReportFeedbackResponse;
}

export async function saveSmartReportFeedbackRequest(
  jobId: string,
  body: SmartReportFeedbackRequest,
): Promise<SmartReportFeedbackResponse> {
  const response = await api.put<SmartReportFeedbackResponse>(`/smart-reports/${jobId}/feedback`, body);
  return response.data;
}

export async function reviseSmartReportRequest(
  jobId: string,
  body: SmartReportFeedbackRequest,
): Promise<SmartReportAccepted> {
  const response = await api.post<SmartReportAccepted>(`/smart-reports/${jobId}/revise`, body);
  return response.data;
}

export type SmartReportCreditSource = "FREE" | "BONUS" | "PAID";
export type SmartReportUsageDays = 7 | 30;

export const SMART_REPORT_CREDIT_LABEL: Record<SmartReportCreditSource, string> = {
  FREE: "Ücretsiz",
  BONUS: "Geri bildirimle",
  PAID: "Satın alınan",
};

export type SmartReportUsage = {
  days: number;
  from: string;
  to: string;
  totals: { free: number; bonus: number; paid: number; total: number };
  daily: { date: string; free: number; bonus: number; paid: number }[];
  items: SmartReportListItem[];
};

export async function getSmartReportUsageRequest(days: SmartReportUsageDays): Promise<SmartReportUsage> {
  const response = await api.get<SmartReportUsage>("/smart-reports/usage", { params: { days } });
  return response.data;
}

/** Reports without a recorded source were paid by the free quota. */
export function smartReportCreditSource(item: Pick<SmartReportListItem, "creditSource">): SmartReportCreditSource {
  return item.creditSource === "BONUS" || item.creditSource === "PAID" ? item.creditSource : "FREE";
}
