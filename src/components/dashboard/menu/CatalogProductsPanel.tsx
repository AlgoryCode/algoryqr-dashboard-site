"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Building2, CircleDot, ImageOff, Layers, Loader2, Plus } from "lucide-react";

import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { ListPagination } from "@/components/dashboard/ListPagination";
import { ListCard, ListMessage, ListSkeleton } from "@/components/dashboard/ListLayout";
import { ListToolbar } from "@/components/dashboard/ListToolbar";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { ProductListHead, ProductRow } from "@/components/dashboard/menu/ProductRow";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { useMenuCategories } from "@/hooks/use-menu-categories";
import { invalidateMenuProducts } from "@/hooks/use-menu-products";
import {
  assignProductToMenuRequest,
  deleteMenuProductRequest,
  getMyMenusRequest,
  listCatalogProductsRequest,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  EMPTY_PRODUCT_FILTERS,
  enrichProducts,
  filterProducts,
  formatProductPrice,
  isProductListNarrowed,
  parseProductFilters,
  PRODUCT_FLAGS,
  PRODUCT_PAGE_SIZE,
  productFilterOptions,
  productPlacement,
  productStatusCounts,
  serializeProductFilters,
  type ProductListFilters,
  type ProductListRow,
  type ProductStatus,
} from "@/lib/product-list";
import { PRODUCT_FLAG_TONE } from "@/lib/badge-tones";

const STATUS_LABELS: Record<ProductStatus, string> = {
  all: "Tümü",
  "no-photo": "Fotoğrafsız",
  unassigned: "Menüsüz",
  unavailable: "Satışta değil",
};

function productHref(row: ProductListRow) {
  return row.menuId != null
    ? DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(row.productId, row.menuId)
    : `${DASHBOARD_ROUTES.digitalMenuProducts}/${row.productId}`;
}

export function CatalogProductsPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();

  const productsQuery = useQuery({ queryKey: ["catalog-products"], queryFn: listCatalogProductsRequest });
  const menusQuery = useQuery({ queryKey: ["myMenus"], queryFn: getMyMenusRequest });
  const branchesQuery = useBranches();

  // Filters live in the address, so returning from a product lands on the same page of the same list.
  const filters = useMemo(() => parseProductFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [assignTarget, setAssignTarget] = useState<ProductListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const listTop = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => enrichProducts(productsQuery.data ?? [], menusQuery.data ?? [], branchesQuery.data?.content ?? []),
    [productsQuery.data, menusQuery.data, branchesQuery.data],
  );
  const options = useMemo(() => productFilterOptions(rows, filters), [rows, filters]);
  const statusCounts = useMemo(() => productStatusCounts(rows, filters), [rows, filters]);
  const filtered = useMemo(() => filterProducts(rows, filters), [rows, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCT_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const firstIndex = (page - 1) * PRODUCT_PAGE_SIZE;
  const visible = filtered.slice(firstIndex, firstIndex + PRODUCT_PAGE_SIZE);
  const narrowed = isProductListNarrowed(filters);

  // A narrower branch or menu choice drops the menus and categories it no longer contains.
  const withScope = (patch: Partial<ProductListFilters>): Partial<ProductListFilters> => {
    const next = { ...filters, ...patch };
    const nextOptions = productFilterOptions(rows, next);
    const menus = next.menus.filter((menu) => nextOptions.menus.some((option) => option.value === menu));
    const scoped = productFilterOptions(rows, { ...next, menus });
    const categories = next.categories.filter((category) => scoped.categories.some((option) => option.value === category));
    return { ...patch, menus, categories };
  };

  const update = (patch: Partial<ProductListFilters>) => {
    const current = parseProductFilters(new URLSearchParams(window.location.search));
    const query = serializeProductFilters({ ...current, page: 1, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearAll = () => update(EMPTY_PRODUCT_FILTERS);

  const goToPage = (next: number) => {
    update({ page: next });
    listTop.current?.scrollIntoView({ block: "start" });
  };

  const refresh = async (menuId?: number | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalog-products"] }),
      invalidateMenuProducts(queryClient, menuId),
    ]);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenuProductRequest(deleteTarget.productId);
      await refresh(deleteTarget.menuId);
      notify("info", "Ürün silindi.");
      setDeleteTarget(null);
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Ürün silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  const statusOptions = PRODUCT_FLAGS.filter((flag) => filters.statuses.includes(flag) || statusCounts[flag] > 0).map(
    (flag) => ({
      value: flag,
      label: STATUS_LABELS[flag],
      count: statusCounts[flag],
      tone: PRODUCT_FLAG_TONE[flag],
    }),
  );

  return (
    <ListCard label="Ürün listesi">
      <ListToolbar
        query={filters.query}
        onQueryChange={(query) => update({ query })}
        searchPlaceholder="Ürün veya kategori ara"
        searchLabel="Ürün ara"
        narrowed={narrowed}
        onClear={clearAll}
        filters={
          <>
            <FilterMenu
              label="Şube"
              icon={Building2}
              tone="teal"
              multiple
              values={filters.branches}
              options={options.branches}
              onValuesChange={(branches) => update(withScope({ branches }))}
            />
            <FilterMenu
              label="Menü"
              icon={BookOpen}
              tone="orange"
              multiple
              values={filters.menus}
              options={options.menus}
              onValuesChange={(menus) => update(withScope({ menus }))}
            />
            <FilterMenu
              label="Kategori"
              icon={Layers}
              tone="violet"
              multiple
              values={filters.categories}
              options={options.categories}
              onValuesChange={(categories) => update({ categories })}
            />
            <FilterMenu
              label="Durum"
              icon={CircleDot}
              multiple
              values={filters.statuses}
              options={statusOptions}
              onValuesChange={(statuses) => update({ statuses })}
            />
          </>
        }
      />

      <div ref={listTop} className="scroll-mt-20" />
      {productsQuery.isLoading ? (
        <ListSkeleton rows={8} />
      ) : productsQuery.isError ? (
        <ListMessage
          title="Ürünler yüklenemedi"
          action={{ label: "Tekrar dene", onClick: () => void productsQuery.refetch() }}
        />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm font-medium">Henüz ürün yok</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            İlk ürününüzü oluşturun, sonra istediğiniz menüye atayın.
          </p>
          <Button size="sm" className="gap-1.5" asChild>
            <Link href={DASHBOARD_ROUTES.digitalMenuProductCreate}>
              <Plus className="size-3.5" />
              Ürün oluştur
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <ListMessage
          icon={ImageOff}
          title="Bu filtrelerle ürün bulunamadı"
          action={{ label: "Filtreleri temizle", onClick: clearAll }}
        />
      ) : (
        <>
          <ProductListHead showPlacement />
          <ul className="divide-y divide-border">
            {visible.map((row) => (
              <ProductRow
                key={row.productId}
                name={row.name}
                imageUrl={row.imageUrl}
                href={productHref(row)}
                category={row.mainCategoryName ?? row.subCategoryName}
                placement={productPlacement(row)}
                price={formatProductPrice(row.price, row.currency)}
                available={row.available !== false}
                onAssign={() => setAssignTarget(row)}
                onDelete={() => setDeleteTarget(row)}
              />
            ))}
          </ul>
          <ListPagination
            page={page}
            pageSize={PRODUCT_PAGE_SIZE}
            total={filtered.length}
            unit="ürün"
            onPage={goToPage}
          />
        </>
      )}

      {assignTarget ? (
        <AssignProductDialog
          row={assignTarget}
          menus={menusQuery.data ?? []}
          onClose={() => setAssignTarget(null)}
          onAssigned={async (menuId) => {
            await refresh(menuId);
            notify("info", "Ürün menüye atandı.");
            setAssignTarget(null);
          }}
          onError={(message) => notify("danger", message)}
        />
      ) : null}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürün silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.name}</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListCard>
  );
}

function AssignProductDialog({
  row,
  menus,
  onClose,
  onAssigned,
  onError,
}: {
  row: ProductListRow;
  menus: { menuId: number; businessName?: string | null }[];
  onClose: () => void;
  onAssigned: (menuId: number) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [menuId, setMenuId] = useState<number | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const categoriesQuery = useMenuCategories(menuId);
  const subs = (categoriesQuery.data ?? []).flatMap((category) =>
    (category.subs ?? []).map((sub) => ({ value: String(sub.id), label: `${category.name} / ${sub.name}` })),
  );

  const submit = async () => {
    if (menuId == null || subCategoryId == null) return;
    setSaving(true);
    try {
      await assignProductToMenuRequest(menuId, row.productId, subCategoryId);
      await onAssigned(menuId);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Ürün atanamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Menüye ata</DialogTitle>
          <DialogDescription>{row.name} için menü ve kategori seçin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2.5">
          <SearchableSelect
            className="h-9 w-full"
            value={menuId == null ? "" : String(menuId)}
            onValueChange={(value) => {
              setMenuId(value ? Number(value) : null);
              setSubCategoryId(null);
            }}
            options={menus.map((menu) => ({
              value: String(menu.menuId),
              label: menu.businessName?.trim() || `Menü #${menu.menuId}`,
            }))}
            placeholder="Menü seçin"
            searchPlaceholder="Menü ara..."
            emptyText="Menü yok."
          />
          <SearchableSelect
            className="h-9 w-full"
            value={subCategoryId == null ? "" : String(subCategoryId)}
            onValueChange={(value) => setSubCategoryId(value ? Number(value) : null)}
            options={subs}
            placeholder="Kategori seçin"
            searchPlaceholder="Kategori ara..."
            emptyText={menuId == null ? "Önce menü seçin." : "Bu menüde kategori yok."}
            disabled={menuId == null}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="button" disabled={saving || menuId == null || subCategoryId == null} onClick={() => void submit()}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Ata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
