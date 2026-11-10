import type { ReactNode } from "react";

import { TONES, TONE_SOLID } from "@/components/dashboard/tone";
import type { BadgeTone } from "@/lib/badge-tones";
import { cn } from "@/lib/utils";

/**
 * The one badge every list uses for a status, type, role or channel.
 * Pick the tone from `lib/badge-tones.ts`; do not hand-write badge colours on a page.
 */
export function ToneBadge({
  tone,
  dot = false,
  className,
  children,
}: {
  tone: BadgeTone;
  /** Adds a small coloured dot before the label, for "state" badges such as Aktif / Pasif. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium",
        tone === "muted" ? "bg-muted text-muted-foreground" : TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", tone === "muted" ? "bg-muted-foreground/50" : TONE_SOLID[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}
