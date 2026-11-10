"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * The toolbar on top of every list: a search box and a row of filter buttons (`FilterMenu`).
 * Each button opens its own popover, or a bottom sheet on a phone, so there is no separate filter
 * screen. On a phone the buttons scroll sideways under the search box.
 */
export function ListToolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  searchLabel,
  searching = false,
  filters,
  narrowed,
  onClear,
}: {
  /** The committed search text; the toolbar debounces typing before it calls `onQueryChange`. */
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  /** Shows a spinner while a new result is being fetched. */
  searching?: boolean;
  /** `FilterMenu` buttons, in the order they should appear. */
  filters?: ReactNode;
  /** Any filter or search text is active; shows "Temizle". */
  narrowed: boolean;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [lastCommitted, setLastCommitted] = useState(query);
  const timer = useRef<number | null>(null);

  // Adopt a change that did not come from typing here, such as "Temizle" or a link with a filter.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    if (query !== lastCommitted) setDraft(query);
  }

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const type = (value: string) => {
    setDraft(value);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLastCommitted(value);
      onQueryChange(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const clear = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    setDraft("");
    setLastCommitted("");
    onClear();
  };

  return (
    <div className="flex flex-col gap-2 border-b border-border p-3 md:flex-row md:flex-wrap md:items-center lg:p-4">
      <div className="relative min-w-0 md:min-w-[16rem] md:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {searching ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
        <Input
          type="search"
          className="h-9 w-full pl-9"
          value={draft}
          onChange={(event) => type(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
        />
      </div>

      {filters || narrowed ? (
        // The top padding leaves room for the x badge that sits on a chosen filter's corner.
        <div className="-mx-3 -mt-1.5 flex min-w-0 items-center gap-2 overflow-x-auto px-3 pb-0.5 pt-1.5 [scrollbar-width:none] md:mx-0 md:mt-0 md:flex-wrap md:overflow-visible md:p-0">
          {filters}
          {narrowed ? (
            <button
              type="button"
              onClick={clear}
              className="flex h-9 shrink-0 items-center gap-1 rounded-[10px] px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
              Temizle
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
