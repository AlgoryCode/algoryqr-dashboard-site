"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { productPageItems } from "@/lib/product-list";
import { cn } from "@/lib/utils";

const PAGE_BUTTON = "flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors";

/** Footer for a paged list: range summary on the left, page buttons on the right. */
export function ListPagination({
  page,
  pageSize,
  total,
  unit,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  unit: string;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5 lg:px-4">
      <p className="text-xs tabular-nums text-muted-foreground">
        {first}–{last} / {total} {unit}
      </p>
      {totalPages > 1 ? (
        <nav aria-label="Sayfalar" className="flex items-center gap-1">
          <button
            type="button"
            className={cn(PAGE_BUTTON, "hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent")}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-1 text-xs tabular-nums text-muted-foreground sm:hidden">
            {page} / {totalPages}
          </span>
          {productPageItems(page, totalPages).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="hidden w-5 text-center text-muted-foreground sm:block">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPage(item)}
                className={cn(
                  PAGE_BUTTON,
                  "hidden sm:flex",
                  item === page ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={cn(PAGE_BUTTON, "hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent")}
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
