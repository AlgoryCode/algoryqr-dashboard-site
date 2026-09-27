export type ChefPriceBand = {
  min?: number;
  max?: number;
};

export function inferChefPriceBandFromMessage(message: string): ChefPriceBand | null {
  const lower = message.toLowerCase().replace(/₺/g, " tl ");

  const under = lower.match(/(\d{2,4})\s*(?:tl|lira)?\s*(?:altı|altinda|altında|under|max)/);
  if (under) {
    const max = Number.parseInt(under[1], 10);
    if (Number.isFinite(max)) return { max };
  }

  const over = lower.match(/(\d{2,4})\s*(?:tl|lira)?\s*(?:üstü|ustu|üzeri|above|min)/);
  if (over) {
    const min = Number.parseInt(over[1], 10);
    if (Number.isFinite(min)) return { min };
  }

  if (/\b(ucuz|ekonomik|bütçe|budget|cheap)\b/.test(lower)) {
    return { max: 250 };
  }
  if (/\b(premium|lüks|luxury|özel)\b/.test(lower)) {
    return { min: 400 };
  }

  return null;
}

export function productPriceValue(product: { price?: number | string | null }): number | null {
  const raw = product.price;
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

export function filterChefProductsByPriceBand<T extends { price?: number | string | null }>(
  products: T[],
  band: ChefPriceBand | null,
): T[] {
  if (!band) return products;
  const filtered = products.filter((item) => {
    const price = productPriceValue(item);
    if (price == null) return true;
    if (band.min != null && price < band.min) return false;
    if (band.max != null && price > band.max) return false;
    return true;
  });
  return filtered.length > 0 ? filtered : products;
}
