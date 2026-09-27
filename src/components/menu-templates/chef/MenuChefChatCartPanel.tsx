"use client";

import { ShoppingBag } from "lucide-react";

import { useMenuPriceDisplay } from "../shared/menu-currency";
import { useOrderingOptional } from "../shared";

function CartLinePrice({
  unitPrice,
  quantity,
  currency,
}: {
  unitPrice?: number | string;
  quantity: number;
  currency?: string;
}) {
  if (unitPrice == null) return null;
  const amount = Number(unitPrice) * quantity;
  const label = useMenuPriceDisplay(amount, currency ?? "TRY");
  return <span className="shrink-0 tabular-nums text-[#5f6f68]">{label}</span>;
}

export function MenuChefChatCartPanel() {
  const ordering = useOrderingOptional();
  if (!ordering) return null;

  const items = ordering.localItems;
  const totalLabel = useMenuPriceDisplay(ordering.cartTotal, items[0]?.currency ?? "TRY");

  return (
    <section
      className="rounded-[1.1rem] border border-white/80 bg-white/85 p-3 shadow-[0_8px_24px_rgba(28,40,36,0.06)] backdrop-blur-sm"
      aria-label="Sepet"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-[#1c2824]">
          <ShoppingBag className="h-4 w-4 text-[#5f7a6d]" strokeWidth={2} aria-hidden />
          Sepet
        </p>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => ordering.setCartOpen(true)}
            className="text-[12px] font-medium text-[#3d6b5c] underline-offset-2 hover:underline"
          >
            Düzenle
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-[#5f6f68]">
          Sepetiniz boş. Önerilen ürünleri ekleyerek başlayın.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.lineKey}
              className="flex items-center justify-between gap-2 text-[13px] text-[#24302c]"
            >
              <span className="min-w-0 truncate">
                {item.quantity > 1 ? `${item.quantity}× ` : ""}
                {item.productName}
              </span>
              <CartLinePrice
                unitPrice={item.unitPrice}
                quantity={item.quantity}
                currency={item.currency}
              />
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 ? (
        <p className="mt-2.5 border-t border-[#1c2824]/[0.06] pt-2 text-right text-[13px] font-semibold tabular-nums text-[#1c2824]">
          Toplam {totalLabel}
        </p>
      ) : null}
    </section>
  );
}
