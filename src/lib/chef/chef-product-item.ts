export type ChefProductItem = {
  productId: number;
  menuId: number;
  name: string;
  description: string | null;
  subCategoryId: number | null;
  subCategoryName?: string | null;
  mainCategoryName?: string | null;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  available: boolean;
  chefRecommended?: boolean;
  allergens?: string[];
  nutrition?: Record<string, unknown> | null;
};
