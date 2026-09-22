"use client";

import Link from "next/link";
import { Bike, ChefHat, UtensilsCrossed } from "lucide-react";

import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  OPS_LANE_LABEL,
  type OpsLane,
  type OpsLaneSnapshot,
} from "@/lib/order-management";
import { cn } from "@/lib/utils";

const LANE_META: Record<OpsLane, { icon: typeof ChefHat; tone: string }> = {
  kitchen: {
    icon: ChefHat,
    tone: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  },
  waiter: {
    icon: UtensilsCrossed,
    tone: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  },
  courier: {
    icon: Bike,
    tone: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  },
};

type OrderOpsTrackerProps = {
  snapshots: Record<OpsLane, OpsLaneSnapshot>;
  detailHref: (lane: OpsLane) => string;
};

export function OrderOpsTracker({ snapshots, detailHref }: OrderOpsTrackerProps) {
  return (
    <section className={`${DASHBOARD_SURFACE} p-4 sm:p-5`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Canlı takip</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mutfak, garson ve kurye yan yana. Detay her hattın siparişlerini ayrı açar.
        </p>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-3">
        {(["kitchen", "waiter", "courier"] as const).map((lane) => {
          const snapshot = snapshots[lane];
          const Icon = LANE_META[lane].icon;
          return (
            <div key={lane} className="rounded-2xl border border-border bg-background">
              <div className="flex items-center gap-3 px-3 py-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    LANE_META[lane].tone,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{OPS_LANE_LABEL[lane]}</span>
                  <span className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      <span className="tabular-nums text-sm font-semibold text-foreground">
                        {snapshot.primary.count}
                      </span>{" "}
                      {snapshot.primary.label}
                    </span>
                    <span>
                      <span className="tabular-nums text-sm font-semibold text-foreground">
                        {snapshot.secondary.count}
                      </span>{" "}
                      {snapshot.secondary.label}
                    </span>
                  </span>
                </span>
                <Link
                  href={detailHref(lane)}
                  className="inline-flex h-8 shrink-0 items-center rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Detay
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
