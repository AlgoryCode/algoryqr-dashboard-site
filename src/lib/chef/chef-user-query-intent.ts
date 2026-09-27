import type { MenuCourseRole } from "@/lib/chef/chef-cart-coach";

/** Belirli ürünün yanına / uyumlu eşlik önerisi. */
export function isPairingUserQuery(userQuery?: string | null): boolean {
  const q = userQuery?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (!q) return false;
  return /yanında|yanina|yanına|ile\s+birlikte|eşlik|eslik|uyumlu|tamamlayıcı|tamamlayici|pairing|goes\s+with|ne\s+önerirsin|onerirsin|what\s+goes|what\s+with/i.test(
    q,
  );
}

/** Misafir daha fazla / alternatif seçenek istiyor. */
export function wantsMoreChefOptions(userQuery?: string | null): boolean {
  const q = userQuery?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (!q) return false;
  return /başka|baska|daha\s+fazla|farklı|farkli|other|another|yok\s*mu|var\s*mı|var\s*mi|hepsi|tümü|tumu|listele|göster|goster/i.test(
    q,
  );
}

/** Kategori / kurs niyeti (tatlı, içecek, ana yemek). */
export function inferChefCourseRoleFromUserQuery(
  userQuery?: string | null,
): MenuCourseRole | null {
  const q = userQuery?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (!q) return null;
  if (isPairingUserQuery(q)) return null;
  if (/^(tatlı|tatli|tatlılar|dessert|sweets?)\s*[.?]?$/i.test(q)) {
    return "dessert";
  }
  if (/tatlı\s+var|var\s+mı.*tatlı|var\s+mi.*tatli|başka\s+tatlı|baska\s+tatli|daha\s+tatlı/i.test(q)) {
    return "dessert";
  }
  if (
    /içecek|icecek|içecekler|drink|kokteyl|cocktail|kola|cola|meşrubat|mesrubat|serin/i.test(q)
  ) {
    return "drink";
  }
  if (/ana\s*yemek|yemekler|food|etli|köfte|kofte|pirzola/i.test(q)) {
    return "food";
  }
  return null;
}

export function shouldShowFullCourseCatalog(userQuery?: string | null): boolean {
  if (isPairingUserQuery(userQuery)) return false;
  return Boolean(inferChefCourseRoleFromUserQuery(userQuery) || wantsMoreChefOptions(userQuery));
}
