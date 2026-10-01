"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleDot, Cookie, IceCreamBowl, Loader2, Minus, Plus, Sparkles, X } from "lucide-react";

import type { MenuProductApiItem } from "@/lib/api";
import {
  areOptionSelectionsValid,
  formatOptionGroupHeading,
  optionDeltaTotal,
  optionKindLabel,
  type MenuProductOptionGroupApiItem,
} from "@/lib/product-options";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MenuPriceText, useMenuPriceDisplay } from "./menu-currency";
import { useMenuLocaleOptional } from "./menu-locale";
import { Tx } from "@/components/google-translate-provider";
import { usePublicMenuTheme } from "./public-menu-theme";

type ProductOptionsSheetProps = {
  product: MenuProductApiItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    selectedOptionIds: number[];
    quantity: number;
    note?: string;
  }) => Promise<string | null>;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toggleSingle(selected: number[], group: MenuProductOptionGroupApiItem, optionId: number): number[] {
  const groupIds = new Set((group.options ?? []).map((option) => option.optionId));
  const withoutGroup = selected.filter((id) => !groupIds.has(id));
  return [...withoutGroup, optionId];
}

function toggleMulti(selected: number[], group: MenuProductOptionGroupApiItem, optionId: number): number[] {
  const groupIds = new Set((group.options ?? []).map((option) => option.optionId));
  const inGroup = selected.filter((id) => groupIds.has(id));
  if (selected.includes(optionId)) {
    return selected.filter((id) => id !== optionId);
  }
  if (inGroup.length >= group.maxSelect) {
    return selected;
  }
  return [...selected, optionId];
}

function optionGroupIcon(name: string) {
  const value = name.toLocaleLowerCase("tr-TR");
  if (value.includes("çikol")) return Cookie;
  if (value.includes("meyve")) return CircleDot;
  if (value.includes("şeker")) return Sparkles;
  if (value.includes("dondurma")) return IceCreamBowl;
  return Sparkles;
}

export function ProductOptionsSheet({
  product,
  open,
  onOpenChange,
  onConfirm,
}: ProductOptionsSheetProps) {
  const locale = useMenuLocaleOptional();
  const t = locale?.t;
  const theme = usePublicMenuTheme();
  const groups = product?.optionGroups ?? [];
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setSelectedOptionIds([]);
    setQuantity(1);
    setNote("");
    setBusy(false);
  }, [open, product]);

  const basePrice = toNumber(product?.price);
  const delta = optionDeltaTotal(groups, selectedOptionIds);
  const unitPrice = basePrice + delta;
  const lineLabel = useMenuPriceDisplay(unitPrice * quantity, product?.currency || "TRY");
  const valid = areOptionSelectionsValid(groups, selectedOptionIds);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.groupId - b.groupId,
      ),
    [groups],
  );

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        overlayClassName="z-[90]"
        className={`${theme.rootClassName} pw-options-sheet z-[90] max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-[var(--lx-border)] bg-[var(--lx-bg)] p-0 text-[var(--lx-fg)]`}
        dir={locale?.dir}
      >
        <div className="pw-options-inner space-y-4 px-4 pb-8 pt-4">
          <style>{theme.styles}</style>
          <div className="pw-options-sticky-header">
            <SheetHeader className="pw-options-header text-left">
              <SheetTitle className="flex items-center gap-2">
                <span className="pw-options-title-icon" aria-hidden="true"><Cookie className="h-4 w-4" /></span>
                <Tx>{product.name}</Tx>
              </SheetTitle>
              <SheetDescription className="pw-options-price">
                <MenuPriceText price={unitPrice} currency={product.currency || "TRY"} />
              </SheetDescription>
            </SheetHeader>
            <SheetClose className="pw-options-close" aria-label="Kapat">
              <X className="h-5 w-5" />
              <span className="sr-only">Kapat</span>
            </SheetClose>
          </div>

          {sortedGroups.map((group) => {
            const single = group.maxSelect <= 1;
            const Icon = optionGroupIcon(formatOptionGroupHeading(group));
            const selectedInGroup = selectedOptionIds.filter((id) =>
              (group.options ?? []).some((option) => option.optionId === id),
            ).length;
            return (
              <section key={group.groupId} className="pw-option-group space-y-2">
                <div className="pw-option-group-heading flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <span className="pw-option-group-icon" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                    <span><Tx>{formatOptionGroupHeading(group)}</Tx>
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">{optionKindLabel(group.kind)}</span>
                    </span>
                  </h3>
                  <span className="pw-option-count text-xs text-muted-foreground">
                    {selectedInGroup > 0 ? `${selectedInGroup} seçildi` : group.minSelect > 0
                      ? `Zorunlu · ${group.minSelect}-${group.maxSelect}`
                      : `İsteğe bağlı · max ${group.maxSelect}`}
                  </span>
                </div>
                <ul className="space-y-2">
                  {(group.options ?? []).map((option) => {
                    const checked = selectedOptionIds.includes(option.optionId);
                    const disabled = !option.available;
                    return (
                      <li key={option.optionId}>
                        <button
                          type="button"
                          disabled={disabled || busy}
                          onClick={() => {
                            setSelectedOptionIds((prev) =>
                              single
                                ? toggleSingle(prev, group, option.optionId)
                                : toggleMulti(prev, group, option.optionId),
                            );
                          }}
                          className={`pw-option-button flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${
                            checked
                              ? "border-foreground bg-foreground/5"
                              : "border-border bg-background"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2 truncate font-medium">
                            <span className={`pw-option-check ${checked ? "is-checked" : ""}`} aria-hidden="true">
                              {checked ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <Tx>{option.name}</Tx>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {toNumber(option.priceDelta) === 0 ? (
                              ""
                            ) : (
                              <>
                                +
                                <MenuPriceText
                                  price={option.priceDelta}
                                  currency={product.currency || "TRY"}
                                />
                              </>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t?.cartNote ?? "Not"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              className="pw-options-note w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="pw-options-footer flex items-center justify-between gap-3">
            <div className="pw-options-quantity flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border"
                disabled={busy || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border"
                disabled={busy}
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              disabled={!valid || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const failure = await onConfirm({
                    selectedOptionIds,
                    quantity,
                    note: note.trim() || undefined,
                  });
                  if (!failure) onOpenChange(false);
                } finally {
                  setBusy(false);
                }
              }}
              className="pw-options-submit inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {(t?.addToCart ?? "Sepete Ekle") + ` · ${lineLabel}`}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
