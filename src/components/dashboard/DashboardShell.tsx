"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import {
  QrCode,
  LogOut,
  BarChart3,
  Blocks,
  User,
  Users,
  UsersRound,
  Info,
  AlertTriangle,
  XCircle,
  X,
  MonitorSmartphone,
  PanelLeft,
  PanelLeftClose,
  TrendingUp,
  Calculator,
  Megaphone,
  Search,
  UtensilsCrossed,
  CalendarDays,
  ChevronDown,
  Warehouse,
} from "lucide-react";

import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import TrialReminderDialog from "@/components/dashboard/TrialReminderDialog";
import TrialReminderHeaderBadge from "@/components/dashboard/TrialReminderHeaderBadge";
import PackageAccessGate from "@/components/dashboard/PackageAccessGate";
import { TrialReminderUiProvider } from "@/contexts/trial-reminder-ui";
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs";
import { SetupNextBanner } from "@/components/dashboard/SetupNextBanner";
import {
  DashboardCommandPalette,
  useCommandPaletteHotkey,
} from "@/components/dashboard/DashboardCommandPalette";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import { NavBadge } from "@/components/dashboard/NavBadge";
import { DashboardPageLabelProvider, useDashboardPageLabelValue } from "@/contexts/dashboard-page-label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DashboardBannersProvider,
  useDashboardBannerState,
} from "@/contexts/dashboard-banners";
import { useTokenRefresh } from "@/hooks/use-token-refresh";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { useAccessSession } from "@/hooks/use-commerce";
import { usePendingOrderCount } from "@/hooks/use-pending-order-count";
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_ROUTES,
  getVisibleDashboardNavGroups,
  isDashboardNavActive,
  type DashboardNavKey,
} from "@/lib/dashboard-routes";
import { ACCOUNT_PAGE_FRAME, DASHBOARD_CONTENT } from "@/lib/dashboard-surface";
import { hasScope } from "@/lib/auth-user";
import type { StoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<DashboardNavKey, ComponentType<{ className?: string }>> = {
  overview: BarChart3,
  modules: Blocks,
  digitalMenu: DigitalMenuIcon,
  uberEats: UtensilsCrossed,
  orderPanel: MonitorSmartphone,
  reservations: CalendarDays,
  stock: Warehouse,
  reports: TrendingUp,
  accounting: Calculator,
  menuUsers: Users,
  menuCustomers: UsersRound,
  campaigns: Megaphone,
  qrCodes: QrCode,
  account: User,
} as const;

const bannerStyles = {
  info: "bg-[color-mix(in_srgb,hsl(var(--card))_88%,hsl(217_91%_60%)_12%)] border-blue-500/20 text-blue-500 shadow-lg",
  warning: "bg-[color-mix(in_srgb,hsl(var(--card))_88%,hsl(var(--warning))_12%)] border-warning/20 text-warning shadow-lg",
  danger: "bg-[color-mix(in_srgb,hsl(var(--card))_88%,hsl(var(--destructive))_12%)] border-destructive/20 text-destructive shadow-lg",
};

const bannerIcons = { info: Info, warning: AlertTriangle, danger: XCircle };

const SIDEBAR_COLLAPSED_KEY = "algory-dashboard-sidebar-collapsed";

const SIDEBAR_ITEM =
  "flex h-10 w-full items-center justify-start gap-3 overflow-hidden rounded-lg px-2.5 text-sm font-medium transition-colors";

function sidebarItemClass(active: boolean) {
  return cn(
    SIDEBAR_ITEM,
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

function sidebarLabelClass(collapsed: boolean) {
  return cn(
    "min-w-0 truncate whitespace-nowrap transition-opacity duration-200 ease-in-out",
    collapsed ? "pointer-events-none opacity-0 duration-150" : "opacity-100 delay-100",
  );
}

interface DashboardShellProps {
  initialUser?: StoredUser | null;
  children: ReactNode;
}

function DashboardShellInner({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const waiterPanel = pathname === DASHBOARD_ROUTES.waiter ? searchParams.get("panel") : null;
  const isWaiterPanel =
    waiterPanel === "kitchen" ||
    waiterPanel === "online" ||
    waiterPanel === "uber-eats" ||
    waiterPanel === "integrations";
  const isOnlineBoard = pathname === DASHBOARD_ROUTES.onlineOrderOrders || waiterPanel === "online";
  const isAccountPage = pathname.startsWith(DASHBOARD_ROUTES.account);
  const { banners, addBanner, removeBanner } = useDashboardBannerState();
  const [portalReady, setPortalReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useTokenRefresh();
  const { data: accessProfile } = useAccessProfile();
  const accessSession = useAccessSession();
  const hasAllowAccess = accessSession.data?.decision === "ALLOW";
  const visibleNavItems = useMemo(
    () =>
      DASHBOARD_NAV_ITEMS.filter((item) => {
        if (item.requiresAllowAccess && !hasAllowAccess) {
          return false;
        }
        if (item.key === "reports") {
          return (
            hasScope(accessProfile, "SMART_REPORTING_OWNER") ||
            hasScope(accessProfile, "WAITER_PANEL_OWNER")
          );
        }
        return !item.requiredScope || hasScope(accessProfile, item.requiredScope);
      }),
    [accessProfile, hasAllowAccess],
  );
  const menuNavItems = useMemo(
    () => visibleNavItems.filter((item) => item.key !== "uberEats"),
    [visibleNavItems],
  );
  const visibleNavGroups = useMemo(
    () => getVisibleDashboardNavGroups(menuNavItems),
    [menuNavItems],
  );
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const isGroupOpen = (groupId: string) => openGroupIds[groupId] ?? true;
  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((prev) => ({ ...prev, [groupId]: !(prev[groupId] ?? true) }));
  };
  const showPendingBadge = hasScope(accessProfile, "WAITER_PANEL_OWNER");
  const { count: pendingOrderCount } = usePendingOrderCount(showPendingBadge);
  const [commandOpen, setCommandOpen] = useState(false);
  const toggleCommand = useCallback(() => setCommandOpen((open) => !open), []);
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

  const pageLabel = useDashboardPageLabelValue();
  const isFullScreenGate =
    pathname === DASHBOARD_ROUTES.trialExpired || pathname === DASHBOARD_ROUTES.trialStart;

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("algory_user");
    }
    await axios.post("/api/auth/logout", undefined, { withCredentials: true }).catch(() => undefined);
    router.push("/login");
    router.refresh();
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
        <PackageAccessGate />
        <TrialReminderDialog />
        <DashboardCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        {isFullScreenGate ? (
          <div className="h-svh overflow-y-auto bg-background">{children}</div>
        ) : (
      <div className="flex h-svh overflow-hidden bg-background">
        <aside
          className={cn(
            "my-3 ml-3 hidden shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-card p-3 transition-[width] duration-300 ease-in-out dark:bg-card lg:flex",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div className="flex h-10 shrink-0 items-center">
            <Tooltip open={collapsed ? undefined : false}>
              <TooltipTrigger asChild>
                <Link
                  href={DASHBOARD_ROUTES.overview}
                  className={cn(SIDEBAR_ITEM, "text-foreground hover:bg-muted hover:text-foreground")}
                >
                  <BrandLogo size="sm" />
                  <span className={cn(sidebarLabelClass(collapsed), "text-base font-bold")}>
                    Algory<span className="text-muted-foreground">QR</span>
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                AlgoryQR
              </TooltipContent>
            </Tooltip>
          </div>

          <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden">
            {visibleNavGroups.map(({ group, items }) => {
              const showChildren = collapsed || !group.label || isGroupOpen(group.id);
              return (
                <div key={group.id} className="space-y-1">
                  {group.label && !collapsed ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-2.5 pb-0.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground"
                      aria-expanded={isGroupOpen(group.id)}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={cn(
                          "size-3.5 shrink-0 transition-transform",
                          isGroupOpen(group.id) && "rotate-180",
                        )}
                      />
                    </button>
                  ) : null}
                  {showChildren
                    ? items.map((item) => {
                        const Icon = NAV_ICONS[item.key];
                        const active = isDashboardNavActive(pathname, item.href);
                        const badgeCount =
                          item.badgeKey === "pendingOrders" ? pendingOrderCount : 0;
                        return (
                          <Tooltip key={item.key} open={collapsed ? undefined : false}>
                            <TooltipTrigger asChild>
                              <Link href={item.href} className={sidebarItemClass(active)}>
                                <Icon className="size-4 shrink-0" />
                                <span className={sidebarLabelClass(collapsed)}>{item.label}</span>
                                {!collapsed ? <NavBadge count={badgeCount} /> : null}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={12}>
                              {item.label}
                              {badgeCount > 0 ? ` (${badgeCount})` : ""}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-3 shrink-0 space-y-1 border-t border-border pt-3">
            <Tooltip open={collapsed ? undefined : false}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={sidebarItemClass(false)}
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Menüyü genişlet" : "Menüyü küçült"}
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <PanelLeft className="size-4 shrink-0" />
                  ) : (
                    <PanelLeftClose className="size-4 shrink-0" />
                  )}
                  <span className={sidebarLabelClass(collapsed)}>
                    {collapsed ? "Genişlet" : "Küçült"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {collapsed ? "Menüyü genişlet" : "Menüyü küçült"}
              </TooltipContent>
            </Tooltip>

            <Tooltip open={collapsed ? undefined : false}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(sidebarItemClass(false), "text-muted-foreground")}
                  onClick={logout}
                  aria-label="Çıkış Yap"
                >
                  <LogOut className="size-4 shrink-0" />
                  <span className={sidebarLabelClass(collapsed)}>Çıkış Yap</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Çıkış Yap
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        <main
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto bg-background pb-20 lg:pb-0",
            isAccountPage && `m-3 rounded-3xl ${ACCOUNT_PAGE_FRAME}`,
          )}
        >
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
            <Link href={DASHBOARD_ROUTES.overview} className="flex items-center gap-2">
              <BrandLogo size="md" />
              <span className="text-base font-bold">
                Algory<span className="text-muted-foreground">QR</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCommandOpen(true)}
                aria-label="Ara"
              >
                <Search className="size-4" />
              </Button>
              <TrialReminderHeaderBadge compact />
            </div>
          </header>

          <DashboardMobileNav items={menuNavItems} pendingOrderCount={pendingOrderCount} />

          <div className="hidden px-6 pt-3 lg:block">
            <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-1.5">
              <Button
                type="button"
                variant="ghost"
                className="h-8 gap-2 px-2.5 text-sm text-muted-foreground hover:bg-muted/60"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="size-3.5" />
                Ara
                <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">
                  Ctrl K
                </kbd>
              </Button>
              <TrialReminderHeaderBadge />
            </div>
          </div>

          <div
            className={cn(
              pathname === DASHBOARD_ROUTES.onlineOrderOrders || pathname === DASHBOARD_ROUTES.waiter
                ? "mx-auto w-full max-w-[90rem]"
                : DASHBOARD_CONTENT,
              isOnlineBoard ? "p-4 lg:px-6 lg:pt-4 lg:pb-0" : "p-6 lg:p-8",
            )}
          >
            {isOnlineBoard || isWaiterPanel ? null : (
              <DashboardBreadcrumbs pathname={pathname} currentLabel={pageLabel} />
            )}
            <SetupNextBanner />
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
