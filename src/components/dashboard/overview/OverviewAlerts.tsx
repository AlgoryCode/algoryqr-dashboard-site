"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  MessageSquareWarning,
  PackageX,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { TONES } from "@/components/dashboard/tone";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import type { OverviewAlert, OverviewAlertKind, OverviewAlertTone } from "@/lib/overview-dashboard";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<OverviewAlertKind, LucideIcon> = {
  stock: PackageX,
  reservation: CalendarClock,
  feedback: MessageSquareWarning,
  debt: Receipt,
  shift: Wallet,
};

const TONE_CLASS: Record<OverviewAlertTone, string> = {
  danger: TONES.red,
  warning: TONES.orange,
  info: TONES.blue,
};

export function OverviewAlerts({ alerts, loading }: { alerts: OverviewAlert[]; loading: boolean }) {
  return (
    <section className={DASHBOARD_PANEL} aria-label="Harekete geç">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Harekete geç</h2>
        <p className="text-xs text-muted-foreground">Tüm modüllerden ilgilenmeniz gereken başlıklar</p>
      </div>
      {alerts.length === 0 ? (
        loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Şu an bekleyen bir uyarı yok.
          </p>
        )
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const Icon = KIND_ICON[alert.kind];
            return (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className="group flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      TONE_CLASS[alert.tone],
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{alert.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{alert.detail}</span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-0.5 text-xs font-medium text-foreground sm:inline-flex">
                    {alert.actionLabel}
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
