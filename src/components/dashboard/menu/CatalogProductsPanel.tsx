"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { ListPagination } from "@/components/dashboard/ListPagination";
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
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
  activeProductFilterCount,
  EMPTY_PRODUCT_FILTERS,
  enrichProducts,
  filterProducts,
  formatProductPrice,
  parseProductFilters,
  PRODUCT_PAGE_SIZE,
  productFilterOptions,
  productPlacement,
  productStatusCounts,
  serializeProductFilters,
  type ProductListFilters,
  type ProductListRow,
  type ProductStatus,
} from "@/lib/product-list";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 250;

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
  const [search, setSearch] = useState(filters.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<ProductListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const listTop = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    },
    [],
  );

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
  const activeCount = activeProductFilterCount(filters);
  const narrowed = activeCount > 0 || filters.status !== "all" || filters.query.trim() !== "";

  const update = (patch: Partial<ProductListFilters>) => {
    const current = parseProductFilters(new URLSearchParams(window.location.search));
    const query = serializeProductFilters({ ...current, page: 1, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => update({ query: value }), SEARCH_DEBOUNCE_MS);
  };

  const clearAll = () => {
    if (searchTimer.current != null) window.clearTimeout(searchTimer.current);
    setSearch("");
    update(EMPTY_PRODUCT_FILTERS);
  };

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

  const filterFields = (
    <>
      <SearchableSelect
        className="h-9 w-full"
        value={filters.branch}
        onValueChange={(value) => update({ branch: value || "all", menu: "all", category: "all" })}
        options={options.branches}
        placeholder="Tüm şubeler"
        searchPlaceholder="Şube ara..."
      />
      <SearchableSelect
        className="h-9 w-full"
        value={filters.menu}
        onValueChange={(value) => update({ menu: value || "all", category: "all" })}
        options={options.menus}
        placeholder="Tüm menüler"
        searchPlaceholder="Menü ara..."
      />
      <SearchableSelect
        className="h-9 w-full"
        value={filters.category}
        onValueChange={(value) => update({ category: value || "all" })}
        options={options.categories}
        placeholder="Tüm kategoriler"
        searchPlaceholder="Kategori ara..."
      />
    </>
  );

  const statusChips = (["all", "no-photo", "unassigned", "unavailable"] as const).filter(
    (status) => status === "all" || status === filters.status || statusCounts[status] > 0,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-2.5 border-b border-border p-3 lg:p-4">
        <div className="flex gap-2 md:grid md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              className="h-9 w-full pl-9"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Ürün veya kategori ara"
              aria-label="Ürün ara"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 gap-1.5 md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-3.5" />
            Filtre
            {activeCount > 0 ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>
          <div className="hidden md:contents">{filterFields}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="-mx-3 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] lg:mx-0 lg:px-0">
            {statusChips.map((status) => {
              const selected = filters.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ status })}
                  className={cn(
                    "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {STATUS_LABELS[status]}
                  <span className={cn("tabular-nums", selected ? "opacity-70" : "opacity-60")}>{statusCounts[status]}</span>
                </button>
              );
            })}
          </div>
          {narrowed ? (
            <button
              type="button"
              onClick={clearAll}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
              Temizle
            </button>
          ) : null}
        </div>
      </div>

      <div ref={listTop} className="scroll-mt-20" />
      {productsQuery.isLoading ? (
        <ul aria-label="Ürünler yükleniyor" className="divide-y divide-border">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className="flex items-center gap-3 px-3 py-2.5 lg:px-4">
              <Skeleton className="size-14 rounded-[10px] lg:size-11" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </li>
          ))}
        </ul>
      ) : productsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">Ürünler yüklenemedi.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void productsQuery.refetch()}>
            Tekrar dene
          </Button>
        </div>
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
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <ImageOff className="size-5 text-muted-foreground/60" aria-hidden />
          <p className="text-sm text-muted-foreground">Bu filtrelerle ürün bulunamadı.</p>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            Filtreleri temizle
          </Button>
        </div>
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

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4">
          <SheetHeader className="p-0 text-left">
            <SheetTitle>Filtrele</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2.5">{filterFields}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={clearAll} disabled={!narrowed}>
              Temizle
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              {filtered.length} ürünü göster
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
    </section>
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
