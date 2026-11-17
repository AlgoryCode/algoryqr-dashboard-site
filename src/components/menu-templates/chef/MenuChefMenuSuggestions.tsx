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

import { ChefPanelGroupTitle, ChefPanelSectionTitle } from "./ChefPanelSectionTitle";
import { useChefChatCatalogProducts } from "./ChefChatCatalogContext";
import { MenuChefProductCardCompact } from "./MenuChefProductCardCompact";

type MenuChefMenuSuggestionsProps = {
  suggestions: ChefMenuSuggestion[];
  animateEnter?: boolean;
  /** Sohbet balonu altında blok başlığı göster */
  showSectionTitle?: boolean;
};

function MenuChefMenuSuggestionCard({
  suggestion,
  animateEnter,
}: {
  suggestion: ChefMenuSuggestion;
  animateEnter?: boolean;
}) {
  const ordering = useOrderingOptional();
  const catalog = useChefChatCatalogProducts();
  const totalLabel = useMenuPriceDisplay(suggestion.totalPrice, suggestion.currency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOrder = Boolean(ordering);
  const galleryProducts = useMemo(
    () => suggestion.lines.map((line) => line.product),
    [suggestion.lines],
  );

  const handleAddMenu = async () => {
    if (!ordering) return;
    setBusy(true);
    setError(null);
    try {
      for (const line of suggestion.lines) {
        const sourceProduct = catalog.find((entry) => entry.productId === line.product.productId) ?? chefItemToMenuProduct(line.product);
        const failure = await ordering.beginAddProduct(sourceProduct, 1, {
          deferOptions: true,
          origin: "assistant",
        });
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
      initial={animateEnter ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[0.95rem] border border-white/80 bg-white/90 p-2.5 shadow-[0_6px_18px_rgba(28,40,36,0.05)] backdrop-blur-sm"
    >
      <ChefPanelGroupTitle className="mb-1.5 text-[11px] text-[#1c2824]">{suggestion.label}</ChefPanelGroupTitle>
      <div
        className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {suggestion.lines.map((line) => {
          const galleryIndex = galleryProducts.findIndex(
            (item) => item.productId === line.product.productId,
          );
          return (
            <div key={`${line.role}-${line.product.productId}`} role="listitem">
              <MenuChefProductCardCompact
                item={line.product}
                galleryProducts={galleryProducts}
                galleryIndex={galleryIndex >= 0 ? galleryIndex : 0}
                size="sm"
                caption={CHEF_MENU_ROLE_LABELS[line.role]}
                cardSource="menu_suggestion"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {totalLabel ? (
          <p className="text-[11px] font-semibold tabular-nums text-[#2a3833]">
            Toplam <span className="text-[#1c2824]">{totalLabel}</span>
          </p>
        ) : (
          <span />
        )}
        {canOrder ? (
          <button
            type="button"
            disabled={busy || ordering?.loading}
            onClick={() => void handleAddMenu()}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-[0.6rem] bg-[#1c2824] px-2.5 py-1.5 text-[10.5px] font-medium text-white transition hover:bg-[#2a3833] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy || ordering?.loading ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} />
            ) : (
              <ShoppingBag className="h-3 w-3" strokeWidth={2.1} />
            )}
            Sepete ekle
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[10px] leading-snug text-[#b42318]">{error}</p> : null}
    </motion.article>
  );
}

export function MenuChefMenuSuggestions({
  suggestions,
  animateEnter,
  showSectionTitle = false,
}: MenuChefMenuSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={animateEnter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
      aria-label="Menü önerileri"
    >
      {showSectionTitle ? <ChefPanelSectionTitle>Menü öneri</ChefPanelSectionTitle> : null}
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
