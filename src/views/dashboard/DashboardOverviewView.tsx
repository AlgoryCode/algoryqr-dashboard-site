"use client";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import {
  ACCOUNT_TILES,
  OPERATION_TILES,
  OverviewShortcutGrid,
  SHORTCUT_CARD_CLASS,
} from "@/components/dashboard/overview-shortcuts";
import { ReportIssueCard } from "@/components/dashboard/ReportIssueCard";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { useOverviewOpsStats } from "@/hooks/use-overview-ops-stats";
import { hasScope } from "@/lib/auth-user";

export default function DashboardOverviewView() {
  const { data: accessProfile } = useAccessProfile();
  const showOrders = hasScope(accessProfile, "WAITER_PANEL_OWNER");
  const showMenus = hasScope(accessProfile, "QR_MENU_OWNER");
  const stats = useOverviewOpsStats({
    orders: showOrders,
    reservations: showMenus,
    menus: showMenus,
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <DashboardPageHeader
          title="Genel Bakış"
          hint="Bugünün operasyonu ve sık kullanılan işlemler."
        />
      </div>

      <div className="space-y-8">
        <section aria-label="Operasyon">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operasyon
          </h2>
          <OverviewShortcutGrid tiles={OPERATION_TILES} pendingOrderCount={stats.pendingOrders} />
        </section>
        <section aria-label="Hesap">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hesap
          </h2>
          <OverviewShortcutGrid tiles={ACCOUNT_TILES} pendingOrderCount={0} />
        </section>
        <section aria-label="Destek">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <ReportIssueCard className={\ items-start\} />
          </div>
        </section>
      </div>
    </div>
  );
}
