"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { chefItemToMenuProduct, useMenuLocaleOptional, useOrderingOptional } from "../shared";
import { useMenuPriceDisplay } from "../shared/menu-currency";

type MenuChefProductDetailPaneProps = {
  item: ChefProductItem;
};

export function MenuChefProductDetailPane({ item }: MenuChefProductDetailPaneProps) {
  const ordering = useOrderingOptional();
  const locale = useMenuLocaleOptional();
  const priceLabel = useMenuPriceDisplay(item.price ?? undefined, item.currency || "TRY");
  const [addBusy, setAddBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addLabel = locale?.t.addToCart ?? "Sepete Ekle";

  const handleAdd = async () => {
    if (!ordering || item.available === false) return;
    setAddBusy(true);
    setError(null);
    try {
      const failure = await ordering.beginAddProduct(chefItemToMenuProduct(item), 1);
      if (failure) setError(failure);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sepete eklenemedi");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-[#e8ebe9]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="space-y-2">
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1c2824]">{item.name}</h3>
        {priceLabel ? (
          <p className="text-[15px] font-semibold tabular-nums text-[#2a3833]">{priceLabel}</p>
        ) : null}
        {item.description ? (
          <p className="text-[14px] leading-relaxed text-[#4a5c56]">{item.description}</p>
        ) : null}
        {item.allergens && item.allergens.length > 0 ? (
          <p className="text-[12.5px] leading-relaxed text-[#6a7a72]">
            <span className="font-medium text-[#3d4a45]">Alerjen:</span> {item.allergens.join(", ")}
          </p>
        ) : null}
      </div>
      {ordering && item.available !== false ? (
        <button
          type="button"
          disabled={addBusy || ordering.loading}
          onClick={() => void handleAdd()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[0.85rem] bg-[#1c2824] px-4 py-3 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {addBusy || ordering.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {addLabel}
        </button>
      ) : null}
      {error ? <p className="text-[12px] text-[#b42318]">{error}</p> : null}
    </div>
  );
}
