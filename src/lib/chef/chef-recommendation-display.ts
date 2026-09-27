/** Avoid showing long agent product lists when we render product cards. */
export function looksLikeInlineProductList(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 100) return true;
  if (/Dengeli kombinasyon|Kokteyl|Yemekler:|İçecek|tatlı/i.test(trimmed) && trimmed.includes(",")) {
    return true;
  }
  const colonLists = trimmed.split(/[.!?\n]/).filter((part) => part.includes(":") && part.includes(","));
  return colonLists.length >= 1;
}

export function assistantCaptionForProductReply(
  reply: string | undefined,
  productCount: number,
  fallback = "Menüde uygun ürün bulamadım. Başka bir şekilde sorabilir misiniz?",
): string {
  if (productCount === 0) {
    return reply?.trim() || fallback;
  }
  const trimmed = reply?.trim();
  if (trimmed && trimmed.length <= 100 && !looksLikeInlineProductList(trimmed)) {
    return trimmed;
  }
  return "Size özel seçtiklerim — detay için karta dokunun.";
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
    trimmed.length <= 100 &&
    !looksLikeInlineProductList(trimmed) &&
    !looksLikeInlineMenuComboList(trimmed)
  ) {
    return trimmed;
  }
  return "Tam menü önerilerim aşağıda — sepete tek dokunuşla ekleyebilirsiniz.";
}
