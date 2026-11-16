"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { formatPackageDate } from "@/lib/package-display";
import {
  fetchSubscriptionHistory,
  subscriptionEventDetail,
  subscriptionEventLabel,
  subscriptionEventTone,
} from "@/lib/subscription-history";
import { cn } from "@/lib/utils";

const DOT = {
  positive: "bg-emerald-500",
  negative: "bg-red-500",
  neutral: "bg-muted-foreground/50",
} as const;

/** Timeline of plan changes for the "Planım" page; hidden until there is something to show. */
export function SubscriptionHistoryCard() {
  const historyQuery = useQuery({
    queryKey: ["subscription", "history"],
    queryFn: fetchSubscriptionHistory,
    staleTime: 60_000,
  });
  const items = historyQuery.data ?? [];
  if (items.length === 0) return null;

  return (
    <Card className={DASHBOARD_SURFACE}>
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground">Abonelik geçmişi</h3>
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => {
            const detail = subscriptionEventDetail(item);
            return (
              <li key={`${item.type}-${item.occurredAt}-${index}`} className="flex gap-3">
                <span
                  aria-hidden
                  className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[subscriptionEventTone(item.type)])}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-medium text-foreground">{subscriptionEventLabel(item.type)}</p>
                    <time className="text-xs text-muted-foreground" dateTime={item.occurredAt}>
                      {formatPackageDate(item.occurredAt)}
                    </time>
                  </div>
                  {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
