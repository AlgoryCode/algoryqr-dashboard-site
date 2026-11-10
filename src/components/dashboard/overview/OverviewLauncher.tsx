"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DASHBOARD_NAV_ICONS, DASHBOARD_NAV_TONES } from "@/components/dashboard/nav-icons";
import { ToneIcon } from "@/components/dashboard/tone";
import { useVisibleNavItems } from "@/hooks/use-visible-nav-items";
import { getVisibleDashboardNavGroups } from "@/lib/dashboard-routes";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

/**
 * Every page the account can open, grouped exactly like the sidebar.
 * Groups flow into columns, so cards of different lengths leave no holes at any width.
 */
export function OverviewLauncher() {
  const items = useVisibleNavItems().filter((item) => !item.excludeFromSidebar && item.key !== "overview");
  const groups = getVisibleDashboardNavGroups(items);
  if (groups.length === 0) return null;

  return (
    <section aria-label="Tüm sayfalar" className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Tüm sayfalar</h2>
      <div className="gap-3 sm:columns-2 xl:columns-3 [&>*]:mb-3">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group.id} className={cn(DASHBOARD_SURFACE, "break-inside-avoid p-2")}>
            <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">{group.label || "Genel"}</p>
            <ul>
              {groupItems.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ToneIcon tone={DASHBOARD_NAV_TONES[item.key]} icon={DASHBOARD_NAV_ICONS[item.key]} size="lg" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.label}</span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
