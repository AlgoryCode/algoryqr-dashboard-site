"use client";

import Link from "next/link";
import {
  BellRing,
  BookOpen,
  Calculator,
  CalendarDays,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

import { RequireScope } from "@/components/auth/RequireScope";
import { NavBadge } from "@/components/dashboard/NavBadge";
import { useAccessSession } from "@/hooks/use-commerce";
import type { ProductScope } from "@/lib/auth-user";
import { resolveDigitalMenuMenusHref } from "@/lib/dashboard-menu-context";
import {
  DASHBOARD_HUB_GRID,
  DASHBOARD_ICON_WELL,
  DASHBOARD_TILE_ROW,
} from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export const SHORTCUT_CARD_CLASS = DASHBOARD_TILE_ROW;

type OverviewTile = {
  title: string;
  href: string | (() => string);
  icon: LucideIcon;
  requiredScope?: ProductScope;
  requiresAllowAccess?: boolean;
  badgeKey?: "pendingOrders";
};

export const OPERATION_TILES: OverviewTile[] = [
  {
    title: "Sipariş Yönetimi",
    href: DASHBOARD_ROUTES.waiter,
    icon: BellRing,
    requiredScope: "WAITER_PANEL_OWNER",
  },
  {
    title: "Menülerim",
    href: () => resolveDigitalMenuMenusHref(),
    icon: BookOpen,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    title: "Rezervasyonlar",
    href: DASHBOARD_ROUTES.reservations,
    icon: CalendarDays,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    title: "Raporlar",
    href: DASHBOARD_ROUTES.reportsHub,
    icon: Sparkles,
    requiredScope: "SMART_REPORTING_OWNER",
  },
  {
    title: "Muhasebe",
    href: DASHBOARD_ROUTES.muhasebe,
    icon: Calculator,
    requiresAllowAccess: true,
  },
];

export const ACCOUNT_TILES: OverviewTile[] = [
  {
    title: "Hesabım",
    href: DASHBOARD_ROUTES.account,
    icon: User,
  },
];

function Tile({
  title,
  href,
  icon: Icon,
  badgeCount = 0,
}: OverviewTile & { badgeCount?: number }) {
  const resolvedHref = typeof href === "function" ? href() : href;

  return (
    <Link href={resolvedHref} className={SHORTCUT_CARD_CLASS}>
      <span className={`${DASHBOARD_ICON_WELL} h-9 w-9 text-sm`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium tracking-tight text-foreground">{title}</span>
      <NavBadge count={badgeCount} className="ml-0" />
    </Link>
  );
}

export function OverviewShortcutGrid({
  tiles,
  pendingOrderCount,
}: {
  tiles: OverviewTile[];
  pendingOrderCount: number;
}) {
  const accessSession = useAccessSession();
  const hasAllowAccess = accessSession.data?.decision === "ALLOW";
  const visibleTiles = tiles.filter((tile) => !tile.requiresAllowAccess || hasAllowAccess);

  return (
    <div className={DASHBOARD_HUB_GRID}>
      {visibleTiles.map((tile) => (
        <RequireScope key={tile.title} scope={tile.requiredScope}>
          <Tile
            {...tile}
            badgeCount={tile.badgeKey === "pendingOrders" ? pendingOrderCount : 0}
          />
        </RequireScope>
      ))}
    </div>
  );
}
