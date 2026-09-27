"use client";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { useMenuPriceDisplay } from "../shared/menu-currency";

import { useChefProductGalleryOptional } from "./ChefProductGallery";

type MenuChefProductCardCompactProps = {
  item: ChefProductItem;
  galleryProducts: ChefProductItem[];
  galleryIndex: number;
  size?: "default" | "sm";
  caption?: string;
};

export function MenuChefProductCardCompact({
  item,
  galleryProducts,
  galleryIndex,
  size = "default",
  caption,
}: MenuChefProductCardCompactProps) {
  const gallery = useChefProductGalleryOptional();
  const priceLabel = useMenuPriceDisplay(item.price ?? undefined, item.currency || "TRY");

  const openDetail = () => {
    gallery?.openGallery(galleryProducts, galleryIndex);
  };

  const widthClass = size === "sm" ? "w-[5.5rem]" : "w-[6.75rem]";
  const nameClass =
    size === "sm"
      ? "line-clamp-2 text-[10px] font-semibold leading-snug"
      : "line-clamp-2 text-[11px] font-semibold leading-snug";
  const priceClass = size === "sm" ? "text-[10px]" : "text-[10.5px]";

  return (
    <button
      type="button"
      onClick={openDetail}
      className={`flex ${widthClass} shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-white/90 bg-white text-left shadow-[0_3px_12px_rgba(28,40,36,0.07)] transition hover:brightness-[0.98] active:scale-[0.98]`}
      aria-label={`${item.name}${priceLabel ? `, ${priceLabel}` : ""} — detay`}
    >
      <div className="aspect-square w-full overflow-hidden bg-[#e8ebe9]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] leading-tight text-[#8a9a93]">
            Görsel yok
          </div>
        )}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col gap-0.5 ${size === "sm" ? "p-1.5" : "p-2"}`}>
        {caption ? (
          <p className="text-[9px] font-bold uppercase tracking-[0.04em] text-[#6b7a73]">{caption}</p>
        ) : null}
        <p className={`${nameClass} tracking-[-0.01em] text-[#1c2824]`}>{item.name}</p>
        {priceLabel ? (
          <p className={`${priceClass} font-semibold tabular-nums text-[#2a3833]`}>{priceLabel}</p>
        ) : null}
      </div>
    </button>
  );
}
