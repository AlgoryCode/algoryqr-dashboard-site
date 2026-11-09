import type { ActiveMenuSummaryApiItem, MenuProductApiItem } from "@/lib/api";

export const PRODUCT_PAGE_SIZE = 25;

export const PRODUCT_STATUSES = ["all", "no-photo", "unassigned", "unavailable"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type ProductListFilters = {
  query: string;
  branch: string;
  menu: string;
  category: string;
  status: ProductStatus;
  page: number;
};

export const EMPTY_PRODUCT_FILTERS: ProductListFilters = {
  query: "",
  branch: "all",
  menu: "all",
  category: "all",
  status: "all",
  page: 1,
};

/** "none" stands for products whose menu is not tied to any branch. */
export const NO_BRANCH = "none";

export type ProductListRow = MenuProductApiItem & {
  menuName: string | null;
  branchKey: string;
  branchName: string | null;
};

export type ProductFilterOption = { value: string; label: string };

/** Lets "kofte" find "Köfte" and "ipek" find "İPEK", which plain lower-casing does not. */
export function foldSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function formatProductPrice(price: number | string | null | undefined, currency: string): string | null {
  const value = Number(price);
  if (price == null || price === "" || !Number.isFinite(value) || value <= 0) return null;
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

/** Menu and branch often share a name; the second line would only repeat the first. */
export function productPlacement(row: Pick<ProductListRow, "menuId" | "menuName" | "branchName">): {
  menu: string;
  branch: string | null;
} {
  if (row.menuId == null) return { menu: "Menüye atanmadı", branch: null };
  const menu = row.menuName ?? `Menü #${row.menuId}`;
  const branch = row.branchName && foldSearchText(row.branchName) !== foldSearchText(menu) ? row.branchName : null;
  return { menu, branch };
}

export function enrichProducts(
  products: MenuProductApiItem[],
  menus: ActiveMenuSummaryApiItem[],
  branches: { id: number; name: string }[],
): ProductListRow[] {
  const menuById = new Map(menus.map((menu) => [menu.menuId, menu]));
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));
  return products.map((product) => {
    const menu = product.menuId != null ? menuById.get(product.menuId) : undefined;
    const branchId = menu?.branchId ?? null;
    return {
      ...product,
      menuName: menu?.businessName?.trim() || null,
      branchKey: branchId == null ? NO_BRANCH : String(branchId),
      branchName: branchId == null ? null : (branchNameById.get(branchId) ?? null),
    };
  });
}

function matchesStatus(row: ProductListRow, status: ProductStatus): boolean {
  if (status === "no-photo") return !row.imageUrl;
  if (status === "unassigned") return row.menuId == null;
  if (status === "unavailable") return row.available === false;
  return true;
}

function matchesBranch(row: ProductListRow, filters: ProductListFilters) {
  return filters.branch === "all" || row.branchKey === filters.branch;
}

function matchesMenu(row: ProductListRow, filters: ProductListFilters) {
  return filters.menu === "all" || String(row.menuId) === filters.menu;
}

function matchesCategory(row: ProductListRow, filters: ProductListFilters) {
  return filters.category === "all" || row.mainCategoryName === filters.category;
}

function matchesQuery(row: ProductListRow, foldedQuery: string) {
  if (!foldedQuery) return true;
  return foldSearchText([row.name, row.mainCategoryName, row.subCategoryName].filter(Boolean).join(" ")).includes(
    foldedQuery,
  );
}

function withoutStatus(rows: ProductListRow[], filters: ProductListFilters) {
  const foldedQuery = foldSearchText(filters.query);
  return rows.filter(
    (row) =>
      matchesBranch(row, filters) &&
      matchesMenu(row, filters) &&
      matchesCategory(row, filters) &&
      matchesQuery(row, foldedQuery),
  );
}

export function filterProducts(rows: ProductListRow[], filters: ProductListFilters): ProductListRow[] {
  return withoutStatus(rows, filters).filter((row) => matchesStatus(row, filters.status));
}

export function productStatusCounts(rows: ProductListRow[], filters: ProductListFilters): Record<ProductStatus, number> {
  const scoped = withoutStatus(rows, filters);
  return {
    all: scoped.length,
    "no-photo": scoped.filter((row) => matchesStatus(row, "no-photo")).length,
    unassigned: scoped.filter((row) => matchesStatus(row, "unassigned")).length,
    unavailable: scoped.filter((row) => matchesStatus(row, "unavailable")).length,
  };
}

function toOptions(counts: Map<string, { label: string; count: number }>, allLabel: string): ProductFilterOption[] {
  const options = [...counts.entries()]
    .sort(([, a], [, b]) => a.label.localeCompare(b.label, "tr"))
    .map(([value, { label, count }]) => ({ value, label: `${label} (${count})` }));
  return [{ value: "all", label: allLabel }, ...options];
}

function tally(
  counts: Map<string, { label: string; count: number }>,
  key: string,
  label: string,
) {
  const entry = counts.get(key);
  if (entry) entry.count += 1;
  else counts.set(key, { label, count: 1 });
}

/** Each list narrows by the choices to its left, so no option leads to an empty page. */
export function productFilterOptions(rows: ProductListRow[], filters: ProductListFilters) {
  const branches = new Map<string, { label: string; count: number }>();
  const menus = new Map<string, { label: string; count: number }>();
  const categories = new Map<string, { label: string; count: number }>();

  for (const row of rows) {
    if (row.menuId != null) {
      tally(branches, row.branchKey, row.branchName ?? (row.branchKey === NO_BRANCH ? "Şubesiz menüler" : `Şube #${row.branchKey}`));
    }
    if (!matchesBranch(row, filters)) continue;
    if (row.menuId != null) tally(menus, String(row.menuId), row.menuName ?? `Menü #${row.menuId}`);
    if (!matchesMenu(row, filters)) continue;
    if (row.mainCategoryName) tally(categories, row.mainCategoryName, row.mainCategoryName);
  }

  return {
    branches: toOptions(branches, "Tüm şubeler"),
    menus: toOptions(menus, "Tüm menüler"),
    categories: toOptions(categories, "Tüm kategoriler"),
  };
}

export function parseProductFilters(params: URLSearchParams): ProductListFilters {
  const status = params.get("durum");
  const page = Number(params.get("sayfa"));
  return {
    query: params.get("ara") ?? "",
    branch: params.get("sube") ?? "all",
    menu: params.get("menu") ?? "all",
    category: params.get("kategori") ?? "all",
    status: PRODUCT_STATUSES.includes(status as ProductStatus) ? (status as ProductStatus) : "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeProductFilters(filters: ProductListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("ara", filters.query.trim());
  if (filters.branch !== "all") params.set("sube", filters.branch);
  if (filters.menu !== "all") params.set("menu", filters.menu);
  if (filters.category !== "all") params.set("kategori", filters.category);
  if (filters.status !== "all") params.set("durum", filters.status);
  if (filters.page > 1) params.set("sayfa", String(filters.page));
  return params;
}

export function activeProductFilterCount(filters: ProductListFilters): number {
  return [filters.branch, filters.menu, filters.category].filter((value) => value !== "all").length;
}

/** Page buttons for the footer: first, last and the current page's neighbours, with gaps between. */
export function productPageItems(current: number, total: number): (number | "gap")[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  return pages.flatMap((page, index): (number | "gap")[] =>
    index > 0 && page - pages[index - 1] > 1 ? ["gap", page] : [page],
  );
}
