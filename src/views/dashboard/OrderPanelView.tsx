"use client";

import { useState } from "react";
import { Bell, Bike, Check, Copy, CookingPot, ExternalLink } from "lucide-react";

import { DashboardHubTile } from "@/components/dashboard/DashboardHubTile";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { anyBranchHasKitchen } from "@/lib/branch";
import { DASHBOARD_HUB_GRID, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export default function OrderPanelView() {
  const { notify } = useDashboardBanners();
  const [copied, setCopied] = useState<"waiter" | "kitchen" | "courier" | null>(null);
  const branchesQuery = useBranches(true);
  const kitchenEnabled = anyBranchHasKitchen(branchesQuery.data?.content);

  const copyLink = async (href: string, kind: "waiter" | "kitchen" | "courier") => {
    const absolute =
      typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(kind);
      notify(
        "info",
        kind === "kitchen"
          ? "Mutfak paneli linki kopyalandı."
          : kind === "courier"
            ? "Kurye paneli linki kopyalandı."
            : "Garson paneli linki kopyalandı.",
      );
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      notify("danger", "Link kopyalanamadı.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Garson Paneli"
        hint={
          kitchenEnabled
            ? "Garson, mutfak ve kurye ekranları ayrı uygulamalardır"
            : "Garson servis ekranı ve kurye teslimat ekranı ayrı uygulamalardır"
        }
      />

      <div className="flex items-center gap-2">
        <Button asChild className="h-11 min-w-0 flex-1 gap-2">
          <a href={DASHBOARD_ROUTES.waiterPanel} target="_blank" rel="noopener noreferrer">
            Garson paneline git
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <button
          type="button"
          onClick={() => void copyLink(DASHBOARD_ROUTES.waiterPanel, "waiter")}
          className={`${DASHBOARD_SURFACE} inline-flex h-11 w-11 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-muted`}
          aria-label="Garson paneli linkini kopyala"
          title={copied === "waiter" ? "Kopyalandı" : "Linki kopyala"}
        >
          {copied === "waiter" ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      {kitchenEnabled ? (
        <div className="flex items-center gap-2">
          <Button asChild className="h-11 min-w-0 flex-1 gap-2">
            <a href={DASHBOARD_ROUTES.kitchenPanel} target="_blank" rel="noopener noreferrer">
              Mutfak paneline git
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <button
            type="button"
            onClick={() => void copyLink(DASHBOARD_ROUTES.kitchenPanel, "kitchen")}
            className={`${DASHBOARD_SURFACE} inline-flex h-11 w-11 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-muted`}
            aria-label="Mutfak paneli linkini kopyala"
            title={copied === "kitchen" ? "Kopyalandı" : "Linki kopyala"}
          >
            {copied === "kitchen" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button asChild className="h-11 min-w-0 flex-1 gap-2">
          <a href={DASHBOARD_ROUTES.courierPanel} target="_blank" rel="noopener noreferrer">
            Kurye paneline git
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <button
          type="button"
          onClick={() => void copyLink(DASHBOARD_ROUTES.courierPanel, "courier")}
          className={`${DASHBOARD_SURFACE} inline-flex h-11 w-11 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-muted`}
          aria-label="Kurye paneli linkini kopyala"
          title={copied === "courier" ? "Kopyalandı" : "Linki kopyala"}
        >
          {copied === "courier" ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

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
        <DashboardHubTile
          title="Kurye"
          description="Hazır paketleri teslim alın ve müşteriye götürün"
          icon={Bike}
          href={DASHBOARD_ROUTES.courierPanel}
        />
      </div>
    </div>
  );
}
