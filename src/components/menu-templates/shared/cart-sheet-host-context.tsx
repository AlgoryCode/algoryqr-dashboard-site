"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type CartSheetHostContextValue = {
  chefChatActive: boolean;
  setChefChatActive: (active: boolean) => void;
};

const CartSheetHostContext = createContext<CartSheetHostContextValue | null>(null);

export function CartSheetHostProvider({ children }: { children: ReactNode }) {
  const [chefChatActive, setChefChatActiveState] = useState(false);
  const setChefChatActive = useCallback((active: boolean) => {
    setChefChatActiveState(active);
  }, []);

  const value = useMemo(
    () => ({ chefChatActive, setChefChatActive }),
    [chefChatActive, setChefChatActive],
  );

  return <CartSheetHostContext.Provider value={value}>{children}</CartSheetHostContext.Provider>;
}

export function useCartSheetHostOptional() {
  return useContext(CartSheetHostContext);
}
