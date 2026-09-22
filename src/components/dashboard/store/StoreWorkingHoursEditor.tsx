"use client";

import type { StoreWorkingHour } from "@/lib/store-api";
import { STORE_WEEKDAY_LABEL, STORE_WEEKDAYS, toStoreTimeInputValue } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

export function StoreWorkingHoursEditor({
  value,
  onChange,
}: {
  value: StoreWorkingHour[];
  onChange: (value: StoreWorkingHour[]) => void;
}) {
  const byDay = new Map(value.map((hour) => [hour.day, hour]));

  const update = (day: StoreWorkingHour["day"], patch: Partial<StoreWorkingHour>) => {
    const current = byDay.get(day) ?? { day, opensAt: "10:00", closesAt: "23:59", closed: false };
    const next = STORE_WEEKDAYS.map((weekday) => {
      const hour = byDay.get(weekday) ?? { day: weekday, opensAt: "10:00", closesAt: "23:59", closed: false };
      return weekday === day ? { ...current, ...patch } : hour;
    });
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {STORE_WEEKDAYS.map((day) => {
        const hour = byDay.get(day) ?? { day, opensAt: "10:00", closesAt: "23:59", closed: false };
        return (
          <div
            key={day}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
          >
            <span className="w-24 text-sm text-foreground">{STORE_WEEKDAY_LABEL[day]}</span>
            <button
              type="button"
              onClick={() => update(day, { closed: !hour.closed })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                hour.closed
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              )}
            >
              {hour.closed ? "Kapalı" : "Açık"}
            </button>
            <input
              type="time"
              disabled={hour.closed}
              value={toStoreTimeInputValue(hour.opensAt)}
              onChange={(event) => update(day, { opensAt: event.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-40"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <input
              type="time"
              disabled={hour.closed}
              value={toStoreTimeInputValue(hour.closesAt)}
              onChange={(event) => update(day, { closesAt: event.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-40"
            />
          </div>
        );
      })}
    </div>
  );
}
