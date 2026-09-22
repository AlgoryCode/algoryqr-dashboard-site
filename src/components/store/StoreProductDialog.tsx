"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { StoreCartOption } from "@/lib/store-cart";
import type { StorePublicProduct } from "@/lib/store-public";
import { formatStoreAmount } from "@/lib/store-ui";

export function StoreProductDialog({
  product,
  currency,
  onClose,
  onAdd,
}: {
  product: StorePublicProduct;
  currency: string;
  onClose: () => void;
  onAdd: (options: StoreCartOption[], note: string | null, quantity: number) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  const toggleOption = (groupId: number, optionId: number, maxSelect: number) => {
    setSelected((current) => {
      const group = current[groupId] ?? [];
      if (group.includes(optionId)) {
        return { ...current, [groupId]: group.filter((entry) => entry !== optionId) };
      }
      if (maxSelect <= 1) {
        return { ...current, [groupId]: [optionId] };
      }
      if (group.length >= maxSelect) {
        return current;
      }
      return { ...current, [groupId]: [...group, optionId] };
    });
  };

  const groups = product.optionGroups ?? [];

  const selectedOptions: StoreCartOption[] = groups.flatMap((group) =>
    (selected[group.groupId] ?? []).flatMap((optionId) => {
      const option = (group.options ?? []).find((entry) => entry.optionId === optionId);
      if (!option) return [];
      return [
        {
          groupId: group.groupId,
          groupName: group.name,
          optionId: option.optionId,
          optionName: option.name,
          priceDelta: option.priceDelta ?? 0,
        },
      ];
    }),
  );

  const missingRequired = groups.filter(
    (group) => group.minSelect > 0 && (selected[group.groupId]?.length ?? 0) < group.minSelect,
  );

  const unitTotal =
    (product.price ?? 0) + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-neutral-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{product.name}</h2>
            {product.description ? (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {product.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {groups.map((group) => (
          <fieldset key={group.groupId} className="mt-5">
            <legend className="text-sm font-medium">
              {group.name}
              {group.minSelect > 0 ? <span className="text-rose-600"> *</span> : null}
              {group.maxSelect > 1 ? (
                <span className="ml-1 text-xs font-normal text-neutral-500">
                  (en fazla {group.maxSelect})
                </span>
              ) : null}
            </legend>
            <div className="mt-2 space-y-1.5">
              {(group.options ?? []).map((option) => {
                const checked = (selected[group.groupId] ?? []).includes(option.optionId);
                return (
                  <label
                    key={option.optionId}
                    className={
                      option.available
                        ? "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
                        : "flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 opacity-50 dark:border-neutral-800"
                    }
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <input
                        type={group.maxSelect <= 1 ? "radio" : "checkbox"}
                        name={`group-${group.groupId}`}
                        checked={checked}
                        disabled={!option.available}
                        onChange={() => toggleOption(group.groupId, option.optionId, group.maxSelect)}
                      />
                      {option.name}
                    </span>
                    {option.priceDelta ? (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        +{formatStoreAmount(option.priceDelta, currency)}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <label className="mt-5 block">
          <span className="text-sm font-medium">Not</span>
          <textarea
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Örn. soğansız olsun"
            className="mt-1 min-h-[70px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
          />
        </label>

        <div className="mt-5 flex items-center gap-3">
          <span className="inline-flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              aria-label="Azalt"
              onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
              className="px-3 py-1.5"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              aria-label="Artır"
              onClick={() => setQuantity((current) => current + 1)}
              className="px-3 py-1.5"
            >
              +
            </button>
          </span>
          <button
            type="button"
            disabled={missingRequired.length > 0}
            onClick={() => onAdd(selectedOptions, note.trim() || null, quantity)}
            className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Sepete ekle · {formatStoreAmount(unitTotal * quantity, currency)}
          </button>
        </div>

        {missingRequired.length > 0 ? (
          <p className="mt-2 text-xs text-rose-600">
            Zorunlu seçim: {missingRequired.map((group) => group.name).join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
