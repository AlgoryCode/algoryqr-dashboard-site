"use client";

import type { ChefMenuSuggestion } from "@/lib/chef/chef-menu-suggestion";
import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { MenuChefChatCartPanel } from "./MenuChefChatCartPanel";
import { MenuChefMenuSuggestions } from "./MenuChefMenuSuggestions";
import { MenuChefProductCard } from "./MenuChefProductCard";

type MenuChefChatStickyPanelsProps = {
  menuSuggestions: ChefMenuSuggestion[];
  products: ChefProductItem[];
  showProductIdOnCards: boolean;
};

export function MenuChefChatStickyPanels({
  menuSuggestions,
  products,
  showProductIdOnCards,
}: MenuChefChatStickyPanelsProps) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      <section aria-label="Menü önerileri">
        <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a9a93]">
          Menü
        </p>
        {menuSuggestions.length > 0 ? (
          <MenuChefMenuSuggestions suggestions={menuSuggestions} />
        ) : (
          <p className="rounded-[1.1rem] border border-dashed border-[#1c2824]/10 bg-white/50 px-3 py-4 text-[13px] leading-relaxed text-[#5f6f68]">
            Hazır menü kombinasyonları şef önerisiyle burada görünür. &quot;Öneri&quot;ye dokunun veya
            sohbet edin.
          </p>
        )}
      </section>

      <MenuChefChatCartPanel />

      {products.length > 0 ? (
        <section aria-label="Ürün önerileri">
          <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a9a93]">
            Ürünler
          </p>
          <div className="flex flex-col gap-3" role="list">
            {products.map((product, index) => (
              <div key={product.productId} role="listitem">
                <MenuChefProductCard
                  item={product}
                  galleryProducts={products}
                  galleryIndex={index}
                  showProductId={showProductIdOnCards}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
