"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { AddButton } from "@/components/dashboard/AddButton";

import { AddExistingProductDialog } from "@/components/dashboard/menu/AddExistingProductDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteMenuProductRequest, flattenMenuCategories } from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { formatProductPrice } from "@/lib/product-list";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { useMenuCategories, useMenuCategoriesByQr } from "@/hooks/use-menu-categories";
import {
  invalidateMenuProducts,
  useMenuProductsPage,
} from "@/hooks/use-menu-products";
import { ProductListHead, ProductRow } from "@/components/dashboard/menu/ProductRow";

type MenuProductsPanelProps = {
  menuId: number;
  qrId: number | null;
  presetCategoryId?: number | null;
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function MenuProductsPanel({
  menuId,
  qrId,
  presetCategoryId,
}: MenuProductsPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [page, setPage] = useState(0);
  const [filterCategoryId, setFilterCategoryId] = useState<number | "all">(
    presetCategoryId ?? "all",
  );
  const [filterName, setFilterName] = useState("");
  const [debouncedFilterName, setDebouncedFilterName] = useState("");
  const [existingOpen, setExistingOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: number; name: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilterName(filterName.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filterName]);

  useEffect(() => {
    setPage(0);
  }, [qrId, debouncedFilterName, filterCategoryId]);

  const categoriesByQrQuery = useMenuCategoriesByQr(qrId, qrId != null);
  const categoriesByMenuQuery = useMenuCategories(menuId > 0 ? menuId : null, qrId == null);
  const categoriesQuery = qrId != null ? categoriesByQrQuery : categoriesByMenuQuery;
  const categories =
    qrId != null ? categoriesByQrQuery.data?.categories ?? [] : categoriesByMenuQuery.data ?? [];
  const resolvedMenuId =
    menuId > 0
      ? menuId
      : categoriesByQrQuery.data?.menuId != null && categoriesByQrQuery.data.menuId > 0
        ? categoriesByQrQuery.data.menuId
        : 0;

  const productsQuery = useMenuProductsPage(
    resolvedMenuId,
    {
      page,
      size: PAGE_SIZE,
      q: debouncedFilterName || undefined,
      subCategoryId: filterCategoryId === "all" ? undefined : filterCategoryId,
    },
    resolvedMenuId > 0,
  );
  const products = productsQuery.data?.content ?? [];
  const totalElements = productsQuery.data?.totalElements ?? products.length;
  const totalPages = Math.max(1, productsQuery.data?.totalPages ?? 1);
  const hasNext =
    productsQuery.data?.hasNext ?? page + 1 < totalPages;
  const hasPrev = page > 0;
  const loading =
    categoriesQuery.isLoading ||
    (resolvedMenuId > 0 && productsQuery.isLoading);

  const categoryOptions = flattenMenuCategories(categories);
  const filterCategorySelectOptions = [
    { value: "all", label: "Tümü" },
    ...categoryOptions.map((option) => ({
      value: String(option.id),
      label: option.label,
    })),
  ];

  useEffect(() => {
    if (productsQuery.isError) {
      notify(
        "danger",
        productsQuery.error instanceof Error
          ? productsQuery.error.message
          : "Menü ürünleri yüklenemedi.",
      );
    }
  }, [notify, productsQuery.error, productsQuery.isError]);

  const refreshProducts = () => invalidateMenuProducts(queryClient, resolvedMenuId, qrId ?? undefined);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenuProductRequest(deleteTarget.productId);
      notify("info", "Ürün silindi.");
      setDeleteTarget(null);
      await refreshProducts();
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Ürün silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="grid w-full gap-3 sm:flex sm:min-w-0 sm:flex-1 sm:flex-wrap sm:items-end sm:gap-2">
          <div className="flex w-full flex-col gap-1.5 sm:min-w-[180px] sm:max-w-xs sm:flex-1 sm:flex-row sm:items-center sm:gap-2">
            <Label className="shrink-0 text-xs text-muted-foreground sm:whitespace-nowrap">
              Ürün ara
            </Label>
            <Input
              className="h-9 w-full"
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              placeholder="Ürün adına göre ara..."
            />
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:min-w-[220px] sm:max-w-sm sm:flex-1 sm:flex-row sm:items-center sm:gap-2">
            <Label className="shrink-0 text-xs text-muted-foreground sm:whitespace-nowrap">
              Kategori filtresi
            </Label>
            <SearchableSelect
              className="h-9 w-full"
              value={filterCategoryId === "all" ? "all" : String(filterCategoryId)}
              onValueChange={(next) => {
                setFilterCategoryId(next === "all" ? "all" : Number(next));
              }}
              options={filterCategorySelectOptions}
              placeholder="Kategori seçin"
              searchPlaceholder="Kategori ara..."
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <AddButton
            className="w-full sm:w-auto"
            onClick={() => {
              const categoryId = filterCategoryId === "all" ? null : filterCategoryId;
              router.push(
                qrId != null
                  ? DASHBOARD_ROUTES.digitalMenuProductCreateFor(qrId, categoryId)
                  : DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(resolvedMenuId, categoryId),
              );
            }}
          >
            Ürün ekle
          </AddButton>
          {resolvedMenuId > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setExistingOpen(true)}
            >
              Var olan ürün ekle
            </Button>
          ) : null}
          {qrId != null ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full shrink-0 gap-1.5 sm:w-auto"
              onClick={() => router.push(DASHBOARD_ROUTES.digitalMenuAiImportFor(qrId))}
            >
              AI ile ekle
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu filtrede ürün yok.</p>
      ) : (
        <div className="-mx-4 border-y border-border sm:-mx-5">
          <ProductListHead showPlacement={false} />
          <ul className="divide-y divide-border">
            {products.map((product) => {
              const categoryLabel =
                [product.mainCategoryName, product.subCategoryName].filter(Boolean).join(" / ") ||
                product.subCategorySlug;
              const servingLabel =
                product.servesPeopleMin != null && product.servesPeopleMax != null
                  ? product.servesPeopleMin === product.servesPeopleMax
                    ? `${product.servesPeopleMin} kişilik`
                    : `${product.servesPeopleMin}–${product.servesPeopleMax} kişilik`
                  : null;
              return (
                <ProductRow
                  key={product.productId}
                  name={product.name}
                  imageUrl={product.imageUrl}
                  href={
                    qrId != null
                      ? DASHBOARD_ROUTES.digitalMenuProductDetail(product.productId, qrId)
                      : DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(product.productId, resolvedMenuId)
                  }
                  category={[categoryLabel, servingLabel].filter(Boolean).join(" · ") || null}
                  price={formatProductPrice(product.price, product.currency)}
                  available={product.available !== false}
                  onDelete={() => setDeleteTarget({ productId: product.productId, name: product.name })}
                />
              );
            })}
          </ul>
        </div>
      )}

      {!loading && totalElements > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Toplam {totalElements} ürün · Sayfa {page + 1} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!hasPrev || productsQuery.isFetching}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Önceki
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!hasNext || productsQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Sonraki
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürün silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.name ?? "Bu ürün"}</span> menüden
              kaldırılacak. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {resolvedMenuId > 0 ? (
        <AddExistingProductDialog
          open={existingOpen}
          onOpenChange={setExistingOpen}
          menuId={resolvedMenuId}
          qrId={qrId}
        />
      ) : null}
    </div>
  );
}
