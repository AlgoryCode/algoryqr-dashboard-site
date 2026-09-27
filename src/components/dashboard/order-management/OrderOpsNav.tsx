"use client";

import { ExternalLink } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export function OrderAppLaunchers({
  kitchenEnabled,
  courierEnabled = true,
}: {
  kitchenEnabled: boolean;
  courierEnabled?: boolean;
}) {
  const apps = [
    kitchenEnabled
      ? { href: DASHBOARD_ROUTES.kitchenPanel, label: "Mutfak" }
      : null,
    courierEnabled
      ? { href: DASHBOARD_ROUTES.courierPanel, label: "Kurye" }
      : null,
    { href: DASHBOARD_ROUTES.waiterPanel, label: "Garson" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="flex flex-wrap gap-2">
      {apps.map((app) => (
        <a
          key={app.href}
          href={app.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {app.label}
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
