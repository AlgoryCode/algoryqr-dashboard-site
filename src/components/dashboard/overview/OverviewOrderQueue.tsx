"use client";

import Link from "next/link";
import { BellRing, Hourglass, Undo2, type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import type { OverviewOrderQueue as QueueSnapshot } from "@/lib/overview-dashboard";
import { KITCHEN_KANBAN_SLA_MINUTES } from "@/lib/kitchen-queue";
import { cn } from "@/lib/utils";

type QueueTile = {
  key: keyof Pick<QueueSnapshot, "pendingApproval" | "delayed" | "cancelledToday">;
  label: string;
  hint: string;
  icon: LucideIcon;
  activeTone: string;
};

const TILES: QueueTile[] = [
  {
    key: "pendingApproval",
    label: "Onay bekleyen",
    hint: "Onaylanmayı bekleyen siparişler",
    icon: BellRing,
    activeTone: "border-amber-300 bg-amber-50 text-amber-900",
  },
  {
    key: "delayed",
    label: "Geciken",
    hint: `${KITCHEN_KANBAN_SLA_MINUTES} dakikayı geçen açık siparişler`,
    icon: Hourglass,
    activeTone: "border-red-300 bg-red-50 text-red-900",
  },
  {
    key: "cancelledToday",
    label: "İptal / iade",
    hint: "Bugün iptal edilen veya reddedilen siparişler",
    icon: Undo2,
    activeTone: "border-zinc-300 bg-zinc-50 text-zinc-900",
  },
];

export function OverviewOrderQueue({
  queue,
  loading,
  href,
}: {
  queue: QueueSnapshot | null;
  loading: boolean;
  href: string;
}) {
  return (
    <section className={DASHBOARD_PANEL} aria-label="Canlı siparişler">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Canlı siparişler</h2>
          <p className="text-xs text-muted-foreground">
            {queue ? `${queue.open} açık sipariş` : "Her 30 saniyede yenilenir"}
          </p>
        </div>
        <Link href={href} className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
          Sipariş akışına git
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((tile) => {
          const value = queue?.[tile.key] ?? 0;
          const Icon = tile.icon;
          if (loading && !queue) {
            return <Skeleton key={tile.key} className="h-[5.5rem] rounded-xl" />;
          }
          return (
            <Link
              key={tile.key}
              href={href}
              title={tile.hint}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-3 transition-colors hover:bg-muted/40",
                value > 0 ? tile.activeTone : "border-border text-foreground",
              )}
            >
              <Icon className="size-4 opacity-70" aria-hidden />
              <span className="text-2xl font-semibold tabular-nums leading-none">
                {queue ? value : "—"}
              </span>
              <span className="text-xs">{tile.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
