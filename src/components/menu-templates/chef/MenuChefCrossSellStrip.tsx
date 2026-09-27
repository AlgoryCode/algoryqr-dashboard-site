"use client";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { ChefPanelGroupTitle } from "./ChefPanelSectionTitle";
import { MenuChefProductCardCompact } from "./MenuChefProductCardCompact";

type MenuChefCrossSellStripProps = {
  suggestions: ChefProductItem[];
  onSelectProduct: (product: ChefProductItem, index: number) => void;
  onAddProduct: (product: ChefProductItem) => void;
};

export function MenuChefCrossSellStrip({
  suggestions,
  onSelectProduct,
  onAddProduct,
}: MenuChefCrossSellStripProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-4 rounded-[0.95rem] border border-[#1c2824]/[0.06] bg-white/90 p-2.5">
      <ChefPanelGroupTitle className="mb-2 text-[#1c2824]">Menünü tamamla</ChefPanelGroupTitle>
      <div
        className="-mx-0.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {suggestions.map((item, index) => (
          <div key={item.productId} className="flex shrink-0 flex-col gap-1.5" role="listitem">
            <MenuChefProductCardCompact
              item={item}
              galleryProducts={suggestions}
              galleryIndex={index}
              size="sm"
              cardSource="cross_sell"
              onCardClick={() => onSelectProduct(item, index)}
            />
            <button
              type="button"
              onClick={() => onAddProduct(item)}
              className="rounded-[0.55rem] bg-[#1c2824]/[0.06] px-2 py-1 text-[10px] font-semibold text-[#2a3833] transition hover:bg-[#1c2824]/10"
            >
              Sepete ekle
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
