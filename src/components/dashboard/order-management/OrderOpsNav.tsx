"use client";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export function OrderAppLaunchers(_props: {
  kitchenEnabled: boolean;
  courierEnabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={DASHBOARD_ROUTES.staffGate}
        className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Personel girişi
      </a>
    </div>
  );
}
