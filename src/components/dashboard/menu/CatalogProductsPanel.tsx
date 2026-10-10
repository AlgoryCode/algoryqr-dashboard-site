"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useMenuCategories } from "@/hooks/use-menu-categories";
import {
  assignProductToMenuRequest,
  deleteMenuProductRequest,
  getMyMenusRequest,
  listCatalogProductsRequest,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_LIST_ITEM } from "@/lib/dashboard-surface";

export function CatalogProductsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const productsQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: listCatalogProductsRequest,
  });
  const menusQuery = useQuery({
    queryKey: ["myMenus"],
    queryFn: getMyMenusRequest,
  });
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<number | "">("");
  const [subCategoryId, setSubCategoryId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const categoriesQuery = useMenuCategories(typeof menuId === "number" ? menuId : null);
  const products = productsQuery.data ?? [];
  const subs = (categoriesQuery.data ?? []).flatMap((category) =>
    (category.subs ?? []).map((sub) => ({
      value: String(sub.id),
      label: `${category.name} / ${sub.name}`,
    })),
  );

  const assign = async () => {
    if (assigningId == null || typeof menuId !== "number" || typeof subCategoryId !== "number") {
      notify("warning", "Menü ve alt kategori seçin.");
      return;
    }
    setSaving(true);
    try {
      await assignProductToMenuRequest(menuId, assigningId, subCategoryId);
      await queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
      notify("info", "Ürün menüye atandı.");
      setAssigningId(null);
      setMenuId("");
      setSubCategoryId("");
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Ürün atanamadı.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (productId: number) => {
    try {
      await deleteMenuProductRequest(productId);
      await queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
      notify("info", "Ürün silindi.");
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Ürün silinemedi.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => router.push(DASHBOARD_ROUTES.digitalMenuProductCreate)}>
          <Plus className="h-3.5 w-3.5" />
          Ürün oluştur
        </Button>
      </div>
      {productsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ürünler yükleniyor…
        </p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Henüz ürün yok. Menü seçmeden ürün oluşturabilirsiniz.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.productId} className={`${DASHBOARD_LIST_ITEM} flex flex-col gap-3 sm:flex-row sm:items-center`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.menuId == null ? "Menüye atanmadı" : `Menü #${product.menuId}`}
                </p>
              </div>
              {assigningId === product.productId ? (
                <div className="grid w-full gap-2 sm:max-w-xl sm:grid-cols-[1fr_1fr_auto]">
                  <SearchableSelect
                    value={menuId === "" ? "" : String(menuId)}
                    onValueChange={(next) => {
                      setMenuId(next ? Number(next) : "");
                      setSubCategoryId("");
                    }}
                    options={(menusQuery.data ?? []).map((menu) => ({
                      value: String(menu.menuId),
                      label: menu.businessName?.trim() || `Menü #${menu.menuId}`,
                    }))}
                    placeholder="Menü seçin"
                    searchPlaceholder="Menü ara..."
                    emptyText="Menü yok."
                  />
                  <SearchableSelect
                    value={subCategoryId === "" ? "" : String(subCategoryId)}
                    onValueChange={(next) => setSubCategoryId(next ? Number(next) : "")}
                    options={subs}
                    placeholder="Alt kategori"
                    searchPlaceholder="Kategori ara..."
                    emptyText="Önce menü seçin."
                    disabled={menuId === ""}
                  />
                  <Button size="sm" disabled={saving} onClick={() => void assign()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ata"}
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => setAssigningId(product.productId)}>
                    Menüye ata
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link
                      href={
                        product.menuId != null
                          ? DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(product.productId, product.menuId)
                          : `${DASHBOARD_ROUTES.digitalMenuProducts}/${product.productId}`
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => void remove(product.productId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
