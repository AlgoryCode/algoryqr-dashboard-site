"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { ChefProductItem } from "@/lib/chef/chef-product-item";

import { MenuChefProductDetailPane } from "./MenuChefProductDetailPane";

type ChefProductGalleryContextValue = {
  openGallery: (products: ChefProductItem[], startIndex: number) => void;
};

const ChefProductGalleryContext = createContext<ChefProductGalleryContextValue | null>(null);

export function ChefProductGalleryProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ChefProductItem[]>([]);
  const [index, setIndex] = useState(0);

  const openGallery = useCallback((nextProducts: ChefProductItem[], startIndex: number) => {
    if (nextProducts.length === 0) return;
    setProducts(nextProducts);
    setIndex(Math.max(0, Math.min(startIndex, nextProducts.length - 1)));
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openGallery }), [openGallery]);

  const active = products[index] ?? null;
  const canPrev = index > 0;
  const canNext = index < products.length - 1;

  return (
    <ChefProductGalleryContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && active ? (
                <motion.div
                  key="chef-product-gallery"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0f1613]/55 p-0 sm:items-center sm:p-4"
                  onClick={() => setOpen(false)}
                >
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="relative flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.35rem] border border-white/80 bg-[#f7f8f7] shadow-[0_24px_60px_rgba(28,40,36,0.28)] sm:rounded-[1.35rem]"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ürün detayı"
                  >
                    <div className="flex items-center justify-between border-b border-[#1c2824]/[0.06] px-4 py-3">
                      <p className="text-[13px] font-medium text-[#5f6f68]">
                        {index + 1} / {products.length}
                      </p>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1c2824]/[0.05] text-[#3d4a45]"
                        aria-label="Kapat"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                      <MenuChefProductDetailPane item={active} />
                    </div>
                    {products.length > 1 ? (
                      <div className="flex items-center justify-between gap-2 border-t border-[#1c2824]/[0.06] px-3 py-3">
                        <button
                          type="button"
                          disabled={!canPrev}
                          onClick={() => setIndex((value) => Math.max(0, value - 1))}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white px-3 py-2 text-[13px] font-medium text-[#2a3833] disabled:opacity-35"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Önceki
                        </button>
                        <button
                          type="button"
                          disabled={!canNext}
                          onClick={() =>
                            setIndex((value) => Math.min(products.length - 1, value + 1))
                          }
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#2a3833] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-35"
                        >
                          Sonraki
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </ChefProductGalleryContext.Provider>
  );
}

export function useChefProductGallery() {
  const ctx = useContext(ChefProductGalleryContext);
  if (!ctx) {
    throw new Error("useChefProductGallery must be used within ChefProductGalleryProvider");
  }
  return ctx;
}

export function useChefProductGalleryOptional() {
  return useContext(ChefProductGalleryContext);
}
