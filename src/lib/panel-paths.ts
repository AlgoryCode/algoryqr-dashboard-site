/** First URL segments served by the panel's catch-all route, so the proxy can require a session for them. */
const PANEL_ROOT_SEGMENTS = new Set([
  "akilli-raporlar",
  "analitik",
  "customers",
  "deneme",
  "entegrasyonlar",
  "garson",
  "genel-bakis",
  "geri-bildirimler",
  "hesabim",
  "kampanyalar",
  "karsilama",
  "kategoriler",
  "kullanicilar",
  "menu-yonetimi",
  "menuler",
  "moduller",
  "muhasebe",
  "musteriler",
  "olustur",
  "online-siparis",
  "opsiyonlar",
  "qr",
  "qr-kodlarim",
  "raporlar",
  "restaurant-layout",
  "restoran-duzeni",
  "rezervasyonlar",
  "satin-al",
  "siparis-paneli",
  "siparislerim",
  "stok",
  "subedetay",
  "subelerim",
  "uber-eats",
  "urun-satin-al",
  "urunler",
  "users",
  "waiter-orders",
]);

/** Top-level folders of `src/app` that have their own pages and never reach the panel. */
export const PUBLIC_ROOT_SEGMENTS = new Set([
  "api",
  "auth",
  "demo",
  "demo-kurulum",
  "kurye",
  "login",
  "magaza",
  "menu",
  "mutfak",
  "payment",
  "personel",
  "register",
  "sayfa-bulunamadi",
  "store",
  "waiter",
]);

export const NOT_FOUND_PATH = "/sayfa-bulunamadi";

function rootSegment(pathname: string): string {
  return pathname.split("/")[1] ?? "";
}

export function isPanelPath(pathname: string): boolean {
  return PANEL_ROOT_SEGMENTS.has(rootSegment(pathname));
}

export function isKnownPath(pathname: string): boolean {
  const segment = rootSegment(pathname);
  return segment === "" || PANEL_ROOT_SEGMENTS.has(segment) || PUBLIC_ROOT_SEGMENTS.has(segment);
}

/** Maps a pre-flattening `/dashboard/...` or `/dijital-menu/...` address to its current one, or null if it is current. */
export function legacyPanelPath(pathname: string): string | null {
  let path = pathname;
  const hadDashboardPrefix = path === "/dashboard" || path.startsWith("/dashboard/");
  if (hadDashboardPrefix) {
    path = path.slice("/dashboard".length) || "/genel-bakis";
  }
  if (path === "/dijital-menu") return "/menu-yonetimi";
  if (path.startsWith("/dijital-menu/")) return path.slice("/dijital-menu".length);
  return hadDashboardPrefix ? path : null;
}
