"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

import { CatalogProductsPanel } from "@/components/dashboard/menu/CatalogProductsPanel";
import MenuProductsPanel from "@/components/dashboard/menu/MenuProductsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";
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
            : "Tüm menülerinizdeki ürünler. Şube ve menüye göre daraltabilirsiniz."
        }
        action={
          fromHub ? undefined : (
            <Button size="sm" className="h-9 w-full shrink-0 gap-1.5 sm:w-auto" asChild>
              <Link href={DASHBOARD_ROUTES.digitalMenuProductCreate}>
                <Plus className="size-3.5" />
                Ürün oluştur
              </Link>
            </Button>
          )
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
          <CatalogProductsPanel />
        )}
    </div>
  );
}
