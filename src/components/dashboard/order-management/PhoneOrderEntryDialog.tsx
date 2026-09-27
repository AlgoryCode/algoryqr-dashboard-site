"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { formatMenuPrice } from "@/components/menu-templates/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMenuProductsRequest } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { STORE_QUERY_KEYS } from "@/hooks/use-store";
import {
  createPhoneOrder,
  type Merchant,
  type StorePaymentMethod,
} from "@/lib/store-api";
import { STORE_PAYMENT_METHOD_LABEL } from "@/lib/store-ui";
import { cn } from "@/lib/utils";

type PhoneOrderEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: number | null;
  merchant: Merchant | null;
  onCreated: () => void;
};

const FIELD =
  "w-full rounded-xl border border-[#d3c5ac]/55 bg-white px-3 py-2 text-sm text-[#1c1c18] outline-none placeholder:text-[#817661] focus:border-[#ffc72c]";

export function PhoneOrderEntryDialog({
  open,
  onOpenChange,
  menuId,
  merchant,
  onCreated,
}: PhoneOrderEntryDialogProps) {
  const queryClient = useQueryClient();
  const catalogMenuId = merchant?.catalogMenuId ?? menuId;
  const paymentMethods = merchant?.delivery.paymentMethods ?? [];
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressText, setAddressText] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod | "">("");
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const productsQuery = useQuery({
    queryKey: ["phone-order-products", catalogMenuId],
    enabled: open && catalogMenuId != null,
    queryFn: () => getMenuProductsRequest(catalogMenuId!),
  });

  const products = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return (productsQuery.data ?? [])
      .filter((product) => product.available !== false)
      .filter((product) => !needle || product.name.toLocaleLowerCase("tr-TR").includes(needle));
  }, [productsQuery.data, query]);

  const selected = useMemo(
    () =>
      Object.entries(quantities)
        .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
        .filter((item) => item.quantity > 0),
    [quantities],
  );

  const resolvedPayment = paymentMethod || paymentMethods[0] || "";

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setAddressText("");
    setNote("");
    setPaymentMethod("");
    setQuery("");
    setQuantities({});
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!resolvedPayment) throw new Error("Ödeme yöntemi seçin");
      return createPhoneOrder({
        customerName,
        customerPhone,
        addressText,
        paymentMethod: resolvedPayment,
        note,
        items: selected,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.orders }),
        queryClient.invalidateQueries({ queryKey: ["store-kitchen-queue"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-kitchen-queue"] }),
      ]);
      reset();
      onOpenChange(false);
      onCreated();
    },
  });

  const errorMessage =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : null;

  const setQuantity = (productId: number, next: number) => {
      setQuantities((current) => {
        const quantity = Math.max(0, next);
        if (quantity === 0) {
          return Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== productId));
        }
        return { ...current, [productId]: quantity };
      });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) createMutation.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,840px)] max-w-2xl flex-col gap-0 overflow-hidden border-[#d3c5ac]/45 bg-[#fcf9f3] p-0 text-[#1c1c18]">
        <DialogHeader className="border-b border-[#ebe8e2] px-5 py-4 text-left">
          <DialogTitle className="font-epilogue text-lg text-[#1c1c18]">Yeni Sipariş Girişi</DialogTitle>
          <DialogDescription className="text-[#615e57]">
            Telefon siparişi mutfağa düşer. Hazırlanınca kurye teslim ekranına geçer.
          </DialogDescription>
        </DialogHeader>

        {!merchant ? (
          <div className="space-y-3 px-5 py-6 text-sm text-[#4f4633]">
            <p>Telefon siparişi, online siparişle aynı mutfak ve kurye hattını kullanır. Önce mağazayı kurun.</p>
            <Link href={DASHBOARD_ROUTES.onlineOrderSetup} className="font-semibold text-[#775a00] underline">
              Online sipariş kurulumu
            </Link>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#615e57]">
                  Sipariş tipi
                </p>
                <button
                  type="button"
                  aria-pressed
                  className="rounded-full bg-[#ffc72c] px-4 py-2 text-[13px] font-bold text-[#251a00]"
                >
                  Telefon
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-[#4f4633]">Müşteri</span>
                  <input
                    required
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className={FIELD}
                    placeholder="Ad soyad"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-[#4f4633]">Telefon</span>
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className={FIELD}
                    placeholder="05xx xxx xx xx"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[#4f4633]">Teslimat adresi</span>
                <textarea
                  required
                  value={addressText}
                  onChange={(event) => setAddressText(event.target.value)}
                  className={cn(FIELD, "min-h-16 resize-y")}
                  placeholder="Mahalle, sokak, bina"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-[#4f4633]">Ödeme</span>
                  <select
                    value={resolvedPayment}
                    onChange={(event) => setPaymentMethod(event.target.value as StorePaymentMethod)}
                    className={FIELD}
                  >
                    {paymentMethods.length === 0 ? <option value="">Ödeme yöntemi yok</option> : null}
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {STORE_PAYMENT_METHOD_LABEL[method]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-[#4f4633]">Not</span>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={FIELD}
                    placeholder="Kapı kodu, zil"
                  />
                </label>
              </div>

              {merchant.delivery.minOrderAmount > 0 ? (
                <p className="text-xs text-[#615e57]">
                  Minimum sepet {formatMenuPrice(merchant.delivery.minOrderAmount, merchant.currency)}. Teslimat ücreti
                  online siparişle aynı uygulanır.
                </p>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#615e57]">Ürünler</p>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={cn(FIELD, "max-w-[220px] py-1.5")}
                    placeholder="Ürün ara"
                  />
                </div>
                {productsQuery.isLoading ? (
                  <p className="text-sm text-[#615e57]">Menü yükleniyor…</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-[#615e57]">Satıştaki ürün yok.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {products.map((product) => {
                      const quantity = quantities[product.productId] ?? 0;
                      return (
                        <li
                          key={product.productId}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#d3c5ac]/40 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{product.name}</p>
                            <p className="text-xs text-[#615e57]">
                              {formatMenuPrice(product.price ?? undefined, product.currency || merchant.currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="h-8 w-8 rounded-full border border-[#d3c5ac]/55 text-lg leading-none"
                              onClick={() => setQuantity(product.productId, quantity - 1)}
                              aria-label={`${product.name} azalt`}
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-full bg-[#ffc72c] text-lg leading-none text-[#251a00]"
                              onClick={() => setQuantity(product.productId, quantity + 1)}
                              aria-label={`${product.name} ekle`}
                            >
                              +
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {errorMessage ? <p className="text-sm font-medium text-[#ba1a1a]">{errorMessage}</p> : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#ebe8e2] px-5 py-3">
              <span className="text-sm text-[#615e57]">{selected.reduce((sum, item) => sum + item.quantity, 0)} ürün</span>
              <button
                type="submit"
                disabled={createMutation.isPending || selected.length === 0 || !resolvedPayment}
                className="rounded-full bg-[#ffc72c] px-4 py-2 text-[13px] font-bold text-[#251a00] disabled:opacity-50"
              >
                {createMutation.isPending ? "Kaydediliyor…" : "Mutfağa gönder"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
