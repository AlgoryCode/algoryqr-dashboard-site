"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import MenuCategoriesPanel from "@/components/dashboard/menu/MenuCategoriesPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";

export default function DigitalMenuCategoriesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQrId = useMemo(() => {
    const raw = Number(searchParams.get("qr"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Kategoriler"
        hint="Kategorileri tek başına oluşturun. Ürün eklerken bir kategoriye bağlayın."
        back={
          initialQrId != null ? (
            <Link
              href={DASHBOARD_ROUTES.digitalMenuEdit(initialQrId)}
              aria-label="Menü editörüne dön"
              className={DASHBOARD_BACK}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

      <div className={DASHBOARD_PANEL}>
        <MenuCategoriesPanel
          catalog
          menuId={0}
          qrId={0}
          onAddProduct={(categoryId) => {
            router.push(DASHBOARD_ROUTES.digitalMenuProductCreateFor(null, categoryId));
          }}
        />
      </div>
    </div>
  );
}
