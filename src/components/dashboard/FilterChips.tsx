"use client";

import { TONE_SOLID, type Tone } from "@/components/dashboard/tone";
import { cn } from "@/lib/utils";

export type FilterChipOption<T extends string> = {
  value: T;
  label: string;
  /** Colour the chip wears when selected, and as a dot while it is not. Omit for a neutral chip. */
  tone?: Tone;
  count?: number;
};

/**
 * Pill filter for short lists (five options or fewer). The selected chip is filled with its tone,
 * the others show a dot of it, so a colour means the same thing in the filter and in the list.
 * On a phone the group scrolls sideways instead of wrapping.
 */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  showLabel = true,
  className,
}: {
  label: string;
  options: ReadonlyArray<FilterChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Shows the group name in front of the chips. */
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {showLabel ? <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span> : null}
      <div
        role="group"
        aria-label={label}
        className="-mx-3 flex min-w-0 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-7 max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? option.tone
                    ? TONE_SOLID[option.tone]
                    : "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {!selected && option.tone ? (
                <span aria-hidden className={cn("size-1.5 rounded-full", TONE_SOLID[option.tone])} />
              ) : null}
              <span className="truncate">{option.label}</span>
              {option.count != null ? <span className="tabular-nums opacity-70">{option.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
