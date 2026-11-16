"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  formatSmartReportPeriod,
  readDownloadedSmartReports,
  resolveSmartReportProcessId,
  SMART_REPORT_CREDIT_LABEL,
  smartReportCreditSource,
  smartReportBadge,
  smartReportTitle,
  type SmartReportBadge,
  type SmartReportListItem,
} from "@/lib/smart-report";
import { cn } from "@/lib/utils";

const BADGE: Record<SmartReportBadge, { label: string; className: string }> = {
  pending: { label: "Hazırlanıyor", className: "bg-muted text-muted-foreground" },
  ready: {
    label: "Hazır",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  downloaded: {
    label: "İndirildi",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-transparent dark:text-emerald-300 dark:ring-emerald-900",
  },
  failed: { label: "Başarısız", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

/** Dot colours match the usage chart series. */
export const SMART_REPORT_CREDIT_COLOR = {
  FREE: "#0D9488",
  BONUS: "#8B5CF6",
  PAID: "#EA580C",
} as const;

function ReportRow({
  item,
  id,
  downloaded,
  showCredit,
}: {
  item: SmartReportListItem;
  id: string;
  downloaded: boolean;
  showCredit: boolean;
}) {
  const credit = smartReportCreditSource(item);
  const badgeKey = smartReportBadge(item.status, downloaded);
  const badge = BADGE[badgeKey];
  return (
    <li>
      <Link
        href={DASHBOARD_ROUTES.smartReportDetail(id)}
        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{smartReportTitle(item)}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {formatSmartReportPeriod(item.from, item.to)} · {formatCreatedAt(item.createdAt)}
          </span>
          {showCredit ? (
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: SMART_REPORT_CREDIT_COLOR[credit] }} />
              {SMART_REPORT_CREDIT_LABEL[credit]} hak
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            badge.className,
          )}
        >
          {badgeKey === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {badge.label}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

type Props = {
  items: SmartReportListItem[];
  isLoading: boolean;
  isError: boolean;
  /** Shown when there are no reports at all (or none match a filter). */
  emptyText: string;
  skeletonRows?: number;
  /** Show which credit (free, feedback bonus, purchased) paid for each report. */
  showCredit?: boolean;
};

/** Report rows with status badges; the caller provides the surrounding card. */
export function SmartReportRows({ items, isLoading, isError, emptyText, skeletonRows = 3, showCredit = false }: Props) {
  // Read once on mount; rows only render after the client fetch, so SSR markup is unaffected.
  const [downloaded] = useState(() => (typeof window === "undefined" ? new Set<string>() : readDownloadedSmartReports()));

  if (isLoading) {
    return (
      <ul className="divide-y divide-border" aria-busy="true">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <li key={i} className="space-y-2 px-4 py-3">
            <span className="block h-3 w-40 animate-pulse rounded bg-muted" />
            <span className="block h-3 w-28 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }
  if (isError) {
    return <p className="px-4 py-6 text-sm text-destructive">Raporlar yüklenemedi. Sayfayı yenileyip tekrar deneyin.</p>;
  }
  if (items.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const id = resolveSmartReportProcessId(item);
        return id ? <ReportRow key={id} item={item} id={id} downloaded={downloaded.has(id)} showCredit={showCredit} /> : null;
      })}
    </ul>
  );
}
