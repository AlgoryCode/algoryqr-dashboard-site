import type { ActiveMenuSummaryApiItem, MainCategoryApiItem, MenuProductApiItem } from "@/lib/api";

/** Branch filter of the category explorer: every branch, menus without a branch, or one branch. */
export type ExplorerBranch = "all" | "none" | number;

export function parseExplorerBranch(raw: string | null): ExplorerBranch {
  if (raw === "none") return "none";
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : "all";
}

export function serializeExplorerBranch(branch: ExplorerBranch): string | null {
  return branch === "all" ? null : String(branch);
}

export function menusForBranch(
  menus: readonly ActiveMenuSummaryApiItem[],
  branch: ExplorerBranch,
): ActiveMenuSummaryApiItem[] {
  if (branch === "all") return [...menus];
  if (branch === "none") return menus.filter((menu) => menu.branchId == null);
  return menus.filter((menu) => menu.branchId === branch);
}

/**
 * The menu to show: the one named in the address (by menu id, or by QR id from older links),
 * when it is in the branch's list; otherwise the branch's first menu.
 */
export function pickExplorerMenu(
  menus: readonly ActiveMenuSummaryApiItem[],
  requested: { menuId: number | null; qrId: number | null },
): ActiveMenuSummaryApiItem | null {
  const byMenu = requested.menuId != null ? menus.find((menu) => menu.menuId === requested.menuId) : undefined;
  if (byMenu) return byMenu;
  const byQr = requested.qrId != null ? menus.find((menu) => menu.qrId === requested.qrId) : undefined;
  return byQr ?? menus[0] ?? null;
}

function bySortOrder<T extends { sortOrder?: number; id?: number; productId?: number }>(a: T, b: T): number {
  const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  return order !== 0 ? order : (a.id ?? a.productId ?? 0) - (b.id ?? b.productId ?? 0);
}

/** Categories and their sub categories in the order the menu shows them. */
export function sortExplorerCategories(categories: readonly MainCategoryApiItem[]): MainCategoryApiItem[] {
  return [...categories]
    .map((category) => ({ ...category, subs: [...(category.subs ?? [])].sort(bySortOrder) }))
    .sort(bySortOrder);
}

export function productsForSubCategory(
  products: readonly MenuProductApiItem[],
  subCategoryId: number,
): MenuProductApiItem[] {
  return products.filter((product) => product.subCategoryId === subCategoryId).sort(bySortOrder);
}

/** Every product filed under a main category, directly or through one of its sub categories. */
export function productsForMainCategory(
  products: readonly MenuProductApiItem[],
  category: Pick<MainCategoryApiItem, "id" | "subs">,
): MenuProductApiItem[] {
  const subIds = new Set((category.subs ?? []).map((sub) => sub.id));
  return products
    .filter((product) => product.mainCategoryId === category.id || subIds.has(product.subCategoryId))
    .sort(bySortOrder);
}

export function productCountBySubCategory(products: readonly MenuProductApiItem[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const product of products) {
    counts.set(product.subCategoryId, (counts.get(product.subCategoryId) ?? 0) + 1);
  }
  return counts;
}
