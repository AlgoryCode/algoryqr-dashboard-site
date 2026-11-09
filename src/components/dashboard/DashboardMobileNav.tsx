"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pin, Search, X } from "lucide-react";

import { DashboardAssistantLauncher } from "@/components/dashboard/DashboardAssistantChat";
import { NavBadge } from "@/components/dashboard/NavBadge";
import { DASHBOARD_NAV_ICONS as NAV_ICONS, DASHBOARD_NAV_TONES as NAV_TONES } from "@/components/dashboard/nav-icons";
import { TONE_ROW, ToneIcon } from "@/components/dashboard/tone";
import { useDashboardNavPrefs } from "@/hooks/use-dashboard-nav-prefs";
import { buildNavTargets, searchNavTargets, type NavTarget } from "@/lib/dashboard-nav-prefs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  isDashboardNavActive,
  splitMobileDashboardNav,
  type DashboardNavItem,
} from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";


type DashboardMobileNavProps = {
  items: DashboardNavItem[];
  pendingOrderCount: number;
  onOpenSearch?: () => void;
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
};

function tabClass(active: boolean) {
  return cn(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium",
    active ? "text-primary" : "text-muted-foreground",
  );
}

export function DashboardMobileNav({
  items,
  pendingOrderCount,
  onOpenSearch,
  moreOpen,
  onMoreOpenChange,
}: DashboardMobileNavProps) {
  const pathname = usePathname();
  const { primary, overflow } = splitMobileDashboardNav(items);
  const primaryChildren = primary.flatMap((item) =>
    (item.children ?? []).map((child) => ({ ...child, tone: NAV_TONES[item.key] })),
  );
  const columns = Math.max(primary.length, 1);
  const [query, setQuery] = useState("");
  const { pinned, togglePinned } = useDashboardNavPrefs();
  const targets = useMemo(() => buildNavTargets(items), [items]);
  const results = useMemo(() => searchNavTargets(targets, query), [query, targets]);
  const pinnedTargets = useMemo(() => {
    const byId = new Map(targets.map((target) => [target.id, target]));
    return pinned.map((id) => byId.get(id)).filter((target): target is NavTarget => target != null);
  }, [pinned, targets]);

  useEffect(() => {
    onMoreOpenChange(false);
  }, [pathname, onMoreOpenChange]);

  useEffect(() => {
    if (!moreOpen) setQuery("");
  }, [moreOpen]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Mobil gezinme"
    >
      <div className="flex items-stretch gap-0 pl-1">
      <div
        className="grid min-w-0 flex-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {primary.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const active =
            isDashboardNavActive(pathname, item.href, item.key) ||
            (item.children ?? []).some((child) => isDashboardNavActive(pathname, child.href));
          const badgeCount = item.badgeKey === "pendingOrders" ? pendingOrderCount : 0;
          return (
            <Link key={item.key} href={item.href} className={tabClass(active)}>
              <span className="relative">
                <Icon className="size-4" />
                {badgeCount > 0 ? (
                  <span className="absolute -right-2.5 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-destructive px-0.5 text-xs font-semibold text-destructive-foreground">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </div>
        <div className="-mt-px flex items-stretch self-stretch border-l border-border">
          <DashboardAssistantLauncher appearance="bar" />
        </div>
      </div>

      <Sheet open={moreOpen} onOpenChange={onMoreOpenChange}>
        <SheetContent
          side="left"
          className="flex h-full w-[min(18rem,85vw)] flex-col gap-0 overflow-y-auto border-r bg-card p-4 sm:max-w-xs"
        >
          <SheetHeader>
            <SheetTitle>Daha fazla</SheetTitle>
          </SheetHeader>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sayfa ara"
              aria-label="Sayfa ara"
              enterKeyHint="go"
              className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {query.trim() ? (
            <div className="mt-3 grid gap-1" role="list" aria-label="Arama sonuçları">
              {results.map((target) => {
                const Icon = NAV_ICONS[target.parentKey];
                return (
                  <Link
                    key={target.id}
                    href={target.href}
                    onClick={() => onMoreOpenChange(false)}
                    role="listitem"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/60"
                  >
                    <ToneIcon tone={NAV_TONES[target.parentKey]} icon={Icon} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{target.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {target.parentLabel ? `${target.parentLabel} · ` : ""}
                        {target.groupLabel}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {results.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Sonuç yok.
                  {onOpenSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        onMoreOpenChange(false);
                        onOpenSearch();
                      }}
                      className="mt-2 block w-full font-medium text-primary"
                    >
                      Tüm işlemlerde ara
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
          <div className="mt-3 grid gap-1">
            {pinnedTargets.length > 0 ? (
              <div className="mb-2">
                <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  <Pin className="size-3" />
                  Sabitlenenler
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {pinnedTargets.map((target) => {
                    const Icon = NAV_ICONS[target.parentKey];
                    const active = isDashboardNavActive(pathname, target.href, target.isChild ? undefined : target.parentKey);
                    return (
                      <Link
                        key={target.id}
                        href={target.href}
                        onClick={() => onMoreOpenChange(false)}
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-sm",
                          active
                            ? cn("border-transparent font-semibold text-foreground", TONE_ROW[NAV_TONES[target.parentKey]].selected)
                            : "border-border text-foreground hover:bg-muted/60",
                        )}
                      >
                        <ToneIcon tone={NAV_TONES[target.parentKey]} icon={Icon} solid={active} />
                        <span className="truncate">{target.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {overflow.map((item) => {
              const Icon = NAV_ICONS[item.key];
              const active = isDashboardNavActive(pathname, item.href, item.key);
              const badgeCount = item.badgeKey === "pendingOrders" ? pendingOrderCount : 0;
              return (
                <div key={item.key} className="grid gap-1">
                  <div className="relative">
                    <Link
                      href={item.href}
                      onClick={() => onMoreOpenChange(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg py-2.5 pl-3 pr-11 text-sm",
                        active
                          ? cn("font-semibold text-foreground", TONE_ROW[NAV_TONES[item.key]].selected)
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <ToneIcon tone={NAV_TONES[item.key]} icon={Icon} solid={active} />
                      <span className="flex-1">{item.label}</span>
                      <NavBadge count={badgeCount} />
                    </Link>
                    <button
                        type="button"
                        onClick={() => togglePinned(item.key)}
                        aria-pressed={pinned.includes(item.key)}
                        aria-label={pinned.includes(item.key) ? `${item.label} sabitlemesini kaldır` : `${item.label} sayfasını sabitle`}
                        className={cn(
                          "absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md",
                          pinned.includes(item.key) ? "text-primary" : "text-muted-foreground/60",
                        )}
                      >
                        <Pin className={cn("size-3.5", pinned.includes(item.key) && "fill-current")} />
                      </button>
                  </div>
                  {(item.children ?? []).map((child) => {
                    const childActive = isDashboardNavActive(pathname, child.href);
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        onClick={() => onMoreOpenChange(false)}
                        className={cn(
                          "flex items-center rounded-lg py-2 pl-10 pr-3 text-sm",
                          childActive
                            ? cn("font-semibold text-foreground", TONE_ROW[NAV_TONES[item.key]].selected)
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
            {primaryChildren.map((child) => {
              const childActive = isDashboardNavActive(pathname, child.href);
              return (
                <Link
                  key={child.key}
                  href={child.href}
                  onClick={() => onMoreOpenChange(false)}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2.5 text-sm",
                    childActive
                      ? cn("font-semibold text-foreground", TONE_ROW[child.tone].selected)
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
          )}
        </SheetContent>
      </Sheet>
    </nav>
  );
}
