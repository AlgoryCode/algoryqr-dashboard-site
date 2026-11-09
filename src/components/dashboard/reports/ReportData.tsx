"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Search, type LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { REPORT_CARD, ResponsiveSheet } from "./ReportShell";

/* ------------------------------------------------------------------ */
/* Bölüm başlığı                                                       */
/* ------------------------------------------------------------------ */

export function ReportSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground/80">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Öne çıkanlar                                                        */
/* ------------------------------------------------------------------ */

export type ReportInsight = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "warning";
  onClick?: () => void;
};

/** Raporun "tek bakışta" çıkarımları: en çok kazandıran ürün, yoğun saat, lider kanal vb. */
export function InsightStrip({ items }: { items: ReportInsight[] }) {
  const visible = items.filter((item) => item.value);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" role="list" aria-label="Öne çıkanlar">
      {visible.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                item.tone === "positive"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : item.tone === "warning"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-muted-foreground">{item.label}</span>
              <span className="block truncate text-sm font-semibold text-foreground" title={item.value}>
                {item.value}
              </span>
              {item.hint ? <span className="block truncate text-[11px] text-muted-foreground">{item.hint}</span> : null}
            </span>
            {item.onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
          </>
        );
        const className = cn(REPORT_CARD, "flex items-center gap-3 px-3.5 py-3 text-left");
        return item.onClick ? (
          <button
            key={item.label}
            type="button"
            role="listitem"
            onClick={item.onClick}
            className={cn(
              className,
              "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {content}
          </button>
        ) : (
          <div key={item.label} role="listitem" className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sıralı liste kartı + tam liste penceresi                            */
/* ------------------------------------------------------------------ */

export type RankedRow = {
  key: string;
  name: string;
  /** Sağda büyük yazılan değer (ör. ciro). */
  primary: string;
  /** Altta küçük yazılan bilgi (ör. "12 adet · %8"). */
  secondary?: string;
  /** 0-100 arası çubuk genişliği. */
  bar: number;
  /** Sıralama için sayısal değerler. */
  sortValues: Record<string, number>;
};

export type RankedSort = { key: string; label: string };

function RankedRowView({
  row,
  rank,
  accent,
  onClick,
}: {
  row: RankedRow;
  rank: number;
  accent: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
          rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium text-foreground" title={row.name}>
            {row.name}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{row.primary}</span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(3, Math.min(100, row.bar))}%`, backgroundColor: accent }}
            />
          </span>
          {row.secondary ? (
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{row.secondary}</span>
          ) : null}
        </span>
      </span>
      {onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  if (!onClick) {
    return <li className="flex items-center gap-3 py-2">{inner}</li>;
  }
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${row.name} detayını aç`}
      >
        {inner}
      </button>
    </li>
  );
}

function sortRows(rows: RankedRow[], key: string | undefined): RankedRow[] {
  if (!key) return rows;
  return [...rows].sort((a, b) => (b.sortValues[key] ?? 0) - (a.sortValues[key] ?? 0));
}

/**
 * İlk N satırı gösteren sıralı liste. Satıra tıklanınca detay açılır,
 * "Tümünü gör" aranabilir tam listeyi pencerede açar.
 */
export function RankedListCard({
  title,
  description,
  icon: Icon,
  rows,
  rowsBySort,
  sorts,
  limit = 6,
  accent = "hsl(var(--chart-1))",
  emptyText = "Bu dönemde veri yok.",
  footer,
  onRowClick,
  searchPlaceholder = "Ara…",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  rows: RankedRow[];
  /** Sıralamaya göre farklı gösterim (ör. adede göre sıralarken sağda adet yazsın). */
  rowsBySort?: Record<string, RankedRow[]>;
  sorts?: RankedSort[];
  limit?: number;
  accent?: string;
  emptyText?: string;
  footer?: ReactNode;
  onRowClick?: (row: RankedRow) => void;
  searchPlaceholder?: string;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(sorts?.[0]?.key);
  const [fullOpen, setFullOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => sortRows((sortKey && rowsBySort?.[sortKey]) || rows, sortKey),
    [rows, rowsBySort, sortKey],
  );
  const visible = sorted.slice(0, limit);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return sorted;
    return sorted.filter((row) => row.name.toLocaleLowerCase("tr").includes(q));
  }, [query, sorted]);

  const sortControl =
    sorts && sorts.length > 1 ? (
      <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label={`${title} sıralama`}>
        {sorts.map((sort) => {
          const selected = sort.key === sortKey;
          return (
            <button
              key={sort.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSortKey(sort.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sort.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div className={cn(REPORT_CARD, "flex flex-col p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {sortControl}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ol className="mt-2 flex-1 divide-y divide-border/50">
          {visible.map((row, index) => (
            <RankedRowView
              key={row.key}
              row={row}
              rank={index + 1}
              accent={accent}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            />
          ))}
        </ol>
      )}

      {footer || rows.length > limit ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="min-w-0 text-[11px] text-muted-foreground">{footer}</div>
          {rows.length > limit ? (
            <button
              type="button"
              onClick={() => setFullOpen(true)}
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tümünü gör ({rows.length.toLocaleString("tr-TR")})
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <ResponsiveSheet
        open={fullOpen}
        onOpenChange={(open) => {
          setFullOpen(open);
          if (!open) setQuery("");
        }}
        icon={Icon}
        title={title}
        description={`${rows.length.toLocaleString("tr-TR")} kayıt`}
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-9"
                aria-label={searchPlaceholder}
              />
            </div>
            {sortControl}
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Eşleşen kayıt yok.</p>
          ) : (
            <ol className="divide-y divide-border/50">
              {filtered.map((row) => (
                <RankedRowView
                  key={row.key}
                  row={row}
                  rank={sorted.indexOf(row) + 1}
                  accent={accent}
                  onClick={
                    onRowClick
                      ? () => {
                          setFullOpen(false);
                          setQuery("");
                          onRowClick(row);
                        }
                      : undefined
                  }
                />
              ))}
            </ol>
          )}
        </div>
      </ResponsiveSheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detay penceresi parçaları                                           */
/* ------------------------------------------------------------------ */

export type DetailMetric = { label: string; value: string; accent?: boolean; hint?: string };

export function DetailMetricGrid({ metrics }: { metrics: DetailMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={cn(
            "rounded-xl border px-3 py-2.5",
            metric.accent ? "border-primary/20 bg-primary/5" : "border-border/70 bg-muted/30",
          )}
        >
          <p className="text-[11px] font-medium text-muted-foreground">{metric.label}</p>
          <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{metric.value}</p>
          {metric.hint ? <p className="truncate text-[11px] text-muted-foreground">{metric.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function DetailBarList({
  title,
  rows,
  accent = "hsl(var(--primary))",
  emptyText = "Gösterilecek kayıt yok.",
}: {
  title: string;
  rows: { key: string; label: string; value: number; display: string }[];
  accent?: string;
  emptyText?: string;
}) {
  const peak = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="truncate text-muted-foreground">{row.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${row.value > 0 ? Math.max(3, (row.value / peak) * 100) : 0}%`, backgroundColor: accent }}
                />
              </span>
              <span className="shrink-0 text-right tabular-nums text-foreground">{row.display}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Basit detay penceresi: başlık + metrikler + isteğe bağlı ek içerik. */
export function ReportDetailSheet({
  open,
  onClose,
  icon,
  title,
  description,
  metrics,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  description?: string;
  metrics: DetailMetric[];
  children?: ReactNode;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      icon={icon}
      title={title}
      description={description}
    >
      <div className="space-y-5">
        <DetailMetricGrid metrics={metrics} />
        {children}
      </div>
    </ResponsiveSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "%0";
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: digits })}`;
}

export function sharePercent(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

export function hourRangeLabel(hour: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hour)}:00–${pad((hour + 1) % 24)}:00`;
}
