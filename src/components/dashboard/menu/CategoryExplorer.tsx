"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  FolderTree,
  ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { ExplorerListLoading, type ExplorerParts } from "@/components/dashboard/menu/ExplorerLayout";
import { AddButton, AddLink } from "@/components/dashboard/AddButton";
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
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import { invalidateMenuCategories, useMenuCategories } from "@/hooks/use-menu-categories";
import { invalidateMenuProducts, useMenuProducts } from "@/hooks/use-menu-products";
import {
  createMenuCategoryRequest,
  createMenuSubCategoryRequest,
  deleteMenuCategoryRequest,
  deleteMenuProductRequest,
  deleteMenuSubCategoryRequest,
  getMyMenusRequest,
  updateMenuCategoryRequest,
  updateMenuSubCategoryRequest,
  type MainCategoryApiItem,
  type MenuProductApiItem,
  type SubCategoryApiItem,
} from "@/lib/api";
import { menuDisplayName } from "@/lib/category-overview";
import {
  menusForBranch,
  parseExplorerBranch,
  pickExplorerMenu,
  productCountBySubCategory,
  productsForMainCategory,
  productsForSubCategory,
  serializeExplorerBranch,
  sortExplorerCategories,
  type ExplorerBranch,
} from "@/lib/category-explorer";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { formatProductPrice } from "@/lib/product-list";
import { cn } from "@/lib/utils";

export const LIBRARY_CATEGORIES_HREF = `${DASHBOARD_ROUTES.digitalMenuCategories}?kutuphane=1`;

/** The drag-and-drop editor of one menu's categories (ordering, covers). */
export function categoryOrderEditorHref(qrId: number): string {
  return `${DASHBOARD_ROUTES.digitalMenuCategories}?qr=${qrId}&duzenle=1`;
}

const NO_BRANCH = "none";

const QUIET_BUTTON =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const DANGER_ICON_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

type NameDialog =
  | { kind: "create-main" }
  | { kind: "rename-main"; main: MainCategoryApiItem }
  | { kind: "create-sub"; main: MainCategoryApiItem }
  | { kind: "rename-sub"; sub: SubCategoryApiItem }
  | null;

type DeleteTarget =
  | { kind: "main"; id: number; name: string }
  | { kind: "sub"; id: number; name: string }
  | { kind: "product"; id: number; name: string }
  | null;

const NAME_DIALOG_TITLE: Record<Exclude<NameDialog, null>["kind"], string> = {
  "create-main": "Kategori ekle",
  "rename-main": "Kategoriyi yeniden adlandır",
  "create-sub": "Alt kategori ekle",
  "rename-sub": "Alt kategoriyi yeniden adlandır",
};

function CoverThumb({ imageUrl, className }: { imageUrl?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted", className)}>
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- cover images come from arbitrary hosts
        <img src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <Layers className="size-3.5 text-muted-foreground/60" aria-hidden />
      )}
    </span>
  );
}

/**
 * Categories as a two-pane explorer: a second sidebar with the branch and menu pickers and the menu's
 * categories (each folds open to its sub categories), and on the right the products of the chosen
 * category (all of its sub categories) or sub category.
 */
export function useCategoryExplorer(): ExplorerParts {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();

  const readNumber = (key: string) => {
    const value = Number(searchParams.get(key));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  };

  // The address is the selection: a reload or a shared link reopens the same menu and category, and the
  // browser's back button steps back one level (sub category → category → list) instead of leaving the page.
  const selection = {
    branch: parseExplorerBranch(searchParams.get("sube")),
    menuId: readNumber("menu"),
    qrId: readNumber("qr"),
    mainId: readNumber("kategori"),
    subId: readNumber("alt"),
  };
  const { branch, menuId: requestedMenuId, qrId: requestedQrId, mainId: selectedMainId, subId: selectedSubId } = selection;

  const urlFor = (patch: Partial<typeof selection>) => {
    const next = { ...selection, ...patch };
    const params = new URLSearchParams(searchParams.toString());
    const write = (key: string, value: string | null) => (value == null ? params.delete(key) : params.set(key, value));
    write("sube", serializeExplorerBranch(next.branch));
    write("menu", next.menuId != null ? String(next.menuId) : null);
    write("qr", next.qrId != null ? String(next.qrId) : null);
    write("kategori", next.mainId != null ? String(next.mainId) : null);
    write("alt", next.subId != null ? String(next.subId) : null);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  // Which address each pushed one was opened from, so the in-page "up" arrow can simply go back when that is
  // where it leads (keeping the history clean), and only replaces the address otherwise (e.g. a shared link).
  const openedFrom = useRef(new Map<string, string>());
  /** Category picks are pushed (so "back" undoes them); branch and menu switches replace. */
  const select = (patch: Partial<typeof selection>, mode: "push" | "replace" = "push") => {
    const url = urlFor(patch);
    const current = `${pathname}${window.location.search}`;
    if (url === current) return;
    if (mode === "push") {
      openedFrom.current.set(url, current);
      window.history.pushState(null, "", url);
    } else {
      window.history.replaceState(null, "", url);
    }
  };
  const goUp = (patch: Partial<typeof selection>) => {
    const target = urlFor(patch);
    if (openedFrom.current.get(`${pathname}${window.location.search}`) === target) window.history.back();
    else select(patch, "replace");
  };

  const menusQuery = useQuery({ queryKey: ["myMenus"], queryFn: getMyMenusRequest });
  const branchesQuery = useBranches();
  const allMenus = useMemo(() => menusQuery.data ?? [], [menusQuery.data]);
  const branches = useMemo(
    () => [...(branchesQuery.data?.content ?? [])].sort((a, b) => a.name.localeCompare(b.name, "tr-TR")),
    [branchesQuery.data],
  );
  // There is no "all branches" view: until a branch is picked ("all" = nothing picked yet), no menu is shown.
  // It is picked automatically when the address names a menu (?menu= / ?qr=) or there is only one branch.
  const linkedMenu =
    branch === "all" && (requestedMenuId != null || requestedQrId != null)
      ? allMenus.find((item) => item.menuId === requestedMenuId) ??
        allMenus.find((item) => item.qrId === requestedQrId)
      : undefined;
  const activeBranch: ExplorerBranch =
    branch !== "all"
      ? branch
      : linkedMenu
        ? (linkedMenu.branchId ?? "none")
        : branches.length === 1
          ? branches[0].id
          : "all";
  const branchMenus = useMemo(
    () => (activeBranch === "all" ? [] : menusForBranch(allMenus, activeBranch)),
    [allMenus, activeBranch],
  );
  const menu = pickExplorerMenu(branchMenus, { menuId: requestedMenuId, qrId: requestedQrId });
  const menuId = menu?.menuId ?? null;

  const categoriesQuery = useMenuCategories(menuId);
  const productsQuery = useMenuProducts(menuId);
  const categories = useMemo(() => sortExplorerCategories(categoriesQuery.data ?? []), [categoriesQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const countsBySub = useMemo(() => productCountBySubCategory(products), [products]);
  const subNameById = useMemo(
    () => new Map(categories.flatMap((category) => category.subs.map((sub) => [sub.id, sub.name] as const))),
    [categories],
  );

  const selectedMain = categories.find((category) => category.id === selectedMainId) ?? null;
  const selectedSub = selectedMain?.subs.find((sub) => sub.id === selectedSubId) ?? null;

  // Accordion: at most one category is folded open in the sidebar, starting with the selected one.
  const [openId, setOpenId] = useState<number | null>(selectedMainId);
  const isOpen = (id: number) => id === openId;

  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [nameValue, setNameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [busy, setBusy] = useState(false);

  const selectMain = (category: MainCategoryApiItem) => {
    setOpenId(category.id);
    select({ mainId: category.id, subId: null });
  };
  const selectSub = (sub: SubCategoryApiItem) => {
    setOpenId(sub.mainCategoryId);
    select({ mainId: sub.mainCategoryId, subId: sub.id });
  };
  /** One level up: sub category → its category → the list (phones). */
  const goToList = () => goUp({ mainId: null, subId: null });
  const goToMain = () => goUp({ subId: null });

  const changeBranch = (value: string) => {
    const next: ExplorerBranch = value === NO_BRANCH ? "none" : Number(value);
    const first = menusForBranch(allMenus, next)[0];
    select({ branch: next, menuId: first?.menuId ?? null, qrId: null, mainId: null, subId: null }, "replace");
  };
  const changeMenu = (value: string) =>
    select({ menuId: Number(value), qrId: null, mainId: null, subId: null }, "replace");

  const refresh = async () => {
    await Promise.all([
      invalidateMenuCategories(queryClient, menuId, menu?.qrId ?? null),
      invalidateMenuProducts(queryClient, menuId),
    ]);
  };

  const openNameDialog = (dialog: Exclude<NameDialog, null>) => {
    setNameDialog(dialog);
    setNameValue(dialog.kind === "rename-main" ? dialog.main.name : dialog.kind === "rename-sub" ? dialog.sub.name : "");
  };

  const saveName = async () => {
    if (!nameDialog || menuId == null) return;
    const name = nameValue.trim();
    if (!name) {
      notify("warning", "Ad zorunlu.");
      return;
    }
    setBusy(true);
    try {
      if (nameDialog.kind === "create-main") {
        const created = await createMenuCategoryRequest(menuId, { name, sortOrder: categories.length });
        notify("info", "Kategori eklendi.");
        if (created && typeof created === "object" && "id" in created) {
          select({ mainId: (created as { id: number }).id, subId: null });
        }
      } else if (nameDialog.kind === "rename-main") {
        await updateMenuCategoryRequest(menuId, nameDialog.main.id, { name });
        notify("info", "Kategori güncellendi.");
      } else if (nameDialog.kind === "create-sub") {
        await createMenuSubCategoryRequest(menuId, nameDialog.main.id, { name, sortOrder: nameDialog.main.subs.length });
        setOpenId(nameDialog.main.id);
        notify("info", "Alt kategori eklendi.");
      } else {
        await updateMenuSubCategoryRequest(menuId, nameDialog.sub.id, { name });
        notify("info", "Alt kategori güncellendi.");
      }
      setNameDialog(null);
      await refresh();
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || menuId == null) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === "main") {
        await deleteMenuCategoryRequest(menuId, deleteTarget.id);
        if (deleteTarget.id === selectedMainId) select({ mainId: null, subId: null }, "replace");
        notify("info", "Kategori silindi.");
      } else if (deleteTarget.kind === "sub") {
        await deleteMenuSubCategoryRequest(menuId, deleteTarget.id);
        if (deleteTarget.id === selectedSubId) select({ subId: null }, "replace");
        notify("info", "Alt kategori silindi.");
      } else {
        await deleteMenuProductRequest(deleteTarget.id);
        notify("info", "Ürün silindi.");
      }
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Silinemedi.");
    } finally {
      setBusy(false);
    }
  };

  const loadingMenus = menusQuery.isPending || branchesQuery.isPending;
  const hasSelection = selectedMain != null;

  /* ───────────────────────── Sidebar ───────────────────────── */

  const sidebar = (
    <>
      <div className="space-y-2 border-b border-border px-3 pb-3">
        <Select
          value={activeBranch === "all" ? "" : activeBranch === "none" ? NO_BRANCH : String(activeBranch)}
          onValueChange={changeBranch}
          disabled={loadingMenus}
        >
          <SelectTrigger className="h-10 gap-2 rounded-xl text-sm" aria-label="Şube">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-left">
              <SelectValue placeholder="Şube seçiniz" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {branches.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
            {allMenus.some((item) => item.branchId == null) ? (
              <>
                <SelectSeparator />
                <SelectItem value={NO_BRANCH}>Şubesiz menüler</SelectItem>
              </>
            ) : null}
          </SelectContent>
        </Select>
        <Select value={menuId != null ? String(menuId) : undefined} onValueChange={changeMenu} disabled={branchMenus.length === 0}>
          <SelectTrigger className="h-10 gap-2 rounded-xl text-sm" aria-label="Menü">
            <FolderTree className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-left">
              <SelectValue placeholder={activeBranch === "all" ? "Önce şube seçin" : branchMenus.length === 0 ? "Bu şubede menü yok" : "Menü seçin"} />
            </span>
          </SelectTrigger>
          <SelectContent>
            {branchMenus.map((item) => (
              <SelectItem key={item.menuId} value={String(item.menuId)}>
                {menuDisplayName(item)}
                {item.active ? "" : " (pasif)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          {menu ? `Kategoriler${categoriesQuery.data ? ` · ${categories.length}` : ""}` : "\u00a0"}
        </p>
        {menu ? (
          <AddButton className="h-8 px-2 text-xs" disabled={busy} onClick={() => openNameDialog({ kind: "create-main" })}>
            Kategori ekle
          </AddButton>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
        {loadingMenus || (menuId != null && categoriesQuery.isPending) ? (
          <ExplorerListLoading label="Kategoriler yükleniyor…" />
        ) : !menu ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {allMenus.length === 0
              ? "Henüz menünüz yok."
              : activeBranch === "all"
                ? "Ürünleri görmek için yukarıdan bir şube seçin."
                : "Bu şubenin henüz menüsü yok."}
          </p>
        ) : categoriesQuery.isError ? (
          <p className="px-2 py-6 text-center text-sm text-destructive">Kategoriler alınamadı.</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Bu menüde kategori yok.</p>
            <AddButton disabled={busy} onClick={() => openNameDialog({ kind: "create-main" })}>
              İlk kategoriyi ekle
            </AddButton>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {categories.map((category) => {
              const open = isOpen(category.id);
              const selected = category.id === selectedMainId && !selectedSub;
              const hasSubs = category.subs.length > 0;
              return (
                <li key={category.id}>
                  <div
                    className={cn(
                      "flex items-center rounded-xl transition-colors",
                      selected
                        ? "bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {/* The chevron only folds the sub categories; the rest of the row opens the category. */}
                    {hasSubs ? (
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : category.id)}
                        aria-expanded={open}
                        aria-label={`${category.name} alt kategorilerini ${open ? "gizle" : "göster"}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight
                          className={cn("size-4 transition-transform duration-200", open && "rotate-90")}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span className="size-9 shrink-0" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => selectMain(category)}
                      aria-current={selected ? "true" : undefined}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1.5 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CoverThumb key={category.imageUrl ?? "none"} imageUrl={category.imageUrl} className="size-7" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {productsForMainCategory(products, category).length}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openNameDialog({ kind: "create-sub", main: category })}
                      aria-label={`${category.name} altına alt kategori ekle`}
                      title="Alt kategori ekle"
                      className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#FFF0F3] hover:text-[#F03245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 dark:hover:bg-[#F03245]/15 dark:hover:text-[#FB7185]"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                  {hasSubs ? (
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                      inert={!open}
                    >
                      <ul className="ml-[1.125rem] min-h-0 overflow-hidden border-l border-border pl-2">
                        {category.subs.map((sub) => {
                          const subSelected = sub.id === selectedSubId && category.id === selectedMainId;
                          return (
                            <li key={sub.id}>
                              <button
                                type="button"
                                onClick={() => selectSub(sub)}
                                aria-current={subSelected ? "true" : undefined}
                                className={cn(
                                  "my-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  subSelected
                                    ? "bg-[#FFF0F3] font-medium text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]"
                                    : "text-foreground/80 hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                  {countsBySub.get(sub.id) ?? 0}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-border p-2">
        {menu ? (
          <Link href={categoryOrderEditorHref(menu.qrId)} className={cn(QUIET_BUTTON, "justify-start")}>
            <ArrowUpDown className="size-3.5" />
            Sırala ve kapak görselleri
          </Link>
        ) : null}
        <Link href={LIBRARY_CATEGORIES_HREF} className={cn(QUIET_BUTTON, "justify-start")}>
          <Layers className="size-3.5" />
          Menüsüz kategoriler
        </Link>
      </div>
    </>
  );

  /* ───────────────────────── Detail ───────────────────────── */

  const productList = (items: MenuProductApiItem[], emptyText: string, createHref: string) =>
    productsQuery.isPending ? (
      <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Ürünler yükleniyor…
      </div>
    ) : items.length === 0 ? (
      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <ImageIcon className="size-5 text-muted-foreground/60" aria-hidden />
        <p className="text-sm font-medium text-foreground">{emptyText}</p>
        <AddLink href={createHref}>Ürün ekle</AddLink>
      </div>
    ) : (
      <>
        <ProductListHead showPlacement={false} />
        {productRows(items)}
      </>
    );

  const productRows = (items: MenuProductApiItem[]) => (
    <ul className="divide-y divide-border border-b border-border">
      {items.map((product) => (
        <ProductRow
          key={product.productId}
          name={product.name}
          imageUrl={product.imageUrl}
          href={DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(product.productId, menuId ?? 0)}
          category={subNameById.get(product.subCategoryId) ?? product.subCategoryName ?? null}
          price={formatProductPrice(product.price, product.currency)}
          available={product.available !== false}
          onDelete={() => setDeleteTarget({ kind: "product", id: product.productId, name: product.name })}
        />
      ))}
    </ul>
  );

  const detailHeader = (props: {
    level: "main" | "sub";
    title: string;
    subtitle: string;
    imageUrl?: string | null;
    actions: React.ReactNode;
  }) => (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-3 sm:p-4">
      <button
        type="button"
        onClick={props.level === "sub" ? goToMain : goToList}
        className={cn(QUIET_BUTTON, "w-9 px-0", props.level === "main" && "lg:hidden")}
        aria-label={props.level === "sub" ? `${selectedMain?.name ?? "Kategori"} kategorisine dön` : "Kategorilere dön"}
      >
        <ArrowLeft className="size-4" />
      </button>
      <CoverThumb key={props.imageUrl ?? "none"} imageUrl={props.imageUrl} className="size-11 rounded-xl" />
      {/* At least ~11rem for the name, so on phones the actions drop to their own line instead of squeezing it. */}
      <div className="min-w-[11rem] flex-1">
        {/* Where this is in the tree: Kategoriler › Çorbalar (› the sub category in the title). */}
        <nav aria-label="Konum" className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <button type="button" onClick={goToList} className="shrink-0 hover:text-[#F03245]">
            Kategoriler
          </button>
          {props.level === "sub" && selectedMain ? (
            <>
              <ChevronRight className="size-3 shrink-0" aria-hidden />
              <button type="button" onClick={goToMain} className="min-w-0 truncate hover:text-[#F03245]">
                {selectedMain.name}
              </button>
            </>
          ) : null}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-semibold text-foreground">{props.title}</h2>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {props.level === "sub" ? "Alt kategori" : "Kategori"}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{props.subtitle}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-0.5">{props.actions}</div>
    </header>
  );

  /** A labelled block inside the category view, one per sub category, so it is clear where each product lives. */
  const sectionHeading = (props: { title: string; count: number; onOpen?: () => void }) => (
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 sm:px-4">
      <FolderTree className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {props.onOpen ? (
        <button
          type="button"
          onClick={props.onOpen}
          className="min-w-0 truncate text-sm font-semibold text-foreground hover:text-[#F03245]"
        >
          {props.title}
        </button>
      ) : (
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">{props.title}</span>
      )}
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{props.count} ürün</span>
      {props.onOpen ? (
        <button
          type="button"
          onClick={props.onOpen}
          className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Aç
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );

  let detail: React.ReactNode;
  if (!menu || !selectedMain) {
    // One short, plain hint for whatever is missing next: a branch, a menu, a category, or a pick.
    const hint =
      activeBranch === "all"
        ? {
            icon: <MapPin className="size-5" />,
            title: "Önce şube seçin",
            text: "Ürünleriniz şube ve menüye göre listelenir. Soldan bir şube seçtiğinizde ürünleri burada görürsünüz.",
          }
        : !menu
          ? {
              icon: <FolderTree className="size-5" />,
              title: "Bu şubenin menüsü yok",
              text: "Ürün ekleyebilmek için önce bu şubeye bir menü oluşturun.",
            }
          : categories.length === 0 && categoriesQuery.isSuccess
            ? {
                icon: <FolderTree className="size-5" />,
                title: "Henüz kategori yok",
                text: "Ürünler kategoriler içinde durur. Soldan ilk kategoriyi ekleyerek başlayın.",
              }
            : {
                icon: <FolderTree className="size-5" />,
                title: "Bir kategori seçin",
                text: "Ürünleriniz kategorilere göre gruplanır. Soldan bir kategori seçin, içindeki ürünler burada listelenir.",
              };
    detail = (
      <div className="hidden h-full flex-col items-center justify-center gap-3 px-6 py-20 text-center lg:flex">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15">
          {hint.icon}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{hint.title}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{hint.text}</p>
        </div>
      </div>
    );
  } else if (selectedSub) {
    const items = productsForSubCategory(products, selectedSub.id);
    detail = (
      <>
        {detailHeader({
          level: "sub",
          title: selectedSub.name,
          subtitle: `${items.length} ürün`,
          imageUrl: selectedMain.imageUrl,
          actions: (
            <>
              <AddLink href={DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(menu.menuId, selectedSub.id)}>Ürün ekle</AddLink>
              <button
                type="button"
                className={cn(QUIET_BUTTON, "w-9 px-0 sm:w-auto sm:px-2.5")}
                disabled={busy}
                onClick={() => openNameDialog({ kind: "rename-sub", sub: selectedSub })}
                aria-label="Alt kategoriyi yeniden adlandır"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Düzenle</span>
              </button>
              <button
                type="button"
                className={DANGER_ICON_BUTTON}
                disabled={busy}
                onClick={() => setDeleteTarget({ kind: "sub", id: selectedSub.id, name: selectedSub.name })}
                aria-label="Alt kategoriyi sil"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ),
        })}
        {productList(
          items,
          "Bu alt kategoride ürün yok",
          DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(menu.menuId, selectedSub.id),
        )}
      </>
    );
  } else {
    const subs = selectedMain.subs;
    const mainProducts = productsForMainCategory(products, selectedMain);
    const subIds = new Set(subs.map((sub) => sub.id));
    const looseProducts = mainProducts.filter((product) => !subIds.has(product.subCategoryId));
    const editActions = (
      <>
        <button
          type="button"
          className={cn(QUIET_BUTTON, "w-9 px-0 sm:w-auto sm:px-2.5")}
          disabled={busy}
          onClick={() => openNameDialog({ kind: "rename-main", main: selectedMain })}
          aria-label="Kategoriyi yeniden adlandır"
        >
          <Pencil className="size-3.5" />
          <span className="hidden sm:inline">Düzenle</span>
        </button>
        <button
          type="button"
          className={DANGER_ICON_BUTTON}
          disabled={busy}
          onClick={() => setDeleteTarget({ kind: "main", id: selectedMain.id, name: selectedMain.name })}
          aria-label="Kategoriyi sil"
        >
          <Trash2 className="size-4" />
        </button>
      </>
    );
    detail = (
      <>
        {detailHeader({
          level: "main",
          title: selectedMain.name,
          subtitle:
            subs.length > 0 ? `${subs.length} alt kategori · ${mainProducts.length} ürün` : `Alt kategori yok · ${mainProducts.length} ürün`,
          imageUrl: selectedMain.imageUrl,
          actions: (
            <>
              <AddLink href={DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(menu.menuId, subs[0]?.id ?? null)}>
                Ürün ekle
              </AddLink>
              {editActions}
            </>
          ),
        })}
        {subs.length === 0 || productsQuery.isPending || mainProducts.length === 0 ? (
          productList(
            mainProducts,
            "Bu kategoride ürün yok",
            DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(menu.menuId, subs[0]?.id ?? null),
          )
        ) : (
          <>
            <ProductListHead showPlacement={false} />
            {subs.map((sub) => {
              const items = mainProducts.filter((product) => product.subCategoryId === sub.id);
              return (
                <section key={sub.id} aria-label={sub.name}>
                  {sectionHeading({ title: sub.name, count: items.length, onOpen: () => selectSub(sub) })}
                  {items.length > 0 ? (
                    productRows(items)
                  ) : (
                    <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
                      Henüz ürün yok ·{" "}
                      <Link
                        href={DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(menu.menuId, sub.id)}
                        className="font-medium text-[#F03245] hover:underline"
                      >
                        Ürün ekle
                      </Link>
                    </p>
                  )}
                </section>
              );
            })}
            {looseProducts.length > 0 ? (
              <section aria-label="Alt kategorisiz">
                {sectionHeading({ title: "Alt kategorisiz", count: looseProducts.length })}
                {productRows(looseProducts)}
              </section>
            ) : null}
          </>
        )}
      </>
    );
  }

  const dialogs = (
    <>

      <Dialog open={nameDialog != null} onOpenChange={(open) => !open && !busy && setNameDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nameDialog ? NAME_DIALOG_TITLE[nameDialog.kind] : ""}</DialogTitle>
            <DialogDescription>
              {nameDialog?.kind === "create-sub" ? `"${nameDialog.main.name}" altına eklenir.` : "Görünen ad menüde ve ürün seçiminde kullanılır."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveName();
              }
            }}
            placeholder="Örn. Tatlılar"
            aria-label="Ad"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setNameDialog(null)}>
              Vazgeç
            </Button>
            <Button type="button" disabled={busy} onClick={() => void saveName()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && !busy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "product"
                ? "Ürün silinsin mi?"
                : deleteTarget?.kind === "sub"
                  ? "Alt kategori silinsin mi?"
                  : "Kategori silinsin mi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? deleteTarget.kind === "product"
                  ? `"${deleteTarget.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                  : `"${deleteTarget.name}" kalıcı olarak silinecek. Ürünü olan kategoriler silinemez.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { sidebar, detail, hasSelection, dialogs };
}
