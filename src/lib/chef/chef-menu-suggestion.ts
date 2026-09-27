import type { ChefProductItem } from "./chef-product-item";

export type ChefMenuSuggestionRole = "food" | "drink" | "dessert";

export type ChefMenuSuggestionLine = {
  role: ChefMenuSuggestionRole;
  product: ChefProductItem;
};

export type ChefMenuSuggestion = {
  id: string;
  anchorProductId: number;
  label: string;
  lines: ChefMenuSuggestionLine[];
  totalPrice: number | null;
  currency: string;
};

export const CHEF_MENU_ROLE_LABELS: Record<ChefMenuSuggestionRole, string> = {
  food: "Yemek",
  drink: "İçecek",
  dessert: "Tatlı",
};
