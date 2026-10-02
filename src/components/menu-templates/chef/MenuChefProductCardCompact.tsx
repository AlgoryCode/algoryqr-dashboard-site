"use client";

import { Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";
import { isChefCardQuickAddEnabled } from "@/lib/chef/chef-funnel-flags";

import { chefItemToMenuProduct, useOrderingOptional } from "../shared";
import { useMenuPriceDisplay } from "../shared/menu-currency";

import type { ChefProductCardSource } from "@/hooks/use-chef-chat-analytics";

import { useChefChatAnalyticsOptional } from "./ChefChatAnalyticsContext";
import { useChefProductGalleryOptional } from "./ChefProductGallery";

type MenuChefProductCardCompactProps = {
  item: ChefProductItem;
  galleryProducts: ChefProductItem[];
  galleryIndex: number;
  size?: "default" | "sm";
  caption?: string;
  cardSource?: ChefProductCardSource;
  onCardClick?: () => void;
  onProductSelect?: () => void;
  onQuickAddSuccess?: () => void;
};

export function MenuChefProductCardCompact({
  item,
  galleryProducts,
  galleryIndex,
  size = "default",
  caption,
  cardSource = "bubble",
  onCardClick,
  onProductSelect,
  onQuickAddSuccess,
}: MenuChefProductCardCompactProps) {
  const gallery = useChefProductGalleryOptional();
  const analytics = useChefChatAnalyticsOptional();
  const ordering = useOrderingOptional();
  const priceLabel = useMenuPriceDisplay(item.price ?? undefined, item.currency || "TRY");
  const [addBusy, setAddBusy] = useState(false);
  const quickAddEnabled = isChefCardQuickAddEnabled();

  const openDetail = () => {
    analytics?.trackProductCardClick(item.productId, cardSource);
    onProductSelect?.();
    if (onCardClick) {
      onCardClick();
      return;
    }
    gallery?.openGallery(galleryProducts, galleryIndex);
  };

  const handleQuickAdd = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!ordering || item.available === false || addBusy) return;
    setAddBusy(true);
    try {
      const failure = await ordering.beginAddProduct(chefItemToMenuProduct(item), 1, {
        openCart: false,
      });
      if (!failure) {
        analytics?.trackProductAdd(item.productId, cardSource);
        const sourceRect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
        window.dispatchEvent(
          new CustomEvent("chef-product-added", {
            detail: {
              name: item.name,
              imageUrl: item.imageUrl,
              sourceRect: {
                left: sourceRect.left,
                top: sourceRect.top,
                width: sourceRect.width,
                height: sourceRect.height,
              },
            },
          }),
        );
        onQuickAddSuccess?.();
      }
    } finally {
      setAddBusy(false);
    }
  };

  const widthClass = size === "sm" ? "w-[6.75rem]" : "w-[8rem]";
  const nameClass =
    size === "sm"
      ? "line-clamp-2 text-[10px] font-semibold leading-snug"
      : "line-clamp-2 text-[12px] font-semibold leading-snug";
  const priceClass = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div
      className={`relative ${widthClass} shrink-0 snap-start overflow-hidden rounded-lg border border-white/90 bg-white shadow-[0_3px_12px_rgba(28,40,36,0.07)]`}
    >
      <button
        type="button"
        onClick={openDetail}
        className="flex w-full flex-col overflow-hidden text-left transition hover:brightness-[0.98] active:scale-[0.98]"
        aria-label={`${item.name}${priceLabel ? `, ${priceLabel}` : ""} — detay`}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-[#e8ebe9]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] leading-tight text-[#8a9a93]">
              Görsel yok
            </div>
          )}
        </div>
        <div className={`flex min-h-0 flex-1 flex-col gap-0.5 ${size === "sm" ? "p-2" : "p-2.5"}`}>
          {caption ? (
            <p className="text-[9px] font-bold uppercase tracking-[0.04em] text-[#6b7a73]">{caption}</p>
          ) : null}
          <p className={`${nameClass} tracking-[-0.01em] text-[#1c2824]`}>{item.name}</p>
        </div>
      </button>
      <div className="flex min-h-10 items-center justify-between gap-2 border-t border-[#1c2824]/[0.06] px-2.5 py-1.5">
        {priceLabel ? (
          <p className={`${priceClass} min-w-0 truncate font-semibold tabular-nums text-[#2a3833]`}>{priceLabel}</p>
        ) : (
          <span />
        )}
        {quickAddEnabled && ordering && item.available !== false ? (
          <button
            type="button"
            onClick={(event) => void handleQuickAdd(event)}
            disabled={addBusy || ordering.loading}
            className="petek-chef-add-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2a3833] text-white shadow-md transition hover:bg-[#1f2b27] disabled:opacity-50"
            aria-label={`${item.name} sepete ekle`}
          >
            {addBusy || ordering.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
