"use client";

import { Bell, Bike, CookingPot, ExternalLink } from "lucide-react";

import { DashboardHubTile } from "@/components/dashboard/DashboardHubTile";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/use-branches";
import { anyBranchHasCourier, anyBranchHasKitchen } from "@/lib/branch";
import { DASHBOARD_HUB_GRID } from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export default function OrderPanelView() {
  const branchesQuery = useBranches(true);
  const kitchenEnabled = anyBranchHasKitchen(branchesQuery.data?.content);
  const courierEnabled = anyBranchHasCourier(branchesQuery.data?.content);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Garson Paneli"
        hint={orderPanelHint(kitchenEnabled, courierEnabled)}
      />

      <Button asChild className="h-11 w-full gap-2">
        <a href={DASHBOARD_ROUTES.staffGate}>
          Personel girişi
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>

      <div className={DASHBOARD_HUB_GRID}>
        <DashboardHubTile
          title="Sipariş Yönetimi"
          description="Bekleyen siparişleri onayla veya reddet"
          icon={Bell}
          href={DASHBOARD_ROUTES.waiter}
        />
        {kitchenEnabled ? (
          <DashboardHubTile
            title="Mutfak"
            description="Hazırlık kuyruğunu izle. Müşteriye teslim garson uygulamasındadır"
            icon={CookingPot}
            href={DASHBOARD_ROUTES.kitchenMonitor}
          />
        ) : null}
        {courierEnabled ? (
          <DashboardHubTile
            title="Kurye"
            description="Hazır paketleri teslim alın ve müşteriye götürün"
            icon={Bike}
            href={DASHBOARD_ROUTES.staffGate}
          />
        ) : null}
      </div>
    </div>
  );
}

function orderPanelHint(kitchenEnabled: boolean, courierEnabled: boolean) {
  const apps = ["Garson", kitchenEnabled ? "mutfak" : null, courierEnabled ? "kurye" : null].filter(Boolean);
  return `Personel tek girişten ${apps.join(", ").toLocaleLowerCase("tr-TR")} ekranına gider`;
}
