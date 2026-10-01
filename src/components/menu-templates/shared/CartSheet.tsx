"use client";

import { useCallback, useState } from "react";
import { Loader2, Minus, Plus, ReceiptText, ShoppingBag, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MenuPriceText, useMenuPriceDisplay } from "./menu-currency";
import { useMenuLocaleOptional } from "./menu-locale";
import { Tx } from "@/components/google-translate-provider";
import { OrderSuccessOverlay } from "./OrderSuccessOverlay";
import { CampaignCartPreview } from "./CampaignCartPreview";
import { useCartSheetHostOptional } from "./cart-sheet-host-context";
import { useOrdering } from "./ordering-context";
import { usePublicMenuTheme } from "./public-menu-theme";

export function CartSheet() {
  const cartSheetHost = useCartSheetHostOptional();
  const chefChatActive = cartSheetHost?.chefChatActive ?? false;
  const side = chefChatActive ? "left" : "right";
  const stackZ = chefChatActive ? "z-[110]" : "z-[80]";
  const {
    identifier,
    sessionToken,
    cartOpen,
    setCartOpen,
    localItems,
    cartTotal,
    cart,
    note,
    setNote,
    updateQty,
    submitOrder,
    submitting,
    error,
    tableName,
  } = useOrdering();
  const locale = useMenuLocaleOptional();
  const t = locale?.t;
  const [successId, setSuccessId] = useState<number | null>(null);
  const theme = usePublicMenuTheme();
  const currency = cart?.currency || localItems[0]?.currency || "TRY";
  const totalLabel = useMenuPriceDisplay(cartTotal, currency);

  const dismissSuccess = useCallback(() => {
    setSuccessId(null);
  }, []);

  return (
    <>
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side={side}
        overlayClassName={stackZ}
        className={`${theme.rootClassName} ${stackZ} h-full w-[min(100%,24rem)] overflow-y-auto ${
          side === "left" ? "border-r" : "border-l"
        } border-[var(--lx-border)] bg-[var(--lx-bg)] p-0 text-[var(--lx-fg)]`}
        dir={locale?.dir}
      >
        <div className="space-y-4 px-4 pb-8 pt-4">
          <style>{theme.styles}</style>
          <SheetHeader className="pw-cart-header text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="pw-cart-title-icon" aria-hidden="true"><ShoppingBag className="h-4 w-4" /></span>
              {t?.cart || "Sepet"}
            </SheetTitle>
            <SheetDescription className="pw-cart-description">
              {tableName ? `${t?.tableLabel ?? "Masa"}: ${tableName}` : t?.tableOrder ?? "Masa siparişi"}
            </SheetDescription>
          </SheetHeader>

          {localItems.length === 0 ? (
            <div className="pw-cart-empty">
              <span className="pw-cart-empty-icon" aria-hidden="true"><ShoppingBag className="h-7 w-7" /></span>
              <p className="text-sm text-muted-foreground">{t?.cartEmpty ?? "Sepetiniz boş."}</p>
              <span className="pw-cart-empty-sparkle" aria-hidden="true"><Sparkles className="h-4 w-4" /></span>
            </div>
          ) : (
            <ul className="pw-cart-items space-y-3">
              {localItems.map((item) => (
                <li
                  key={item.lineKey}
                  className="pw-cart-item flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <span className="pw-cart-item-icon" aria-hidden="true"><ReceiptText className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold"><Tx>{item.productName}</Tx></p>
                    {item.selectedOptions?.length ? (
                      <div className="pw-cart-options">
                        {item.selectedOptions.map((option) => (
                          <span key={`${item.lineKey}-${option.optionId}`} className="pw-cart-option-pill">
                            {option.optionName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="pw-cart-unit-price text-xs text-muted-foreground">
                      <MenuPriceText price={item.unitPrice} currency={currency} />
                    </p>
                  </div>
                  <div className="pw-cart-quantity flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
                      onClick={() => void updateQty(item.lineKey, item.quantity - 1)}
                      aria-label={t?.decreaseQty ?? "Azalt"}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
                      onClick={() => void updateQty(item.lineKey, item.quantity + 1)}
                      aria-label={t?.increaseQty ?? "Artır"}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <CampaignCartPreview
            identifier={identifier}
            items={localItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            }))}
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t?.cartNote ?? "Not"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={t?.cartNotePlaceholder ?? "Örn. az pişmiş, sos ayrı"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="pw-cart-total flex items-center justify-between text-sm">
            <span className="flex items-center gap-2"><ReceiptText className="h-4 w-4" />{t?.total ?? "Toplam"}</span>
            <span className="font-semibold">{totalLabel}</span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="button"
            disabled={localItems.length === 0 || submitting}
            onClick={async () => {
              const order = await submitOrder();
              if (order?.id) {
                setSuccessId(order.id);
                setCartOpen(false);
              }
            }}
            className="pw-cart-submit inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t?.placeOrder || "Sipariş ver"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
    {successId != null ? (
      <OrderSuccessOverlay
        orderId={successId}
        identifier={identifier}
        sessionToken={sessionToken}
        onDone={dismissSuccess}
      />
    ) : null}
    </>
  );
}
