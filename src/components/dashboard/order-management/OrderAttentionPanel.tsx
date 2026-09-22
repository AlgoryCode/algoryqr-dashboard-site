"use client";

import { Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

type OrderAttentionPanelProps = {
  pendingCount: number;
  onSelectPending: () => void;
};

export function OrderAttentionPanel({ pendingCount, onSelectPending }: OrderAttentionPanelProps) {
  if (pendingCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onSelectPending}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors",
          "border-amber-500/25 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:text-amber-300",
        )}
      >
        <Clock3 className="h-3.5 w-3.5 shrink-0" />
        {pendingCount.toLocaleString("tr-TR")} onay bekliyor
      </button>
    </div>
  );
}
