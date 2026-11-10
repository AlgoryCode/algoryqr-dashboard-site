"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CategoryOverview } from "@/components/dashboard/menu/CategoryOverview";
import MenuCategoriesPanel from "@/components/dashboard/menu/MenuCategoriesPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_PANEL } from "@/lib/dashboard-surface";

/**
 * Three views of the same page:
 *  - no parameter: every menu's categories, grouped by menu (the overview),
 *  - `?qr=<id>`: the editor of one menu's categories,
 *  - `?kutuphane=1`: the editor of categories that belong to no menu.
 */
export default function DigitalMenuCategoriesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrId = useMemo(() => {
    const raw = Number(searchParams.get("qr"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const library = searchParams.get("kutuphane") === "1";
  const editing = qrId != null || library;

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Kategoriler"
        hint={
          qrId != null
            ? "Bu menünün kategorileri. Ürün eklerken bir kategoriye bağlayın."
            : library
              ? "Henüz bir menüye bağlı olmayan kategoriler."
              : "Tüm menülerinizdeki kategoriler. Düzenlemek için ilgili menünün grubunu açın."
        }
        back={
          editing ? (
            <Link
              href={DASHBOARD_ROUTES.digitalMenuCategories}
              aria-label="Tüm kategorilere dön"
              className={DASHBOARD_BACK}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

      {editing ? (
        <div className={DASHBOARD_PANEL}>
          {qrId != null ? (
            <MenuCategoriesPanel
              menuId={0}
              qrId={qrId}
              onAddProduct={(categoryId) => {
                router.push(DASHBOARD_ROUTES.digitalMenuProductCreateFor(qrId, categoryId));
              }}
            />
          ) : (
            <MenuCategoriesPanel
              catalog
              menuId={0}
              qrId={0}
              onAddProduct={(categoryId) => {
                router.push(DASHBOARD_ROUTES.digitalMenuProductCreateFor(null, categoryId));
              }}
            />
          )}
        </div>
      ) : (
        <CategoryOverview />
      )}
    </div>
  );
}
