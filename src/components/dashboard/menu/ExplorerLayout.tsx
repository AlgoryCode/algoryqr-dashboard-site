"use client";

import type { MouseEvent, ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

export const EXPLORER_QUIET_BUTTON =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
export const EXPLORER_DANGER_ICON_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

/** Selected row in an explorer sidebar list. */
export const EXPLORER_ROW_SELECTED = "bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]";

export type ExplorerSection = "categories" | "options";

/** What one side of the explorer (categories or options) puts into the shared frame. */
export type ExplorerParts = {
  /** Sidebar content under the section switch. */
  sidebar: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  dialogs: ReactNode;
};

const SECTIONS: { key: ExplorerSection; label: string; href: string }[] = [
  { key: "categories", label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuCategories },
  { key: "options", label: "Opsiyonlar", href: DASHBOARD_ROUTES.digitalMenuOptions },
];

/**
 * Switches sections in place: only the address changes (`history.pushState`, which Next keeps in sync
 * with `usePathname`), so the frame stays mounted and just the list below the switch is redrawn.
 * Modified clicks (new tab, …) still follow the link.
 */
function switchInPlace(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  if (window.location.pathname !== href) window.history.pushState(null, "", href);
}

/** The Ürünler | Opsiyonlar switch at the top of the explorer sidebar. */
export function ExplorerSwitch({ active }: { active: ExplorerSection }) {
  return (
    <div className="space-y-2">
      {/* The sidebar nav already names the page; the switch below carries the visible labels. */}
      <h1 className="sr-only">Ürünler</h1>
      <nav aria-label="Ürün bölümleri" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {SECTIONS.map((section) => {
          const current = section.key === active;
          return (
            <a
              key={section.key}
              href={section.href}
              onClick={(event) => switchInPlace(event, section.href)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                current
                  ? "bg-card text-[#F03245] shadow-sm dark:text-[#FB7185]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {section.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Two panes: a full-height second sidebar and the content beside it on desktop (edge to edge under
 * the top bar: h-16 + 1px border); on phones one card that shows the list, or the selection.
 */
export function ExplorerFrame({
  header,
  sidebar,
  detail,
  hasSelection,
  sidebarLabel,
  detailLabel,
}: {
  /** Stays put above the sidebar content (the section switch). */
  header: ReactNode;
  sidebar: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  sidebarLabel: string;
  detailLabel: string;
}) {
  return (
    <div className="p-4 animate-fade-in sm:p-6 lg:p-0">
      <div className="overflow-hidden rounded-2xl border border-border bg-card lg:grid lg:h-[calc(100svh-4rem-1px)] lg:min-h-[30rem] lg:grid-cols-[18rem_minmax(0,1fr)] lg:rounded-none lg:border-0 lg:bg-transparent xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside
          aria-label={sidebarLabel}
          className={cn("flex min-h-0 flex-col border-border lg:border-r lg:bg-card", hasSelection && "hidden lg:flex")}
        >
          <div className="px-3 pb-2 pt-3">{header}</div>
          {sidebar}
        </aside>
        <section
          aria-label={detailLabel}
          className={cn("min-h-0 min-w-0 lg:overflow-y-auto lg:bg-background", !hasSelection && "hidden lg:block")}
        >
          <div className="lg:m-6 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-card xl:m-8">{detail}</div>
        </section>
      </div>
    </div>
  );
}

/** Header of the right pane; the back arrow returns to the list on phones (or to `parent`). */
export function ExplorerDetailHeader(props: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onBack: () => void;
  backLabel: string;
  parent?: { label: string; onClick: () => void };
  badge?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-3 sm:p-4">
      <button
        type="button"
        onClick={props.parent?.onClick ?? props.onBack}
        className={cn(EXPLORER_QUIET_BUTTON, "w-9 px-0", !props.parent && "lg:hidden")}
        aria-label={props.parent ? `${props.parent.label} kategorisine dön` : props.backLabel}
      >
        <ArrowLeft className="size-4" />
      </button>
      {props.icon}
      <div className="min-w-0 flex-1">
        {props.parent ? (
          <button
            type="button"
            onClick={props.parent.onClick}
            className="block max-w-full truncate text-xs text-muted-foreground hover:text-[#F03245]"
          >
            {props.parent.label}
          </button>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-semibold text-foreground">{props.title}</h2>
          {props.badge}
        </div>
        <p className="truncate text-xs text-muted-foreground">{props.subtitle}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-0.5">{props.actions}</div>
    </header>
  );
}

/** Desktop placeholder of the right pane before anything is picked. */
export function ExplorerEmpty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-3 px-6 py-20 text-center lg:flex">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/** Spinner shown in the sidebar list while it loads. */
export function ExplorerListLoading({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-2 px-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-[#F03245]" aria-hidden />
      {label}
    </div>
  );
}
