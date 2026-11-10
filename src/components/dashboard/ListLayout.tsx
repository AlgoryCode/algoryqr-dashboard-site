import type { ComponentType, ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The flat white card every list sits in: grey border, no shadow. */
export function ListCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {children}
    </section>
  );
}

/**
 * Column titles above the rows, shown from the `lg` breakpoint up.
 * `columns` is the same grid class the rows use, so titles and cells line up.
 */
export function ListHead({
  columns,
  labels,
}: {
  columns: string;
  /**
   * A string is a title; `{ srOnly }` marks the action column; `{ right }` right-aligns a number column;
   * `{ label, className }` is a title that follows the column's own responsive classes.
   */
  labels: ReadonlyArray<string | { srOnly: string } | { right: string } | { label: string; className: string }>;
}) {
  return (
    <div className={cn("hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground", columns)}>
      {labels.map((label, index) =>
        typeof label === "string" ? (
          <span key={index}>{label}</span>
        ) : "srOnly" in label ? (
          <span key={index} className="sr-only">
            {label.srOnly}
          </span>
        ) : "label" in label ? (
          <span key={index} className={label.className}>
            {label.label}
          </span>
        ) : (
          <span key={index} className="text-right">
            {label.right}
          </span>
        ),
      )}
    </div>
  );
}

/** Row classes shared by every list item: padding, hover and the stretched-link anchor. */
export const LIST_ROW = "relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 lg:px-4 lg:py-2.5";

/** The row's main link covers the whole row, while buttons inside it sit above with `relative z-10`. */
export const LIST_ROW_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring";

export function ListSkeleton({ rows = 6, round = false }: { rows?: number; round?: boolean }) {
  return (
    <ul aria-label="Yükleniyor" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-3 lg:px-4">
          <Skeleton className={cn("size-10 shrink-0 lg:size-9", round ? "rounded-full" : "rounded-[10px]")} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </li>
      ))}
    </ul>
  );
}

/** Empty, filtered-empty and error states share one look. */
export function ListMessage({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: { label: string; onClick: () => void; variant?: "default" | "outline" };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon ? <Icon className="size-5 text-muted-foreground/60" aria-hidden /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Button type="button" size="sm" variant={action.variant ?? "outline"} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
