/** Spesifik ürün / kategori isteği (genel öneri değil). Ham metin; normalize yok. */
export function isSpecificUserQuery(userQuery?: string | null): boolean {
  const q = userQuery?.trim() ?? "";
  if (!q) return false;
  if (/genel\s+(ürün\s+)?öneri|genel\s+menü|genel\s+öneri/i.test(q)) return false;
  return true;
}
