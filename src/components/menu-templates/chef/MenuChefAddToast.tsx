"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type MenuChefAddToastProps = {
  open: boolean;
  message?: string;
  onOpenCart?: () => void;
  onDismiss: () => void;
};

export function MenuChefAddToast({
  open,
  message = "Sepete eklendi",
  onOpenCart,
  onDismiss,
}: MenuChefAddToastProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="pointer-events-auto fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[120] w-[min(22rem,calc(100%-2rem))] -translate-x-1/2"
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-[#1c2824]/95 px-4 py-3 text-white shadow-lg backdrop-blur-md">
            <p className="text-[13px] font-medium">{message}</p>
            <div className="flex shrink-0 items-center gap-2">
              {onOpenCart ? (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium hover:bg-white/25"
                >
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                  Sepete git
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDismiss}
                className="text-[12px] text-white/70 hover:text-white"
              >
                Kapat
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
