"use client";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { MenuChefChatCartPanel } from "./MenuChefChatCartPanel";
import { ChefPanelSectionTitle } from "./ChefPanelSectionTitle";
import { MenuChefProductCardGrid } from "./MenuChefProductCardGrid";

type MenuChefChatStickyPanelsProps = {
  products: ChefProductItem[];
};

export function MenuChefChatStickyPanels({ products }: MenuChefChatStickyPanelsProps) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      <section aria-label="Sepet">
        <ChefPanelSectionTitle>Sepet</ChefPanelSectionTitle>
        <MenuChefChatCartPanel />
      </section>

      {products.length > 0 ? (
        <section aria-label="Ürün önerileri">
          <ChefPanelSectionTitle>Ürünler</ChefPanelSectionTitle>
          <MenuChefProductCardGrid products={products} />
        </section>
      ) : null}
    </div>
  );
}
