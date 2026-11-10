import type { ActiveMenuSummaryApiItem, MainCategoryApiItem } from "@/lib/api";
import { inList, readList, writeList } from "@/lib/filter-params";
import { foldSearchText } from "@/lib/product-list";

export type CategoryFilters = {
  query: string;
  /** Menu ids; empty means every menu. */
  menus: string[];
};

export const EMPTY_CATEGORY_FILTERS: CategoryFilters = { query: "", menus: [] };

export type CategoryMenuGroup = {
  menuId: number;
  qrId: number | null;
  name: string;
  branchName: string | null;
  active: boolean;
  /** Categories after the search; `total` is the count before it. */
  categories: MainCategoryApiItem[];
  total: number;
  /** The categories of this menu could not be loaded. */
  failed: boolean;
};

export function parseCategoryFilters(params: URLSearchParams): CategoryFilters {
  return { query: params.get("ara") ?? "", menus: readList(params, "menu") };
}

export function serializeCategoryFilters(filters: CategoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("ara", filters.query.trim());
  writeList(params, "menu", filters.menus);
  return params;
}

export function isCategoryListNarrowed(filters: CategoryFilters): boolean {
  return filters.query.trim() !== "" || filters.menus.length > 0;
}

/** A category matches when its own name or one of its sub categories does. */
export function matchesCategoryQuery(category: MainCategoryApiItem, query: string): boolean {
  const needle = foldSearchText(query);
  if (!needle) return true;
  return [category.name, ...(category.subs ?? []).map((sub) => sub.name)].some((text) => foldSearchText(text).includes(needle));
}

export function menuDisplayName(menu: Pick<ActiveMenuSummaryApiItem, "menuId" | "businessName">): string {
  return menu.businessName?.trim() || `Menü #${menu.menuId}`;
}

/**
 * One group per menu, in menu order. A menu whose categories did not load is kept so the page can say so;
 * a menu with no match for the search is dropped, so the list only shows what the search found.
 */
export function groupCategoriesByMenu(
  menus: ActiveMenuSummaryApiItem[],
  categoriesByMenu: ReadonlyMap<number, MainCategoryApiItem[] | null>,
  branchNameById: ReadonlyMap<number, string>,
  filters: CategoryFilters,
): CategoryMenuGroup[] {
  const searching = filters.query.trim() !== "";
  return menus
    .filter((menu) => inList(filters.menus, String(menu.menuId)))
    .map((menu): CategoryMenuGroup => {
      const loaded = categoriesByMenu.get(menu.menuId);
      const all = loaded ?? [];
      return {
        menuId: menu.menuId,
        qrId: menu.qrId ?? null,
        name: menuDisplayName(menu),
        branchName: menu.branchId != null ? (branchNameById.get(menu.branchId) ?? null) : null,
        active: menu.active,
        categories: all.filter((category) => matchesCategoryQuery(category, filters.query)),
        total: all.length,
        failed: loaded === null,
      };
    })
    .filter((group) => group.failed || !searching || group.categories.length > 0);
}

/** Options for the menu select, with how many categories each menu holds. */
export function categoryMenuOptions(
  menus: ActiveMenuSummaryApiItem[],
  categoriesByMenu: ReadonlyMap<number, MainCategoryApiItem[] | null>,
): Array<{ value: string; label: string; count?: number }> {
  return menus.map((menu) => ({
    value: String(menu.menuId),
    label: menuDisplayName(menu),
    count: categoriesByMenu.get(menu.menuId)?.length,
  }));
}

/** How many categories a group shows before "Tümünü göster": two rows of the three-column grid. */
export const CATEGORY_PREVIEW_COUNT = 6;

/**
 * Rows a group shows. A group longer than the preview is cut, but never to hide a single row
 * behind a button: showing one more tile beats a button that reveals only that one.
 */
export function visibleCategories<T>(categories: readonly T[], showAll: boolean, limit = CATEGORY_PREVIEW_COUNT): readonly T[] {
  return showAll || categories.length <= limit + 1 ? categories : categories.slice(0, limit);
}

/** Show everything when the user is looking for something or focused on one menu. */
export function showsAllCategories(filters: CategoryFilters, expandedByUser: boolean): boolean {
  return expandedByUser || filters.query.trim() !== "" || filters.menus.length > 0;
}
