/** Türkçe eşleşme için katlanmış metin (ı/i, ş/s, ğ/g). Yalnızca katalog aramasında. */
export function foldChefText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9çğıöşü]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chefTextTokens(value: string): string[] {
  return foldChefText(value)
    .split(" ")
    .filter((part) => part.length >= 2);
}
