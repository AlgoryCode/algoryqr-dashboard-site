"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";

import { FilterMenu } from "@/components/dashboard/FilterMenu";
import type { Tone } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dateRangeForPreset,
  detectDateRangePreset,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ id: Exclude<DateRangePreset, "custom">; label: string }> = [
  { id: "today", label: "Bugün" },
  { id: "yesterday", label: "Dün" },
  { id: "7d", label: "Son 7 gün" },
  { id: "30d", label: "Son 30 gün" },
  { id: "all", label: "Tüm zamanlar" },
];

function shortDate(ymd: string): string {
  const [year, month, day] = ymd.split("-");
  return year && month && day ? `${day}.${month}.${year.slice(2)}` : ymd;
}

export function dateRangeLabel(range: DateRangeValue): string {
  const preset = detectDateRangePreset(range);
  if (preset !== "custom") return PRESETS.find((item) => item.id === preset)?.label ?? "";
  if (range.from && range.to) return range.from === range.to ? shortDate(range.from) : `${shortDate(range.from)} – ${shortDate(range.to)}`;
  return range.from ? `${shortDate(range.from)} →` : `→ ${shortDate(range.to)}`;
}

function sameRange(a: DateRangeValue, b: DateRangeValue) {
  return a.from === b.from && a.to === b.to;
}

/**
 * Date filter as a filter button: quick ranges plus a custom from–to pair.
 * `emptyRange` is the page's default; the button is "active" (coloured, with an x) only when the
 * range differs from it, and the x puts it back.
 */
export function DateFilterMenu({
  value,
  onChange,
  emptyRange,
  tone = "violet",
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  emptyRange: DateRangeValue;
  tone?: Tone;
}) {
  const active = !sameRange(value, emptyRange);

  return (
    <FilterMenu
      label="Tarih"
      icon={CalendarDays}
      tone={tone}
      activeLabel={active ? dateRangeLabel(value) : null}
      idleLabel={dateRangeLabel(emptyRange)}
      onClear={() => onChange(emptyRange)}
      content={(close) => <DateRangeBody value={value} onChange={onChange} close={close} />}
    />
  );
}

function DateRangeBody({
  value,
  onChange,
  close,
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  close: () => void;
}) {
  const preset = detectDateRangePreset(value);
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const valid = from !== "" && to !== "" && from <= to;

  return (
    <div className="w-full space-y-3 md:w-64">
      <ul className="space-y-0.5">
        {PRESETS.map((item) => {
          const selected = preset === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(dateRangeForPreset(item.id));
                  close();
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                  selected && "font-medium",
                )}
              >
                {item.label}
                <Check className={cn("size-4", selected ? "text-foreground" : "invisible")} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-2 border-t border-border pt-3">
        <p className="px-1 text-xs font-medium text-muted-foreground">Özel aralık</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" aria-label="Başlangıç" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="h-9 text-sm" />
          <Input type="date" aria-label="Bitiş" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="h-9 text-sm" />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!valid}
          onClick={() => {
            onChange({ from, to });
            close();
          }}
        >
          Uygula
        </Button>
      </div>
    </div>
  );
}
