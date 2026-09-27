"use client";

import type { ChefProductCardSource } from "@/hooks/use-chef-chat-analytics";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import { groupChefProductsByCategory } from "@/lib/chef/group-chef-products-by-category";

import { ChefPanelGroupTitle, ChefPanelSectionTitle } from "./ChefPanelSectionTitle";
import { MenuChefProductCardCompact } from "./MenuChefProductCardCompact";

type MenuChefProductCardGridProps = {
  products: ChefProductItem[];
  className?: string;
  /** Ana blok başlığı (ör. sohbet balonunda "Öneriler") */
  blockTitle?: string;
  /** Üst panelde zaten "Ürünler" yazıyorsa kategori başlıkları yeter */
  showBlockTitle?: boolean;
  cardSource?: ChefProductCardSource;
  onQuickAddSuccess?: () => void;
};

export function MenuChefProductCardGrid({
  products,
  className,
  blockTitle = "Öneriler",
  showBlockTitle = false,
  cardSource = "bubble",
  onQuickAddSuccess,
}: MenuChefProductCardGridProps) {
  if (products.length === 0) return null;

  const groups = groupChefProductsByCategory(products);

  return (
    <div className={["space-y-3", className].filter(Boolean).join(" ")} aria-label="Önerilen ürünler">
      {showBlockTitle && blockTitle ? <ChefPanelSectionTitle>{blockTitle}</ChefPanelSectionTitle> : null}
      {groups.map((group) => {
        const galleryProducts = products;

        return (
          <div key={group.title}>
            <ChefPanelGroupTitle>{group.title}</ChefPanelGroupTitle>
            <div
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
              role="list"
            >
              {group.products.map((product) => {
                const galleryIndex = galleryProducts.findIndex(
                  (item) => item.productId === product.productId,
                );
                return (
                  <div key={product.productId} role="listitem">
                    <MenuChefProductCardCompact
                      item={product}
                      galleryProducts={galleryProducts}
                      galleryIndex={galleryIndex >= 0 ? galleryIndex : 0}
                      cardSource={cardSource}
                      onQuickAddSuccess={onQuickAddSuccess}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
