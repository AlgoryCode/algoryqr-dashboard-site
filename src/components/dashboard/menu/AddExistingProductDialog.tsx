"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useMenuCategories } from "@/hooks/use-menu-categories";
import { invalidateMenuProducts } from "@/hooks/use-menu-products";
import { assignProductToMenuRequest, listCatalogProductsRequest } from "@/lib/api";

type AddExistingProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: number;
  qrId?: number | null;
};

export function AddExistingProductDialog({
  open,
  onOpenChange,
  menuId,
  qrId,
}: AddExistingProductDialogProps) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const catalogQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: listCatalogProductsRequest,
    enabled: open,
  });
  const categoriesQuery = useMenuCategories(open ? menuId : null);
  const [productId, setProductId] = useState<number | null>(null);
  const [mainCategoryId, setMainCategoryId] = useState<number | "">("");
  const [subCategoryId, setSubCategoryId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const products = useMemo(
    () => (catalogQuery.data ?? []).filter((product) => product.menuId !== menuId),
    [catalogQuery.data, menuId],
  );
  const categories = categoriesQuery.data ?? [];
  const subs = categories.find((category) => category.id === mainCategoryId)?.subs ?? [];

  const close = () => {
    setProductId(null);
    setMainCategoryId("");
    setSubCategoryId("");
    onOpenChange(false);
  };

  const submit = async () => {
    if (productId == null) {
      notify("warning", "Eklenecek ürünü seçin.");
      return;
    }
    if (typeof subCategoryId !== "number" || subCategoryId <= 0) {
      notify("warning", "Ürünü bağlamak için bir alt kategori seçin.");
      return;
    }
    setSaving(true);
    try {
      await assignProductToMenuRequest(menuId, productId, subCategoryId);
      await invalidateMenuProducts(queryClient, menuId, qrId ?? undefined);
      await queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
      notify("info", "Ürün menüye eklendi.");
      close();
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Ürün eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Var olan ürün ekle</DialogTitle>
          <DialogDescription>
            Kayıtlı ürünlerinizden birini seçip bu menünün kategorisine bağlayın.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Ürün</Label>
            <SearchableSelect
              value={productId == null ? "" : String(productId)}
              onValueChange={(next) => setProductId(next ? Number(next) : null)}
              options={products.map((product) => ({
                value: String(product.productId),
                label: product.menuId == null ? product.name : `${product.name} · başka menüde`,
              }))}
              placeholder={catalogQuery.isLoading ? "Ürünler yükleniyor..." : "Ürün seçin"}
              searchPlaceholder="Ürün ara..."
              emptyText="Eklenebilecek ürün yok."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ana kategori</Label>
            <SearchableSelect
              value={mainCategoryId === "" ? "" : String(mainCategoryId)}
              onValueChange={(next) => {
                setMainCategoryId(next ? Number(next) : "");
                setSubCategoryId("");
              }}
              options={categories.map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              placeholder="Ana kategori seçin"
              searchPlaceholder="Kategori ara..."
              emptyText="Kategori yok."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Alt kategori</Label>
            <SearchableSelect
              value={subCategoryId === "" ? "" : String(subCategoryId)}
              onValueChange={(next) => setSubCategoryId(next ? Number(next) : "")}
              options={subs.map((sub) => ({ value: String(sub.id), label: sub.name }))}
              placeholder="Alt kategori seçin"
              searchPlaceholder="Alt kategori ara..."
              emptyText="Alt kategori yok."
              disabled={mainCategoryId === ""}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={saving}>
            Vazgeç
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Menüye ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
