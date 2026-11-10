import type { ComponentType } from "react";

import { ToneIcon, type Tone } from "@/components/dashboard/tone";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

/** A summary number with its coloured icon. Renders a button when it can filter the list below. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
  loading = false,
  selected = false,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  loading?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ToneIcon tone={tone} icon={icon} />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "mt-2.5 block truncate text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl",
          loading && "text-muted-foreground/40",
        )}
      >
        {loading ? "—" : value}
      </span>
      {hint ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{hint}</span> : null}
    </>
  );
  const base = cn(DASHBOARD_SURFACE, "block w-full min-w-0 p-4 text-left");

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        base,
        "transition-colors hover:border-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-foreground/25 bg-muted/40",
      )}
    >
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}
