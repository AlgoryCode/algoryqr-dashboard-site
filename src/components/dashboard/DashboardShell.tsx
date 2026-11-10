"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Info,
  AlertTriangle,
  XCircle,
  X,
  PanelLeft,
  PanelLeftClose,
  Menu,
} from "lucide-react";

import TrialReminderDialog from "@/components/dashboard/TrialReminderDialog";
import TrialReminderHeaderBadge from "@/components/dashboard/TrialReminderHeaderBadge";
import PackageAccessGate from "@/components/dashboard/PackageAccessGate";
import { TrialReminderUiProvider } from "@/contexts/trial-reminder-ui";
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs";
import {
  DashboardCommandPalette,
  useCommandPaletteHotkey,
} from "@/components/dashboard/DashboardCommandPalette";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import { DashboardSidebarNav, sidebarLabelClass } from "@/components/dashboard/DashboardSidebarNav";
import {
  AccountMenu,
  DashboardTopBar,
  QuickCreateMenu,
  ShortcutsDialog,
  useShortcutsHotkey,
} from "@/components/dashboard/DashboardTopBar";
import { DashboardPageLabelProvider, useDashboardPageLabelValue } from "@/contexts/dashboard-page-label";
import { DashboardAssistantLauncher } from "@/components/dashboard/DashboardAssistantChat";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DashboardBannersProvider,
  useDashboardBannerState,
} from "@/contexts/dashboard-banners";
import { useTokenRefresh } from "@/hooks/use-token-refresh";
import { useVisibleNavItems } from "@/hooks/use-visible-nav-items";
import { logout as logoutSession } from "@/lib/site-session";
import { SESSION_CONTEXT_QUERY_KEY } from "@/hooks/use-session-context";
import { useQueryClient } from "@tanstack/react-query";
import type { SessionContext } from "@/lib/session-context";
import {
  DASHBOARD_ROUTES,
  isDashboardNavActive,
  splitMobileDashboardNav,
  type DashboardNavItem,
} from "@/lib/dashboard-routes";
import { DASHBOARD_CONTENT } from "@/lib/dashboard-surface";
import type { StoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const bannerStyles = {
  info: "bg-[color-mix(in_srgb,hsl(var(--card))_88%,hsl(217_91%_60%)_12%)] border-blue-500/20 text-blue-500 shadow-lg",
  warning: "bg-[color-mix(in_srgb,hsl(var(--card))_88%,hsl(var(--warning))_12%)] border-warning/20 text-warning shadow-lg",
  danger: "bg-[color-mix(in_srgb,hsl(var(--card))_88%,hsl(var(--destructive))_12%)] border-destructive/20 text-destructive shadow-lg",
};

const bannerIcons = { info: Info, warning: AlertTriangle, danger: XCircle };

const SIDEBAR_COLLAPSED_KEY = "algory-dashboard-sidebar-collapsed";

const SIDEBAR_ITEM =
  "flex h-9 w-full items-center justify-start gap-2.5 overflow-hidden rounded-[10px] px-1.5 text-sm font-medium transition-colors";

function sidebarItemClass(active: boolean) {
  return cn(
    SIDEBAR_ITEM,
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

function navSectionActive(pathname: string, item: DashboardNavItem) {
  return (
    isDashboardNavActive(pathname, item.href, item.key) ||
    (item.children ?? []).some((child) => isDashboardNavActive(pathname, child.href))
  );
}


interface DashboardShellProps {
  initialUser?: StoredUser | null;
  initialSession?: SessionContext | null;
  children: ReactNode;
}

function SessionCacheHydrator({ session }: { session?: SessionContext | null }) {
  const queryClient = useQueryClient();
  const seeded = useRef(false);
  if (session && !seeded.current) {
    queryClient.setQueryData(SESSION_CONTEXT_QUERY_KEY, session);
    seeded.current = true;
  }
  return null;
}

function DashboardShellInner({ children, initialSession, initialUser }: DashboardShellProps) {
  const pathname = usePathname();
  const isOnlineBoard = pathname === DASHBOARD_ROUTES.onlineOrderOrders;
  const { banners, addBanner, removeBanner } = useDashboardBannerState();
  const [portalReady, setPortalReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useTokenRefresh();
  const visibleNavItems = useVisibleNavItems();
  const menuNavItems = useMemo(
    () =>
      visibleNavItems.filter((item) => !item.excludeFromSidebar),
    [visibleNavItems],
  );
  const mobileNavItems = useMemo(
    () => visibleNavItems.filter((item) => item.key !== "uberEats" && !item.excludeFromMobileNav),
    [visibleNavItems],
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileOverflow = useMemo(
    () => splitMobileDashboardNav(mobileNavItems).overflow,
    [mobileNavItems],
  );
  const moreActive =
    mobileOverflow.some((item) => isDashboardNavActive(pathname, item.href, item.key)) ||
    mobileNavItems.some((item) => navSectionActive(pathname, item) && (item.children?.length ?? 0) > 0 &&
      (item.children ?? []).some((child) => isDashboardNavActive(pathname, child.href)));
  const toggleCommand = useCallback(() => setCommandOpen((open) => !open), []);
  const openCommand = useCallback(() => setCommandOpen(true), []);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useShortcutsHotkey(openShortcuts);
  useCommandPaletteHotkey(toggleCommand);

  useEffect(() => {
    const timer = window.setTimeout(() => setPortalReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Ctrl/Cmd + B: yan menüyü daralt / genişlet.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
        const target = event.target as HTMLElement | null;
        if (target && (target.isContentEditable || target.tagName === "TEXTAREA")) return;
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const pageLabel = useDashboardPageLabelValue();
  const isFullScreenGate =
    pathname === DASHBOARD_ROUTES.trialExpired || pathname === DASHBOARD_ROUTES.trialStart;

  const logout = async () => {
    await logoutSession();
  };

  const bannerPortal =
    portalReady &&
    createPortal(
      <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center pointer-events-none">
        <AnimatePresence>
          {banners.map((banner) => {
            const BannerIcon = bannerIcons[banner.type];
            return (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, y: -60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -60 }}
                className={`pointer-events-auto mt-2 mx-4 w-full max-w-lg rounded-lg border px-4 py-3 flex items-center gap-3 shadow-lg ${bannerStyles[banner.type]}`}
              >
                <BannerIcon className="h-4 w-4 shrink-0" />
                <p className="text-sm flex-1">{banner.message}</p>
                <button onClick={() => removeBanner(banner.id)} className="shrink-0 opacity-60 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>,
      document.body,
    );

  return (
    <DashboardBannersProvider onBanner={addBanner}>
      <TrialReminderUiProvider>
        {bannerPortal}
        <SessionCacheHydrator session={initialSession} />
        <PackageAccessGate />
        <TrialReminderDialog />
        <DashboardCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        {isFullScreenGate ? (
          <div className="h-svh overflow-hidden bg-background">{children}</div>
        ) : (
      <div className="flex h-svh overflow-hidden bg-background">
        <aside
          className={cn(
            "hidden h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card p-3 transition-[width] duration-300 ease-in-out dark:bg-card lg:flex",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div className="flex h-10 shrink-0 items-center">
            <Tooltip open={collapsed ? undefined : false}>
              <TooltipTrigger asChild>
                <Link
                  href={DASHBOARD_ROUTES.overview}
                  className={cn(SIDEBAR_ITEM, "text-foreground hover:bg-muted hover:text-foreground", collapsed && "justify-center px-0")}
                >
                  <BrandLogo size="sm" />
                  {!collapsed ? (
                    <span className={cn(sidebarLabelClass(false), "text-base font-bold")}>
                      Algory<span className="text-muted-foreground">QR</span>
                    </span>
                  ) : null}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                AlgoryQR
              </TooltipContent>
            </Tooltip>
          </div>

          <DashboardSidebarNav
            items={menuNavItems}
            pathname={pathname}
            collapsed={collapsed}
            onOpenPalette={openCommand}
          />

          <div className="mt-3 shrink-0 space-y-1 border-t border-border pt-3">
            <DashboardAssistantLauncher
              iconOnly={collapsed}
              className={cn(collapsed ? "mx-auto flex h-9 w-9 min-w-0 px-0" : "h-9 w-full justify-start px-2")}
            />
            <Tooltip open={collapsed ? undefined : false}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(sidebarItemClass(false), collapsed && "justify-center px-0")}
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Menüyü genişlet" : "Menüyü küçült"}
                  aria-expanded={!collapsed}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
                  </span>
                  {!collapsed ? <span className={sidebarLabelClass(false)}>Küçült</span> : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {collapsed ? "Menüyü genişlet" : "Menüyü küçült"}
              </TooltipContent>
            </Tooltip>

          </div>
        </aside>

        <main
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto bg-background pb-20 lg:pb-0",
          )}
        >
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
            <Link href={DASHBOARD_ROUTES.overview} className="flex items-center gap-2">
              <BrandLogo size="md" />
              <span className="text-base font-bold">
                Algory<span className="text-muted-foreground">QR</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <TrialReminderHeaderBadge compact />
              <QuickCreateMenu compact />
              <AccountMenu user={initialUser} onLogout={logout} onShowShortcuts={openShortcuts} compact />
              <button
                type="button"
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-md",
                  moreActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                )}
                aria-expanded={moreOpen}
                aria-label="Menü"
                onClick={() => setMoreOpen(true)}
              >
                <Menu className="size-5" />
              </button>
            </div>
          </header>

          <DashboardMobileNav
            items={mobileNavItems}
            pendingOrderCount={0}
            onOpenSearch={() => setCommandOpen(true)}
            moreOpen={moreOpen}
            onMoreOpenChange={setMoreOpen}
          />

          <DashboardTopBar
            pathname={pathname}
            pageLabel={pageLabel}
            user={initialUser}
            onOpenSearch={openCommand}
            onLogout={logout}
            onShowShortcuts={openShortcuts}
          />

          <div
            className={cn(
              pathname === DASHBOARD_ROUTES.onlineOrderOrders ||
              pathname === DASHBOARD_ROUTES.reportsHub ||
              pathname === DASHBOARD_ROUTES.analyticsLegacy ||
              pathname === DASHBOARD_ROUTES.analyticsMenuLegacy
                ? "mx-auto w-full max-w-[90rem]"
                : DASHBOARD_CONTENT,
              isOnlineBoard ? "p-4 lg:px-6 lg:pt-4 lg:pb-0" : "p-6 lg:p-8",
            )}
          >
            {isOnlineBoard ? null : (
              <div className="lg:hidden">
                <DashboardBreadcrumbs pathname={pathname} currentLabel={pageLabel} />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
        )}
      </TrialReminderUiProvider>
    </DashboardBannersProvider>
  );
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <DashboardPageLabelProvider>
      <DashboardShellInner {...props} />
    </DashboardPageLabelProvider>
  );
}
