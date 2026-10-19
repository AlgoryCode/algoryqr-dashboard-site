"use client";

import { useEffect, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Blocks,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  IdCard,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Package,
  QrCode,
  Search,
  Sparkles,
  TrendingUp,
  User,
  UsersRound,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";

import { DashboardAssistantLauncher } from "@/components/dashboard/DashboardAssistantChat";
import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { NavBadge } from "@/components/dashboard/NavBadge";
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
  type DashboardNavKey,
} from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<DashboardNavKey, ComponentType<{ className?: string }>> = {
  overview: BarChart3,
  modules: Blocks,
  digitalMenu: DigitalMenuIcon,
  myBranches: Building2,
  myMenus: DigitalMenuIcon,
  products: Package,
  uberEats: UtensilsCrossed,
  liveOrders: ClipboardList,
  reservations: CalendarDays,
  restaurantLayout: LayoutGrid,
  stock: Warehouse,
  staff: IdCard,
  reports: TrendingUp,
  smartReports: Sparkles,
  accounting: Calculator,
  feedback: MessageSquare,
  menuCustomers: UsersRound,
  campaigns: Megaphone,
  qrCodes: QrCode,
  account: User,
} as const;

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
  const primaryChildren = primary.flatMap((item) => item.children ?? []);
  const columns = Math.max(primary.length, 1);

  useEffect(() => {
    onMoreOpenChange(false);
  }, [pathname, onMoreOpenChange]);

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
          <div className="mt-4 grid gap-1">
            {onOpenSearch ? (
              <button
                type="button"
                onClick={() => {
                  onMoreOpenChange(false);
                  onOpenSearch();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <Search className="size-4 shrink-0" />
                <span className="flex-1 text-left">Ara</span>
              </button>
            ) : null}
            {onOpenSearch && overflow.length > 0 ? (
              <div className="my-1 border-t border-border" role="presentation" />
            ) : null}
            {overflow.map((item) => {
              const Icon = NAV_ICONS[item.key];
              const active = isDashboardNavActive(pathname, item.href, item.key);
              const badgeCount = item.badgeKey === "pendingOrders" ? pendingOrderCount : 0;
              return (
                <div key={item.key} className="grid gap-1">
                  <Link
                    href={item.href}
                    onClick={() => onMoreOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <NavBadge count={badgeCount} />
                  </Link>
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
                            ? "bg-primary/10 text-primary"
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
