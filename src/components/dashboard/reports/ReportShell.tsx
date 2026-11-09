"use client";

import type { ComponentType, ElementType, ReactNode } from "react";
import Link from "next/link";
import { Lock, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseIsoDate } from "@/reporting/period";
import { cn } from "@/lib/utils";

export const REPORT_CARD =
  "rounded-2xl border border-[#e5e7eb] bg-white shadow-none dark:border-border dark:bg-card";

/** "24 Eyl – 23 Eki 2026" gibi okunur tarih aralığı. */
export function formatReportRange(from: string, to: string): string {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return `${from} – ${to}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  const endLabel = end.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  if (from === to) return endLabel;
  const startLabel = start.toLocaleDateString(
    "tr-TR",
    sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" },
  );
  return `${startLabel} – ${endLabel}`;
}

export type ReportTypeItem<T extends string> = {
  value: T;
  label: string;
  description: string;
  icon: LucideIcon;
  locked?: boolean;
};

/** Rapor türü seçimi: ikonlu, açıklamalı kartlar. Kilitli türler görünür kalır, seçilince paket bilgisi gösterilir. */
export function ReportTypeNav<T extends string>({
  items,
  value,
  onChange,
}: {
  items: ReadonlyArray<ReportTypeItem<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Rapor türü"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {items.map((item) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              "group relative flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4",
              selected
                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                : "border-[#e5e7eb] bg-white hover:bg-muted/40 dark:border-border dark:bg-card",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                {item.locked ? <Lock className="h-3 w-3 text-muted-foreground" aria-label="Paket gerekli" /> : null}
              </span>
              <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground sm:line-clamp-2 sm:block">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Boş, hata ve paket durumları için tek tip bilgi kartı. */
export function ReportStateCard({
  icon: Icon,
  title,
  description,
  tone = "default",
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "default" | "danger" | "upsell";
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className={cn(REPORT_CARD, "flex flex-col items-center px-6 py-10 text-center")}>
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : tone === "upsell"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        action.href ? (
          <Button asChild size="sm" className="mt-5" variant={tone === "upsell" ? "default" : "outline"}>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" className="mt-5" variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}

/** Rapor içeriği yüklenirken gösterilen iskelet. */
export function ReportLoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Rapor yükleniyor">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(REPORT_CARD, "space-y-3 p-4")}>
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-7 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={cn(REPORT_CARD, "space-y-3 p-4")}>
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Mobilde alttan açılan sayfa; masaüstünde variant="panel" ise sağ panel, "dialog" ise ortada pencere.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  variant = "panel",
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  variant?: "panel" | "dialog";
  footer?: ReactNode;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  const header = (TitleEl: ElementType, DescEl: ElementType) => (
    <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4 pr-12 text-left">
      {Icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="min-w-0">
        <TitleEl className="text-base font-semibold leading-tight text-foreground">{title}</TitleEl>
        {description ? <DescEl className="mt-1 text-sm text-muted-foreground">{description}</DescEl> : null}
      </div>
    </div>
  );
  const body = <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>;
  const foot = footer ? (
    <div className="border-t border-border/70 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
  ) : null;

  if (isMobile || variant === "panel") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("flex flex-col gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-3xl" : "w-full sm:max-w-md")}
        >
          {isMobile ? (
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            </div>
          ) : null}
          {header(SheetTitle, SheetDescription)}
          {body}
          {foot}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        {header(DialogTitle, DialogDescription)}
        {body}
        {foot}
      </DialogContent>
    </Dialog>
  );
}
