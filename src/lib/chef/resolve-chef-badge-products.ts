import { classifyMenuProductRole } from "@/lib/chef/build-chef-menu-suggestions";
import type { ChefChatBadgeFilter } from "@/lib/chef/chef-chat-badges";
import type { MenuProductApiItem } from "@/lib/api";

const MAX_PRODUCTS = 10;

function ratingScore(product: MenuProductApiItem): number {
  const avg =
    typeof product.ratingAvg === "number" ? product.ratingAvg : Number(product.ratingAvg ?? 0);
  const count =
    typeof product.ratingCount === "number" ? product.ratingCount : Number(product.ratingCount ?? 0);
  if (!Number.isFinite(avg) || !Number.isFinite(count)) return 0;
  return avg * 1000 + count;
}

export function selectProductsForChefBadgeFilter(
  filter: ChefChatBadgeFilter,
  catalog: MenuProductApiItem[],
  fetched: MenuProductApiItem[],
): MenuProductApiItem[] {
  const available = (items: MenuProductApiItem[]) =>
    items.filter((product) => product.available !== false).slice(0, MAX_PRODUCTS);

  if (filter.type === "chefRecommended") {
    return available(fetched.length > 0 ? fetched : catalog.filter((p) => p.chefRecommended));
  }

  if (filter.type === "popularByRating") {
    const pool = fetched.length > 0 ? fetched : catalog;
    return [...pool].sort((a, b) => ratingScore(b) - ratingScore(a)).slice(0, MAX_PRODUCTS);
  }

  if (filter.type === "tagSlug") {
    const pool = fetched.length > 0 ? fetched : catalog;
    return available(
      pool.filter((product) =>
        (product.tags ?? []).some((tag) => tag.slug === filter.slug || tag.name === filter.slug),
      ),
    );
  }

  if (filter.type === "mainCategoryId") {
    return available(
      catalog.filter((product) => product.mainCategoryId === filter.mainCategoryId),
    );
  }

  if (filter.type === "subCategoryId") {
    return available(catalog.filter((product) => product.subCategoryId === filter.subCategoryId));
  }

  if (filter.type === "productIds") {
    const byId = new Map(catalog.map((product) => [product.productId, product]));
    const ordered: MenuProductApiItem[] = [];
    for (const productId of filter.productIds) {
      const product = byId.get(productId);
      if (product && product.available !== false) ordered.push(product);
    }
    return ordered.slice(0, MAX_PRODUCTS);
  }

  if (filter.type === "menuRole") {
    return available(
      catalog.filter((product) => classifyMenuProductRole(product) === filter.role),
    );
  }

  return [];
}
