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

const SWIPE_OFFSET_THRESHOLD = 56;
const SWIPE_VELOCITY_THRESHOLD = 320;

type ChefProductGalleryContextValue = {
  openGallery: (products: ChefProductItem[], startIndex: number) => void;
};

const ChefProductGalleryContext = createContext<ChefProductGalleryContextValue | null>(null);

export function ChefProductGalleryProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ChefProductItem[]>([]);
  const [index, setIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);

  const openGallery = useCallback((nextProducts: ChefProductItem[], startIndex: number) => {
    if (nextProducts.length === 0) return;
    setProducts(nextProducts);
    setIndex(Math.max(0, Math.min(startIndex, nextProducts.length - 1)));
    setSlideDirection(0);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openGallery }), [openGallery]);

  const active = products[index] ?? null;
  const canPrev = index > 0;
  const canNext = index < products.length - 1;

  const paginate = useCallback(
    (direction: -1 | 1) => {
      const next = index + direction;
      if (next < 0 || next >= products.length) return;
      setSlideDirection(direction);
      setIndex(next);
    },
    [index, products.length],
  );

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
                  className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0f1613]/60 p-4 backdrop-blur-[2px]"
                  onClick={() => setOpen(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="relative flex max-h-[min(88dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-[#f7f8f7] shadow-[0_24px_60px_rgba(28,40,36,0.32)]"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ürün detayı"
                  >
                    <div className="flex items-center justify-between border-b border-[#1c2824]/[0.06] px-4 py-3">
                      <p className="text-[13px] font-medium text-[#5f6f68]">
                        {index + 1} / {products.length}
                        {products.length > 1 ? (
                          <span className="ml-2 text-[11px] font-normal text-[#8a9a93]">
                            Kaydırarak gezin
                          </span>
                        ) : null}
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

                    <div className="relative min-h-0 flex-1 overflow-hidden">
                      {products.length > 1 ? (
                        <>
                          <button
                            type="button"
                            disabled={!canPrev}
                            onClick={() => paginate(-1)}
                            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2a3833] shadow-md disabled:opacity-0 sm:inline-flex"
                            aria-label="Önceki ürün"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            disabled={!canNext}
                            onClick={() => paginate(1)}
                            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#2a3833] shadow-md disabled:opacity-0 sm:inline-flex"
                            aria-label="Sonraki ürün"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      ) : null}

                      <div className="h-full overflow-y-auto overscroll-contain px-4 py-4 touch-pan-y">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={active.productId}
                            initial={{ opacity: 0, x: slideDirection * 72 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: slideDirection * -72 }}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            drag={products.length > 1 ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.18}
                            onDragEnd={(_, info) => {
                              const swipe = info.offset.x + info.velocity.x * 0.15;
                              if (swipe > SWIPE_OFFSET_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD) {
                                if (canPrev) paginate(-1);
                                return;
                              }
                              if (
                                swipe < -SWIPE_OFFSET_THRESHOLD ||
                                info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
                              ) {
                                if (canNext) paginate(1);
                              }
                            }}
                            className={
                              products.length > 1
                                ? "cursor-grab touch-pan-y active:cursor-grabbing"
                                : undefined
                            }
                          >
                            <MenuChefProductDetailPane item={active} />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>

                    {products.length > 1 ? (
                      <div className="flex items-center justify-center gap-1.5 border-t border-[#1c2824]/[0.06] px-3 py-3">
                        {products.map((product, dotIndex) => (
                          <button
                            key={product.productId}
                            type="button"
                            onClick={() => {
                              setSlideDirection(dotIndex > index ? 1 : -1);
                              setIndex(dotIndex);
                            }}
                            className={`h-1.5 rounded-full transition-all ${
                              dotIndex === index
                                ? "w-5 bg-[#2a3833]"
                                : "w-1.5 bg-[#1c2824]/20"
                            }`}
                            aria-label={`Ürün ${dotIndex + 1}`}
                          />
                        ))}
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
