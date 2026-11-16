export const DASHBOARD_CONTENT =
  "mx-auto w-full max-w-5xl";

export const ACCOUNT_CARD =
  "rounded-2xl border border-[#ececea] bg-white dark:border-border dark:bg-card";

export const DASHBOARD_SURFACE = ACCOUNT_CARD;

export const ACCOUNT_SURFACE = ACCOUNT_CARD;

export const ACCOUNT_MENU_LABEL =
  "px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a86]";

export const ACCOUNT_MENU_ROW =
  "flex w-full items-center px-4 py-3.5 text-left text-sm font-medium text-zinc-900 transition-colors hover:bg-[#fafafa]";

export const DASHBOARD_TILE =
  `${DASHBOARD_SURFACE} p-4 transition-colors hover:bg-muted/40`;

export const DASHBOARD_TILE_SQUARE =
  `group flex aspect-square flex-col items-center justify-center gap-3 ${DASHBOARD_SURFACE} p-4 transition-colors hover:bg-muted/40`;

export const DASHBOARD_TILE_ROW =
  `${DASHBOARD_TILE} group flex items-center gap-3 text-left`;

export const DASHBOARD_PANEL = `${DASHBOARD_SURFACE} p-4 sm:p-5`;

export const DASHBOARD_PANEL_LG = `${DASHBOARD_SURFACE} p-6`;

export const DASHBOARD_LIST_ITEM =
  `${DASHBOARD_SURFACE} p-4 transition-colors hover:bg-muted/50`;

export const DASHBOARD_FILTER_BAR =
  `${DASHBOARD_SURFACE} flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-3 sm:p-5`;

export const DASHBOARD_FILTER_FIELD = "flex min-w-0 flex-col gap-2";

export const DASHBOARD_FILTER_LABEL = "text-xs leading-4 text-muted-foreground";

export const DASHBOARD_STAT_TILE = `${ACCOUNT_CARD} p-5 text-left`;

export const DASHBOARD_METRIC_LABEL =
  "text-[13px] font-light leading-none text-neutral-500 dark:text-muted-foreground";

export const DASHBOARD_METRIC_VALUE =
  "mt-1.5 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-neutral-950 dark:text-foreground";

export const DASHBOARD_ICON_WELL =
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-lg font-medium text-muted-foreground";

export const DASHBOARD_BACK =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export const DASHBOARD_HUB_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4";

export const DASHBOARD_TYPE_TITLE = "text-2xl font-semibold tracking-tight text-foreground";
export const DASHBOARD_TYPE_SECTION = "text-base font-semibold text-foreground";
export const DASHBOARD_TYPE_HINT = "text-sm text-muted-foreground";
export const DASHBOARD_TYPE_TILE = "text-sm font-medium text-foreground";
export const DASHBOARD_TYPE_META = "text-xs text-muted-foreground";
export const DASHBOARD_TYPE_KPI = DASHBOARD_METRIC_VALUE;

/** Soft rose badge (matches the "Sağlık" mini icon: #FFF0F3 fill, #F03245 ink). */
export const DASHBOARD_BADGE_ROSE =
  "inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] px-2 py-0.5 text-[11px] font-medium text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#ff7a87]";

/** Outlined variant of the rose badge, for a muted / secondary state. */
export const DASHBOARD_BADGE_ROSE_OUTLINE =
  "inline-flex items-center gap-1 rounded-full border border-[#F03245]/25 bg-white px-2 py-0.5 text-[11px] font-medium text-[#F03245]/80 dark:bg-transparent dark:text-[#ff7a87]/80";
