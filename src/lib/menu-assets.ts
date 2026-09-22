export function resolveMenuHeroImage(
  coverUrl: string | null | undefined,
  fallback: string,
): string {
  const fromMenu = coverUrl?.trim();
  if (fromMenu) return fromMenu;
  return fallback.trim();
}

export function resolveMenuLogoUrl(logoUrl: string | null | undefined): string | null {
  const fromMenu = logoUrl?.trim();
  return fromMenu || null;
}
