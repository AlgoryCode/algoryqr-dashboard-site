"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { MenuProductApiItem } from "@/lib/api";

const ChefChatCatalogContext = createContext<MenuProductApiItem[]>([]);

export function ChefChatCatalogProvider({
  catalog,
  children,
}: {
  catalog: MenuProductApiItem[];
  children: ReactNode;
}) {
  return (
    <ChefChatCatalogContext.Provider value={catalog}>{children}</ChefChatCatalogContext.Provider>
  );
}

export function useChefChatCatalogProducts() {
  return useContext(ChefChatCatalogContext);
}
