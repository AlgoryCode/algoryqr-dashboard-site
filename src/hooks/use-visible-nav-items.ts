"use client";

import { useMemo } from "react";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { useAccessSession } from "@/hooks/use-commerce";
import { hasScope } from "@/lib/auth-user";
import { DASHBOARD_NAV_ITEMS, type DashboardNavItem } from "@/lib/dashboard-routes";

/** Menu entries this account may open; the sidebar, mobile menu and home page all show this same list. */
export function useVisibleNavItems(): DashboardNavItem[] {
  const { data: accessProfile } = useAccessProfile();
  const accessSession = useAccessSession();
  const hasAllowAccess = accessSession.data?.decision === "ALLOW";
  return useMemo(
    () =>
      DASHBOARD_NAV_ITEMS.filter((item) => {
        if (item.requiresAllowAccess && !hasAllowAccess) return false;
        if (item.key === "reports") {
          return hasScope(accessProfile, "SMART_REPORTING_OWNER") || hasScope(accessProfile, "WAITER_PANEL_OWNER");
        }
        return !item.requiredScope || hasScope(accessProfile, item.requiredScope);
      }),
    [accessProfile, hasAllowAccess],
  );
}
