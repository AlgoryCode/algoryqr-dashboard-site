"use client";

import { useMemo, useState } from "react";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Gamepad2,
  Glasses,
  Monitor,
  Pencil,
  Shapes,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PAYMENT_LABELS,
  formatDuration,
  formatTime,
  formatTl,
  toNumber,
  type ConsoleSession,
  type DeviceType,
  type PaymentMethod,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

const DEVICE_ICONS: Record<DeviceType, LucideIcon> = {
  PLAYSTATION: Gamepad2,
  XBOX: Gamepad2,
  NINTENDO: Gamepad2,
  PC: Monitor,
  VR: Glasses,
  SIMULATOR: Car,
  BILLIARDS: CircleDot,
  OTHER: Shapes,
};

const PAYMENT_TONES: Record<PaymentMethod, string> = {
  CASH: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CARD: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  TRANSFER: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  BALANCE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

type Filter = "all" | "paid" | "cancelled" | "edited";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "paid", label: "Ödenen" },
  { value: "cancelled", label: "İptal" },
  { value: "edited", label: "Düzeltilen" },
];

function dayKey(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function dayLabel(key: string): string {
  if (!key) return "—";
  const date = new Date(`${key}T12:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Bugün";
  if (same(date, yesterday)) return "Dün";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(date);
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className ?? "bg-muted text-muted-foreground"}`}>
      {children}
    </span>
  );
}

/** Finished sessions of a page, grouped by day, with a summary of the page and quick filters. */
export function SessionHistoryList({
  rows,
  loading,
  page,
  hasNext,
  onPage,
  onOpen,
}: {
  rows: ConsoleSession[];
  loading: boolean;
  page: number;
  hasNext: boolean;
  onPage: (page: number) => void;
  onOpen: (session: ConsoleSession) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const summary = useMemo(() => {
    const paid = rows.filter((row) => !row.cancelled);
    return {
      total: paid.reduce((sum, row) => sum + toNumber(row.amount), 0),
      minutes: paid.reduce((sum, row) => sum + row.durationMinutes, 0),
      paid: paid.length,
      cancelled: rows.length - paid.length,
      edited: rows.filter((row) => row.editedAt).length,
    };
  }, [rows]);

  const groups = useMemo(() => {
    const visible = rows.filter((row) =>
      filter === "paid" ? !row.cancelled : filter === "cancelled" ? row.cancelled : filter === "edited" ? row.editedAt != null : true,
    );
    const map = new Map<string, ConsoleSession[]>();
    for (const row of visible) {
      const key = dayKey(row.endedAt ?? row.startedAt);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()];
  }, [rows, filter]);

  if (loading) {
    return (
      <div className={`${DASHBOARD_PANEL} space-y-2`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  if (rows.length === 0 && page === 0) {
    return (
      <div className={DASHBOARD_PANEL}>
        <p className="py-8 text-center text-sm text-muted-foreground">Henüz biten oturum yok.</p>
      </div>
    );
  }

  return (
    <div className={`${DASHBOARD_PANEL} space-y-4`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tahsilat" value={formatTl(summary.total)} strong />
        <Stat label="Oturum" value={`${summary.paid}`} hint={formatDuration(summary.minutes)} />
        <Stat label="İptal" value={`${summary.cancelled}`} />
        <Stat label="Düzeltilen" value={`${summary.edited}`} />
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? "default" : "outline"}
            className="h-8 rounded-full"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Bu sayfada eşleşen oturum yok.</p>
      ) : (
        groups.map(([key, items]) => (
          <section key={key} className="space-y-1.5">
            <h3 className="flex items-baseline justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{dayLabel(key)}</span>
              <span className="font-normal normal-case tabular-nums">
                {formatTl(items.filter((row) => !row.cancelled).reduce((sum, row) => sum + toNumber(row.amount), 0))}
              </span>
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {items.map((row) => (
                <HistoryRow key={row.id} row={row} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        ))
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Sayfa {page + 1}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Önceki
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={() => onPage(page + 1)}>
            Sonraki <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${strong ? "text-lg font-semibold" : "text-base font-medium"}`}>{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function HistoryRow({ row, onOpen }: { row: ConsoleSession; onOpen: (session: ConsoleSession) => void }) {
  const Icon = DEVICE_ICONS[row.deviceType ?? "OTHER"] ?? Shapes;
  const items = toNumber(row.itemsAmount);
  const discount = toNumber(row.discountAmount);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            row.cancelled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1.5 truncate font-medium ${row.cancelled ? "text-muted-foreground" : ""}`}>
            <span className="truncate">{row.consoleName ?? `#${row.consoleId}`}</span>
            {row.customerName ? <span className="truncate font-normal text-muted-foreground">· {row.customerName}</span> : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {formatTime(row.startedAt)} – {formatTime(row.endedAt)}
            </span>
            {!row.cancelled ? <Pill>{formatDuration(row.durationMinutes)}</Pill> : null}
            {row.packageName ? <Pill>{row.packageName}</Pill> : null}
            {items > 0 ? (
              <Pill>
                <ShoppingBag className="h-3 w-3" aria-hidden /> {formatTl(items)}
              </Pill>
            ) : null}
            {discount > 0 && !row.cancelled ? <Pill>−{formatTl(discount)}</Pill> : null}
            {row.editedAt ? (
              <Pill className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Pencil className="h-3 w-3" aria-hidden /> Düzeltildi
              </Pill>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {row.cancelled ? (
            <Pill className="bg-destructive/10 text-destructive">İptal</Pill>
          ) : (
            <>
              <span className="text-base font-semibold tabular-nums">{formatTl(row.amount)}</span>
              {row.paymentMethod ? <Pill className={PAYMENT_TONES[row.paymentMethod]}>{PAYMENT_LABELS[row.paymentMethod]}</Pill> : null}
            </>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}
