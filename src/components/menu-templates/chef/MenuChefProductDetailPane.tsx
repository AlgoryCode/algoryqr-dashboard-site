"use client";

import { Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import { chefCrossSellMaxItems, isChefCrossSellEnabled } from "@/lib/chef/chef-funnel-flags";
import { pickCrossSellProducts } from "@/lib/chef/pick-cross-sell-products";

import { chefItemToMenuProduct, useMenuLocaleOptional, useOrderingOptional } from "../shared";
import { useMenuPriceDisplay } from "../shared/menu-currency";

import { useChefChatAnalyticsOptional } from "./ChefChatAnalyticsContext";
import { useChefChatCatalogProducts } from "./ChefChatCatalogContext";
import { useChefProductGalleryOptional } from "./ChefProductGallery";
import { MenuChefCrossSellStrip } from "./MenuChefCrossSellStrip";

type MenuChefProductDetailPaneProps = {
  item: ChefProductItem;
};

export function MenuChefProductDetailPane({ item }: MenuChefProductDetailPaneProps) {
  const ordering = useOrderingOptional();
  const locale = useMenuLocaleOptional();
  const catalog = useChefChatCatalogProducts();
  const analytics = useChefChatAnalyticsOptional();
  const gallery = useChefProductGalleryOptional();
  const priceLabel = useMenuPriceDisplay(item.price ?? undefined, item.currency || "TRY");
  const [addBusy, setAddBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [crossSellItems, setCrossSellItems] = useState<ChefProductItem[]>([]);
  const addLabel = locale?.t.addToCart ?? "Sepete Ekle";

  const cartProductIds = useMemo(
    () => ordering?.localItems.map((line) => line.productId) ?? [],
    [ordering?.localItems],
  );

  const handleAdd = async () => {
    if (!ordering || item.available === false) return;
    setAddBusy(true);
    setError(null);
    try {
      const failure = await ordering.beginAddProduct(chefItemToMenuProduct(item), 1, {
        openCart: false,
      });
      if (failure) {
        setError(failure);
        return;
      }
      analytics?.trackProductAdd(item.productId, "gallery");
      setAdded(true);

      if (isChefCrossSellEnabled() && catalog.length > 0) {
        const suggestions = pickCrossSellProducts({
          anchorProductId: item.productId,
          catalog,
          cartProductIds: [...cartProductIds, item.productId],
          maxItems: chefCrossSellMaxItems(),
        });
        setCrossSellItems(suggestions);
        if (suggestions.length > 0) {
          analytics?.markCrossSellInteraction();
          analytics?.trackCrossSellShown(
            item.productId,
            suggestions.map((product) => product.productId),
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sepete eklenemedi");
    } finally {
      setAddBusy(false);
    }
  };

  const handleCrossSellAdd = async (product: ChefProductItem) => {
    if (!ordering) return;
    setAddBusy(true);
    setError(null);
    try {
      const failure = await ordering.beginAddProduct(chefItemToMenuProduct(product), 1, {
        openCart: false,
      });
      if (failure) {
        setError(failure);
        return;
      }
      analytics?.trackCrossSellAdd(product.productId);
      analytics?.markCrossSellInteraction();
      setCrossSellItems((prev) => prev.filter((entry) => entry.productId !== product.productId));
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
      {added ? (
        <p className="rounded-[0.7rem] bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-900">
          Sepete eklendi
        </p>
      ) : null}
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
      {crossSellItems.length > 0 ? (
        <MenuChefCrossSellStrip
          suggestions={crossSellItems}
          onSelectProduct={(product, index) => {
            analytics?.trackCrossSellClick(product.productId);
            gallery?.openGallery(crossSellItems, index);
          }}
          onAddProduct={(product) => void handleCrossSellAdd(product)}
        />
      ) : null}
      {error ? <p className="text-[12px] text-[#b42318]">{error}</p> : null}
    </div>
  );
}
