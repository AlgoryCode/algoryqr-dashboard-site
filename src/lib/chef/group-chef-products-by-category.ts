import type { ChefProductItem } from "@/lib/chef/chef-product-item";

export type ChefProductCategoryGroup = {
  title: string;
  products: ChefProductItem[];
};

export function groupChefProductsByCategory(products: ChefProductItem[]): ChefProductCategoryGroup[] {
  const order: string[] = [];
  const map = new Map<string, ChefProductItem[]>();

  for (const product of products) {
    const title =
      product.mainCategoryName?.trim() ||
      product.subCategoryName?.trim() ||
      "Önerilenler";
    if (!map.has(title)) {
      map.set(title, []);
      order.push(title);
    }
    map.get(title)!.push(product);
  }

  return order.map((title) => ({
    title,
    products: map.get(title) ?? [],
  }));
}
