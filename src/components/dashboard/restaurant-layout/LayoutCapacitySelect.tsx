"use client";

import { tableCapacitySelectOptions } from "@/lib/restaurant-layout";
import { cn } from "@/lib/utils";

type LayoutCapacitySelectProps = {
  value: number;
  onChange: (capacity: number) => void;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
};

export function LayoutCapacitySelect({
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: LayoutCapacitySelectProps) {
  return (
    <select
      value={String(value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "rounded-md border border-border bg-background px-2 py-1.5 text-sm",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {tableCapacitySelectOptions(value).map((seats) => (
        <option key={seats} value={seats}>
          {seats} kişi
        </option>
      ))}
    </select>
  );
}
