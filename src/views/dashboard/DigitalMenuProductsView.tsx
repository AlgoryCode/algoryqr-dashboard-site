"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CatalogProductsPanel } from "@/components/dashboard/menu/CatalogProductsPanel";
import MenuProductsPanel from "@/components/dashboard/menu/MenuProductsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";

export default function DigitalMenuProductsView() {
  const searchParams = useSearchParams();
  const initialQrId = useMemo(() => {
    const raw = Number(searchParams.get("qr"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const presetCategoryId = useMemo(() => {
    const raw = Number(searchParams.get("category"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const fromHub = initialQrId != null;

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Ürünler"
        hint={
          fromHub
            ? "Bu menünün ürünleri. Yeni ürün oluşturabilir veya var olan bir ürünü ekleyebilirsiniz."
            : "Ürünler menüden bağımsız oluşturulur. İstediğiniz menüye daha sonra atanır."
        }
        back={
          fromHub ? (
            <Link
              href={DASHBOARD_ROUTES.digitalMenuEdit(initialQrId!)}
              aria-label="Menü editörüne dön"
              className={DASHBOARD_BACK}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

        {fromHub ? (
          <div className={DASHBOARD_PANEL}>
            <MenuProductsPanel menuId={0} qrId={initialQrId} presetCategoryId={presetCategoryId} />
          </div>
        ) : (
          <div className={DASHBOARD_PANEL}>
            <CatalogProductsPanel />
          </div>
        )}
    </div>
  );
}
