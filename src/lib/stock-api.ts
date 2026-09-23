import { z } from "zod";

import { ApiError } from "@/lib/api/errors";

export const STOCK_UNITS = ["ADET", "G", "KG", "ML", "L"] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

export const STOCK_UNIT_LABELS: Record<StockUnit, string> = {
  ADET: "Adet",
  G: "Gram",
  KG: "Kilogram",
  ML: "Mililitre",
  L: "Litre",
};

export const MANUAL_MOVEMENT_KINDS = ["IN", "OUT", "ADJUST"] as const;
export type ManualMovementKind = (typeof MANUAL_MOVEMENT_KINDS)[number];

export const MOVEMENT_KIND_LABELS: Record<string, string> = {
  IN: "Giriş",
  OUT: "Çıkış",
  ADJUST: "Düzeltme",
  SALE: "Satış",
  SALE_REVERSAL: "İade",
};

const quantitySchema = z.union([z.number(), z.string()]);

const ingredientSchema = z.object({
  id: z.number(),
  branchId: z.number(),
  name: z.string(),
  unit: z.enum(STOCK_UNITS),
  quantity: quantitySchema,
  minQuantity: quantitySchema,
  lowStock: z.boolean(),
});

const pageSchema = <TItem extends z.ZodType>(item: TItem) =>
  z.object({
    content: z.array(item),
    page: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
  });

const ingredientPageSchema = pageSchema(ingredientSchema);

const movementSchema = z.object({
  id: z.number(),
  ingredientId: z.number(),
  kind: z.string(),
  quantityDelta: quantitySchema,
  balanceAfter: quantitySchema,
  sourceType: z.string(),
  sourceId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

const movementPageSchema = pageSchema(movementSchema);

const recipeLineSchema = z.object({
  id: z.number(),
  ingredientId: z.number(),
  ingredientName: z.string().nullable().optional(),
  unit: z.enum(STOCK_UNITS).nullable().optional(),
  quantityPerSale: quantitySchema,
});

const recipeSchema = z.object({
  productId: z.number(),
  branchId: z.number().nullable().optional(),
  lines: z.array(recipeLineSchema),
});

export type StockIngredient = z.infer<typeof ingredientSchema>;
export type StockIngredientPage = z.infer<typeof ingredientPageSchema>;
export type StockMovement = z.infer<typeof movementSchema>;
export type StockMovementPage = z.infer<typeof movementPageSchema>;
export type StockRecipe = z.infer<typeof recipeSchema>;

export type IngredientPayload = {
  name: string;
  unit: StockUnit;
  quantity: string;
  minQuantity: string;
};

export type IngredientUpdatePayload = {
  name: string;
  unit: StockUnit;
  minQuantity: string;
};

export type MovementPayload = {
  kind: ManualMovementKind;
  quantity: string;
  note?: string;
};

export type RecipeLinePayload = {
  ingredientId: number;
  quantityPerSale: string;
};

async function request<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      data != null && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "Stok isteği başarısız";
    throw new ApiError(response.status, message, data);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(response.status, "Stok yanıtı okunamadı");
  }
  return parsed.data;
}

export function listIngredients(
  branchId: number,
  query: { lowOnly?: boolean; page?: number; size?: number },
): Promise<StockIngredientPage> {
  const params = new URLSearchParams({
    lowOnly: String(query.lowOnly ?? false),
    page: String(query.page ?? 0),
    size: String(query.size ?? 20),
  });
  return request(
    `/api/stock/branches/${branchId}/ingredients?${params.toString()}`,
    ingredientPageSchema,
  );
}

export function createIngredient(branchId: number, payload: IngredientPayload): Promise<StockIngredient> {
  return request(`/api/stock/branches/${branchId}/ingredients`, ingredientSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIngredient(ingredientId: number, payload: IngredientUpdatePayload): Promise<StockIngredient> {
  return request(`/api/stock/ingredients/${ingredientId}`, ingredientSchema, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteIngredient(ingredientId: number): Promise<void> {
  const response = await fetch(`/api/stock/ingredients/${ingredientId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    const data: unknown = text ? JSON.parse(text) : null;
    const message =
      data != null && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "Hammadde silinemedi";
    throw new ApiError(response.status, message, data);
  }
}

export function listMovements(ingredientId: number, page = 0): Promise<StockMovementPage> {
  return request(
    `/api/stock/ingredients/${ingredientId}/movements?page=${page}&size=20`,
    movementPageSchema,
  );
}

export function recordMovement(ingredientId: number, payload: MovementPayload): Promise<StockMovement> {
  return request(`/api/stock/ingredients/${ingredientId}/movements`, movementSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRecipe(productId: number): Promise<StockRecipe> {
  return request(`/api/menu/products/${productId}/recipe`, recipeSchema);
}

export function replaceRecipe(productId: number, lines: RecipeLinePayload[]): Promise<StockRecipe> {
  return request(`/api/menu/products/${productId}/recipe`, recipeSchema, {
    method: "PUT",
    body: JSON.stringify({ lines }),
  });
}

export function formatQuantity(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(numeric);
}
