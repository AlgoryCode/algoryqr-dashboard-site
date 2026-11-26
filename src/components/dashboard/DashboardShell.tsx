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
  Search,
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
import { DashboardSidebarNav, SIDEBAR_EASE, sidebarLabelClass } from "@/components/dashboard/DashboardSidebarNav";
import {
  AccountMenu,
  DashboardTopBar,
  QuickCreateMenu,
  ShortcutsDialog,
  useShortcutsHotkey,
} from "@/components/dashboard/DashboardTopBar";
import { DashboardPageLabelProvider, useDashboardPageLabelValue } from "@/contexts/dashboard-page-label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BranchCapacityNotice } from "@/components/dashboard/BranchCapacityNotice";
import { PlatformAnnouncements } from "@/components/dashboard/PlatformAnnouncements";
import { BillingStatusBanner } from "@/components/dashboard/BillingStatusBanner";
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
  navChildren,
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


function navSectionActive(pathname: string, item: DashboardNavItem) {
  return (
    isDashboardNavActive(pathname, item.href, item.key) ||
    navChildren(item).some((child) => isDashboardNavActive(pathname, child.href))
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

const MOBILE_HEADER_ICON_BUTTON =
  "inline-flex size-9 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-[#FFF0F3] hover:text-[#F03245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function DashboardShellInner({ children, initialSession, initialUser }: DashboardShellProps) {
  const pathname = usePathname();
  const isOnlineBoard = pathname === DASHBOARD_ROUTES.onlineOrderOrders;
  // Pages that lay out their own full-height panes (the Ürünler and Yorumlar explorers' second sidebar).
  const isFullBleed =
    pathname === DASHBOARD_ROUTES.digitalMenuCategories ||
    pathname === DASHBOARD_ROUTES.digitalMenuOptions ||
    pathname === DASHBOARD_ROUTES.feedback;
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
    mobileNavItems.some((item) => navSectionActive(pathname, item) && navChildren(item).length > 0 &&
      navChildren(item).some((child) => isDashboardNavActive(pathname, child.href)));
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
            "hidden h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card px-2 py-3 transition-[width] duration-300 will-change-[width] motion-reduce:transition-none dark:bg-card lg:flex",
            SIDEBAR_EASE,
            collapsed ? "w-14" : "w-64",
          )}
        >
          {/* Expanded: logo, wordmark and a collapse button. Collapsed: only the expand
              button stays here; the logo moves into the top bar. */}
          <div className="relative flex h-10 shrink-0 items-center">
            <Link
              href={DASHBOARD_ROUTES.overview}
              inert={collapsed}
              aria-hidden={collapsed || undefined}
              className={cn(
                SIDEBAR_ITEM,
                "min-w-0 flex-1 px-1 pr-10 text-foreground transition-opacity duration-200 hover:bg-muted hover:text-foreground motion-reduce:transition-none",
                collapsed && "pointer-events-none opacity-0",
              )}
            >
              <BrandLogo size="sm" className="h-8 max-w-none sm:h-8" />
              <span className={cn(sidebarLabelClass(collapsed), "text-base font-bold")}>
                Algory<span className="text-muted-foreground">QR</span>
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Menüyü genişlet" : "Menüyü küçült"}
                  aria-expanded={!collapsed}
                  className={cn(
                    "absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-[left,background-color,color] duration-300 hover:bg-[#FFF0F3] hover:text-[#F03245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:hover:bg-[#F03245]/15 dark:hover:text-[#FB7185]",
                    SIDEBAR_EASE,
                    collapsed ? "left-1" : "left-[calc(100%-2rem)]",
                  )}
                >
                  {collapsed ? <PanelLeft className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "bottom"} sideOffset={8}>
                {collapsed ? "Menüyü genişlet" : "Menüyü küçült"}
              </TooltipContent>
            </Tooltip>
          </div>

          <DashboardSidebarNav
            items={menuNavItems}
            pathname={pathname}
            collapsed={collapsed}
            onOpenPalette={openCommand}
          />

        </aside>

        <main
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto bg-background pb-20 lg:pb-0",
          )}
        >
          <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 lg:hidden">
            <div className="flex h-14 items-center gap-2 px-4">
              <Link
                href={DASHBOARD_ROUTES.overview}
                className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Genel bakışa git"
              >
                <BrandLogo size="sm" className="h-8 sm:h-8" />
                <span className="truncate text-[15px] font-bold tracking-tight">
                  Algory<span className="text-muted-foreground">QR</span>
                </span>
              </Link>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <TrialReminderHeaderBadge compact />
                <button
                  type="button"
                  className={MOBILE_HEADER_ICON_BUTTON}
                  aria-label="Ara"
                  onClick={openCommand}
                >
                  <Search className="size-[18px]" />
                </button>
                <QuickCreateMenu compact />
                <button
                  type="button"
                  className={cn(
                    MOBILE_HEADER_ICON_BUTTON,
                    moreActive && "bg-[#FFF0F3] text-[#F03245] hover:bg-[#FFF0F3] dark:bg-[#F03245]/15",
                  )}
                  aria-expanded={moreOpen}
                  aria-label="Menü"
                  onClick={() => setMoreOpen(true)}
                >
                  <Menu className="size-[18px]" />
                </button>
                <span className="mx-1 h-6 w-px bg-border" aria-hidden />
                <AccountMenu user={initialUser} onLogout={logout} onShowShortcuts={openShortcuts} />
              </div>
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
            collapsed={collapsed}
            user={initialUser}
            onOpenSearch={openCommand}
            onLogout={logout}
            onShowShortcuts={openShortcuts}
          />
          <BillingStatusBanner />
          <BranchCapacityNotice />
          <PlatformAnnouncements />

          {isFullBleed ? (
            <div className="w-full">{children}</div>
          ) : (
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
              <DashboardBreadcrumbs pathname={pathname} currentLabel={pageLabel} />
            )}
            {children}
          </div>
          )}
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
