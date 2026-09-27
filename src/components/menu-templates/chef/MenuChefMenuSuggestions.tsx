"use client";

import { motion } from "framer-motion";
import { Loader2, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CHEF_MENU_ROLE_LABELS,
  type ChefMenuSuggestion,
} from "@/lib/chef/chef-menu-suggestion";

import { chefItemToMenuProduct, useOrderingOptional } from "../shared";
import { useMenuPriceDisplay } from "../shared/menu-currency";

type MenuChefMenuSuggestionsProps = {
  suggestions: ChefMenuSuggestion[];
  animateEnter?: boolean;
};

function MenuChefMenuSuggestionCard({
  suggestion,
  animateEnter,
}: {
  suggestion: ChefMenuSuggestion;
  animateEnter?: boolean;
}) {
  const ordering = useOrderingOptional();
  const totalLabel = useMenuPriceDisplay(suggestion.totalPrice, suggestion.currency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOrder = Boolean(ordering);
  const addMenuLabel = "Menüyü sepete ekle";

  const linePrices = useMemo(
    () =>
      suggestion.lines.map((line) => ({
        key: `${line.role}-${line.product.productId}`,
        role: line.role,
        name: line.product.name,
        price: line.product.price,
        currency: line.product.currency || suggestion.currency,
      })),
    [suggestion],
  );

  const handleAddMenu = async () => {
    if (!ordering) return;
    setBusy(true);
    setError(null);
    try {
      for (const line of suggestion.lines) {
        const failure = await ordering.beginAddProduct(chefItemToMenuProduct(line.product), 1);
        if (failure) {
          setError(failure);
          return;
        }
      }
      ordering.setCartOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Menü sepete eklenemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.article
      initial={animateEnter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.1rem] border border-white/80 bg-white/85 p-3 shadow-[0_8px_24px_rgba(28,40,36,0.06)] backdrop-blur-sm"
    >
      <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#1c2824]">{suggestion.label}</p>
      <ul className="mt-2.5 space-y-1.5">
        {linePrices.map((line) => (
          <MenuSuggestionLineRow
            key={line.key}
            roleLabel={CHEF_MENU_ROLE_LABELS[line.role]}
            name={line.name}
            price={line.price}
            currency={line.currency}
          />
        ))}
      </ul>
      {totalLabel ? (
        <p className="mt-2.5 text-[12.5px] font-semibold text-[#2a3833]">
          Toplam: <span className="tabular-nums">{totalLabel}</span>
        </p>
      ) : null}
      {canOrder ? (
        <div className="mt-2.5 space-y-1">
          <button
            type="button"
            disabled={busy || ordering?.loading}
            onClick={() => void handleAddMenu()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-[0.7rem] bg-[#1c2824] px-3 py-2 text-[12px] font-medium text-white transition hover:bg-[#2a3833] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy || ordering?.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.1} />
            )}
            {addMenuLabel}
          </button>
          {error ? <p className="text-[10.5px] leading-snug text-[#b42318]">{error}</p> : null}
        </div>
      ) : null}
    </motion.article>
  );
}

function MenuSuggestionLineRow({
  roleLabel,
  name,
  price,
  currency,
}: {
  roleLabel: string;
  name: string;
  price: number | null;
  currency: string;
}) {
  const priceLabel = useMenuPriceDisplay(price, currency);
  return (
    <li className="flex items-start justify-between gap-2 text-[12px] leading-snug text-[#3d4a45]">
      <span className="min-w-0">
        <span className="font-medium text-[#5f6f68]">{roleLabel}:</span> {name}
      </span>
      {priceLabel ? <span className="shrink-0 tabular-nums text-[#2a3833]">{priceLabel}</span> : null}
    </li>
  );
}

export function MenuChefMenuSuggestions({ suggestions, animateEnter }: MenuChefMenuSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={animateEnter ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
      aria-label="Önerilen menü kombinasyonları"
    >
      <p className="text-[12px] font-medium tracking-[0.01em] text-[#5f6f68]">
        Yemek, içecek ve tatlı menü önerileri
      </p>
      {suggestions.map((suggestion) => (
        <MenuChefMenuSuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          animateEnter={animateEnter}
        />
      ))}
    </motion.div>
  );
}
