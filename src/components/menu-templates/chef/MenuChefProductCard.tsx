"use client";

import { useState } from "react";
import { Info, Loader2, Plus } from "lucide-react";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { useMenuPriceDisplay } from "../shared/menu-currency";
import {
  chefItemToMenuProduct,
  useMenuLocaleOptional,
  useOrderingOptional,
} from "../shared";

import { useChefProductGalleryOptional } from "./ChefProductGallery";

type MenuChefProductCardProps = {
  item: ChefProductItem;
  galleryProducts?: ChefProductItem[];
  galleryIndex?: number;
  showProductId?: boolean;
};

export function MenuChefProductCard({
  item,
  galleryProducts,
  galleryIndex = 0,
  showProductId = false,
}: MenuChefProductCardProps) {
  const ordering = useOrderingOptional();
  const locale = useMenuLocaleOptional();
  const gallery = useChefProductGalleryOptional();
  const priceLabel = useMenuPriceDisplay(item.price ?? undefined, item.currency || "TRY");
  const [addBusy, setAddBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canAddToOrder = Boolean(ordering) && item.available !== false;
  const addLabel = locale?.t.addToCart ?? "Sepete Ekle";
  const errorText = localError || ordering?.error || null;

  const openDetail = () => {
    const list = galleryProducts?.length ? galleryProducts : [item];
    const index =
      galleryProducts?.length
        ? galleryProducts.findIndex((entry) => entry.productId === item.productId)
        : galleryIndex;
    gallery?.openGallery(list, index >= 0 ? index : 0);
  };

  const handleAddToOrder = async () => {
    if (!ordering || item.available === false) return;
    setAddBusy(true);
    setLocalError(null);
    try {
      const failure = await ordering.beginAddProduct(chefItemToMenuProduct(item), 1);
      if (failure) setLocalError(failure);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sepete eklenemedi");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-[1.1rem] border border-white/80 bg-white/85 shadow-[0_8px_24px_rgba(28,40,36,0.06)] backdrop-blur-sm">
      <div className="aspect-[16/10] w-full overflow-hidden bg-[#e8ebe9]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-[#8a9a93]">
            Görsel yok
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {showProductId ? (
          <p className="text-[10px] font-medium tabular-nums text-[#8a9a93]">#{item.productId}</p>
        ) : null}
        <h4 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#1c2824]">
          {item.name}
        </h4>
        {item.description ? (
          <p className="line-clamp-3 text-[12.5px] leading-relaxed text-[#5f6f68]">{item.description}</p>
        ) : null}
        {item.allergens && item.allergens.length > 0 ? (
          <p className="text-[11.5px] leading-snug text-[#6a7a72]">
            <span className="font-medium text-[#4a5c56]">Alerjen:</span> {item.allergens.join(", ")}
          </p>
        ) : null}
        {priceLabel ? (
          <p className="text-[14px] font-semibold tabular-nums text-[#2a3833]">{priceLabel}</p>
        ) : null}
        <div className="mt-1 flex gap-2">
          {canAddToOrder && ordering ? (
            <button
              type="button"
              disabled={addBusy || ordering.loading}
              onClick={() => void handleAddToOrder()}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-[0.7rem] bg-[#1c2824] px-3 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#2a3833] disabled:opacity-50"
            >
              {addBusy || ordering.loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              )}
              {addLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={openDetail}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-[0.7rem] border border-[#1c2824]/12 bg-white px-3 py-2.5 text-[12.5px] font-medium text-[#2a3833] transition hover:bg-[#f3f5f4]"
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2.1} />
            Detay
          </button>
        </div>
        {errorText ? (
          <p className="text-[10.5px] leading-snug text-[#b42318]">{errorText}</p>
        ) : null}
      </div>
    </article>
  );
}
