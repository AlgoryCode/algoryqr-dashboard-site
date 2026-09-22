"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import MenuProductsPanel from "@/components/dashboard/menu/MenuProductsPanel";
import { useMyStore } from "@/hooks/use-store";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";

export default function OnlineOrderProductsView() {
  const { merchant, isLoading } = useMyStore();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor…
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className={`${DASHBOARD_PANEL} space-y-3`}>
        <p className="text-sm text-muted-foreground">Önce mağazanızı kurmanız gerekiyor.</p>
        <Link href={DASHBOARD_ROUTES.onlineOrderSetup} className="text-sm font-medium underline">
          Kurulumu başlat
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Mağaza ürünleri"
        hint="Bu katalog yalnızca online sipariş mağazanızda görünür; QR menünüzü etkilemez."
        back={
          <Link href={DASHBOARD_ROUTES.onlineOrder} aria-label="Geri" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <div className={DASHBOARD_PANEL}>
        <MenuProductsPanel menuId={merchant.catalogMenuId} qrId={null} />
      </div>
    </div>
  );
}
