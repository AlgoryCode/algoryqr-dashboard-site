import type { MenuCourseRole } from "@/lib/chef/chef-cart-coach";

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
  if (/tatlı|tatli|tatlılar|dessert|sweet|sufle|souffle|dondurma|ice\s*cream|ayva\s*tatlı/i.test(q)) {
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
  return Boolean(inferChefCourseRoleFromUserQuery(userQuery) || wantsMoreChefOptions(userQuery));
}
