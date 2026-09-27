/** Raw "Yemekler: A, B" dumps only — not a chef paragraph that happens to use a colon. */
export function looksLikeInlineProductList(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/—/.test(trimmed) || trimmed.length > 220) return false;
  if (/(Yemekler|Kokteyller|İçecekler|Tatlılar|Desserts)\s*:\s*.+,.+/i.test(trimmed)) {
    return true;
  }
  const colonLists = trimmed.split(/[.!?\n]/).filter((part) => /:\s*[^:]+\s*,\s*[^:]+/.test(part));
  return colonLists.length >= 1 && trimmed.length <= 160;
}

export function assistantCaptionForProductReply(
  reply: string | undefined,
  productCount: number,
  fallback = "Menüde uygun ürün bulamadım. Başka bir şekilde sorabilir misiniz?",
): string {
  const trimmed = reply?.trim();
  if (productCount === 0) {
    return trimmed || fallback;
  }
  return trimmed || "Kartlarda uygun seçenekleri gösteriyorum.";
}

function looksLikeInlineMenuComboList(text: string): boolean {
  const trimmed = text.trim();
  if (!/(Yemek|İçecek|Tatlı)\s*:/i.test(trimmed)) return false;
  const segments = trimmed.split(/[.!?\n]/).filter((part) => /:/.test(part));
  return segments.length >= 2 || trimmed.length > 80;
}

export function assistantCaptionForMenuReply(
  reply: string | undefined,
  menuCount: number,
  fallback = "Size uygun menü kombinasyonları hazırladım.",
): string {
  if (menuCount === 0) {
    return reply?.trim() || fallback;
  }
  const trimmed = reply?.trim();
  if (
    trimmed &&
    !looksLikeInlineProductList(trimmed) &&
    !looksLikeInlineMenuComboList(trimmed)
  ) {
    return trimmed;
  }
  return trimmed || fallback;
}
