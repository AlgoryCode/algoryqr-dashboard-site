"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import MenuCategoriesPanel from "@/components/dashboard/menu/MenuCategoriesPanel";
import { ProductsExplorer } from "@/components/dashboard/menu/ProductsExplorer";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK, DASHBOARD_CONTENT } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

/**
 * Serves /kategoriler and /opsiyonlar:
 *  - default: the Ürünler explorer (categories or options side, by path),
 *  - `?qr=<id>&duzenle=1`: one menu's drag-and-drop editor (ordering, covers),
 *  - `?kutuphane=1`: the editor of categories that belong to no menu.
 */
export default function DigitalMenuCategoriesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qrId = useMemo(() => {
    const raw = Number(searchParams.get("qr"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const library = searchParams.get("kutuphane") === "1";
  const ordering = qrId != null && searchParams.get("duzenle") === "1";
  const editing = ordering || library;

  // The shell renders this route edge to edge, so the explorer can be a full-height second sidebar;
  // the two editors bring back the usual padded page.
  if (!editing) return <ProductsExplorer />;

  return (
    <div className={cn(DASHBOARD_CONTENT, "space-y-6 p-6 animate-fade-in lg:p-8")}>
      <DashboardBreadcrumbs pathname={pathname} />
      <DashboardPageHeader
        title={ordering ? "Kategorileri sırala" : "Menüsüz kategoriler"}
        hint={
          ordering
            ? "Sürükleyerek sıralayın, kapak görsellerini değiştirin."
            : "Henüz bir menüye bağlı olmayan kategoriler."
        }
        back={
          <Link
              href={ordering ? `${DASHBOARD_ROUTES.digitalMenuCategories}?qr=${qrId}` : DASHBOARD_ROUTES.digitalMenuCategories}
              aria-label="Kategorilere dön"
              className={DASHBOARD_BACK}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
        }
      />

      {ordering && qrId != null ? (
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
  );
}
