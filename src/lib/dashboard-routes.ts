import type { ProductScope } from "@/lib/auth-user";
import { COURIER_APP_ORIGIN, KITCHEN_APP_ORIGIN, WAITER_APP_ORIGIN } from "@/lib/config";

export const DASHBOARD_ROUTES = {
  root: "/dashboard",
  overview: "/dashboard/genel-bakis",
  analytics: "/dashboard/dijital-menu/analitik",
  analyticsLegacy: "/dashboard/analitik",
  digitalMenu: "/dashboard/dijital-menu",
  digitalMenuMenus: "/dashboard/dijital-menu/menuler",
  digitalMenuProducts: "/dashboard/dijital-menu/urunler",
  digitalMenuProductCreate: "/dashboard/dijital-menu/urunler/yeni",
  digitalMenuAiImport: "/dashboard/dijital-menu/urunler/ai-import",
  digitalMenuAiImportFor: (qrId?: number | string | null) => {
    if (qrId == null || qrId === "") return "/dashboard/dijital-menu/urunler/ai-import";
    return `/dashboard/dijital-menu/urunler/ai-import?qr=${qrId}`;
  },
  digitalMenuProductCreateFor: (
    qrId?: number | string | null,
    subCategoryId?: number | string | null,
  ) => {
    const params = new URLSearchParams();
    if (qrId != null && qrId !== "") params.set("qr", String(qrId));
    if (subCategoryId != null && subCategoryId !== "") params.set("category", String(subCategoryId));
    const query = params.toString();
    return query
      ? `/dashboard/dijital-menu/urunler/yeni?${query}`
      : "/dashboard/dijital-menu/urunler/yeni";
  },
  digitalMenuProductCreateForMenu: (
    menuId: number | string,
    subCategoryId?: number | string | null,
  ) => {
    const params = new URLSearchParams({ menu: String(menuId) });
    if (subCategoryId != null && subCategoryId !== "") params.set("category", String(subCategoryId));
    return `/dashboard/dijital-menu/urunler/yeni?${params.toString()}`;
  },
  digitalMenuProductDetail: (productId: number | string, qrId: number | string) =>
    `/dashboard/dijital-menu/urunler/${productId}?qr=${qrId}`,
  digitalMenuProductDetailForMenu: (productId: number | string, menuId: number | string) =>
    `/dashboard/dijital-menu/urunler/${productId}?menu=${menuId}`,
  digitalMenuCategories: "/dashboard/dijital-menu/kategoriler",
  digitalMenuCreate: "/dashboard/dijital-menu/olustur",
  digitalMenuCreateForBranch: (branchId: number | string) =>
    `/dashboard/dijital-menu/olustur?branch=${branchId}`,
  branchCreate: "/dashboard/dijital-menu/subeler/yeni",
  branchDetail: (branchId: number | string) => `/dashboard/dijital-menu/subeler/${branchId}`,
  branchSettings: (branchId: number | string) =>
    `/dashboard/dijital-menu/subeler/${branchId}/ayarlar`,
  catalogProductCheckout: (code: string) =>
    `/dashboard/dijital-menu/urun-satin-al/${encodeURIComponent(code)}`,
  digitalMenuEdit: (qrId: number | string) => `/dashboard/dijital-menu/qr/${qrId}`,
  digitalMenuSettings: (qrId: number | string) =>
    `/dashboard/dijital-menu/qr/${qrId}/ayarlar`,
  digitalMenuProductsForQr: (qrId: number | string) =>
    `/dashboard/dijital-menu/urunler?qr=${qrId}`,
  digitalMenuCategoriesForQr: (qrId: number | string) =>
    `/dashboard/dijital-menu/kategoriler?qr=${qrId}`,
  digitalMenuAnalytics: (qrId: number | string) =>
    `/dashboard/dijital-menu/analitik?qr=${qrId}`,
  digitalMenuAnalyticsForBranch: (
    branchId: number | string,
    qrId?: number | string | null,
  ) => {
    const params = new URLSearchParams();
    params.set("branch", String(branchId));
    if (qrId != null && qrId !== "") params.set("qr", String(qrId));
    return `/dashboard/dijital-menu/analitik?${params.toString()}`;
  },
  smartReports: "/dashboard/dijital-menu/akilli-raporlar",
  smartReportDetail: (jobId: string) =>
    `/dashboard/dijital-menu/akilli-raporlar/${jobId}`,
  feedback: "/dashboard/dijital-menu/geri-bildirimler",
  feedbackForQr: (qrId: number | string) =>
    `/dashboard/dijital-menu/geri-bildirimler?qr=${qrId}`,
  reservations: "/dashboard/rezervasyonlar",
  reservationsForBranch: (branchId: number | string) =>
    `/dashboard/rezervasyonlar?branch=${branchId}`,
  reservationsForQr: (qrId: number | string) =>
    `/dashboard/rezervasyonlar?qr=${qrId}`,
  restaurantLayout: "/dashboard/dijital-menu/restaurant-layout",
  restaurantLayoutForQr: (qrId: number | string) =>
    `/dashboard/dijital-menu/restaurant-layout?qr=${qrId}`,
  restaurantLayoutForBranch: (
    branchId: number | string,
    qrId?: number | string | null,
  ) => {
    const path = `/dashboard/dijital-menu/subeler/${branchId}/ayarlar/restoran-duzeni`;
    if (qrId == null || qrId === "") return path;
    return `${path}?qr=${qrId}`;
  },
  integrations: "/dashboard/entegrasyonlar",
  yemekSepeti: "/dashboard/entegrasyonlar/yemek-sepeti",
  yemekSepetiOrders: "/dashboard/entegrasyonlar/yemek-sepeti/siparisler",
  printer: "/dashboard/entegrasyonlar/yazici",
  onlineOrder: "/dashboard/online-siparis",
  onlineOrderSetup: "/dashboard/online-siparis/kurulum",
  onlineOrderOrders: "/dashboard/online-siparis/siparisler",
  onlineOrderDetail: (orderId: number | string) =>
    `/dashboard/online-siparis/siparisler/${orderId}`,
  onlineOrderProducts: "/dashboard/online-siparis/urunler",
  onlineOrderCouriers: "/dashboard/online-siparis/kuryeler",
  onlineOrderSettings: "/dashboard/online-siparis/ayarlar",
  uberEats: "/dashboard/uber-eats",
  uberEatsProducts: "/dashboard/uber-eats/urunler",
  uberEatsOrders: "/dashboard/uber-eats/siparisler",
  uberEatsPending: "/dashboard/uber-eats/onay-bekleyen",
  uberEatsMenuSync: "/dashboard/uber-eats/menu-senkron",
  reportsHub: "/dashboard/raporlar",
  orderPanel: "/dashboard/siparis-paneli",
  muhasebe: "/dashboard/muhasebe",
  stock: "/dashboard/stok",
  stockForBranch: (branchId: number | string) => `/dashboard/stok?branch=${branchId}`,
  waiter: "/dashboard/garson",
  waiterForQr: (qrId: number | string) =>
    `/dashboard/garson?qr=${qrId}`,
  waiterOrderDetail: (orderId: number | string, qrId?: number | string | null) =>
    qrId != null && qrId !== ""
      ? `/dashboard/garson/${orderId}?qr=${qrId}`
      : `/dashboard/garson/${orderId}`,
  kitchenMonitor: "/dashboard/garson/mutfak",
  kitchenMonitorForQr: (qrId: number | string) =>
    `/dashboard/garson/mutfak?qr=${qrId}`,
  menuUsers: "/dashboard/kullanicilar",
  menuUsersForBranch: (branchId: number | string) =>
    `/dashboard/kullanicilar?branch=${branchId}`,
  menuUserDetail: (waiterId: number | string, branchId?: number | string | null) =>
    branchId != null && branchId !== ""
      ? `/dashboard/kullanicilar/${waiterId}?branch=${branchId}`
      : `/dashboard/kullanicilar/${waiterId}`,
  menuCustomers: "/dashboard/musteriler",
  menuCustomersForQr: (qrId: number | string) =>
    `/dashboard/musteriler?qr=${qrId}`,
  campaigns: "/dashboard/kampanyalar",
  campaignsCreate: "/dashboard/kampanyalar/yeni",
  campaignDetail: (campaignId: number | string) => `/dashboard/kampanyalar/${campaignId}`,
  campaignDetailForQr: (campaignId: number | string, qrId: number | string) =>
    `/dashboard/kampanyalar/${campaignId}?qr=${qrId}`,
  campaignsForQr: (qrId: number | string) =>
    `/dashboard/kampanyalar?qr=${qrId}`,
  staffGate: "/personel",
  waiterLogin: `${WAITER_APP_ORIGIN}/waiter/login`,
  waiterPanel: `${WAITER_APP_ORIGIN}/waiter`,
  kitchenLogin: `${KITCHEN_APP_ORIGIN}/mutfak/giris`,
  kitchenPanel: `${KITCHEN_APP_ORIGIN}/mutfak`,
  courierLogin: `${COURIER_APP_ORIGIN}/kurye/giris`,
  courierPanel: `${COURIER_APP_ORIGIN}/kurye`,

  digitalMenuCheckout: (packageId: number | string) =>
    `/dashboard/dijital-menu/satin-al/${packageId}`,
  qrCodes: "/dashboard/qr-kodlarim",
  qrCodesNew: "/dashboard/qr-kodlarim/yeni",
  qrCodeDetail: (id: number | string) => `/dashboard/qr-kodlarim/${id}`,
  account: "/dashboard/hesabim",
  accountSecurity: "/dashboard/hesabim/guvenlik",
  accountSessions: "/dashboard/hesabim/oturumlar",
  accountSessionsDetail: "/dashboard/hesabim/oturumlar/detay",
  accountSubscription: "/dashboard/hesabim/abonelik",
  accountPackages: "/dashboard/hesabim/abonelik/paketler",
  accountPackagesHighlight: (highlight: string) =>
    `/dashboard/hesabim/abonelik/paketler?highlight=${encodeURIComponent(highlight)}`,
  accountPlanChange: (packageId: number | string) =>
    `/dashboard/hesabim/abonelik/paket-degistir?to=${packageId}`,
  accountSubscriptionCheckout: (packageId: number | string) =>
    `/dashboard/hesabim/abonelik/satin-al/${packageId}`,
  accountCartCheckout: "/dashboard/hesabim/abonelik/sepet",
  modules: "/dashboard/moduller",
  accountPurchaseDetail: (purchaseId: number | string) =>
    `/dashboard/hesabim/abonelik/satin-alma/${purchaseId}`,
  accountPaymentHistory: "/dashboard/hesabim/odeme-gecmisi",
  accountPaymentHistoryDetail: (purchaseId: number | string) =>
    `/dashboard/hesabim/odeme-gecmisi/${purchaseId}`,
  accountPaymentMethods: "/dashboard/hesabim/kayitli-kartlarim",
  accountBillingAddresses: "/dashboard/hesabim/fatura-adreslerim",
  trialStart: "/dashboard/deneme/baslat",
  trialExpired: "/dashboard/deneme/bitti",
  demoLanding: "/demo",
  demoRegister: "/demo/register",
  welcomeOnboarding: "/dashboard/karsilama",
} as const;

export type DashboardNavKey =
  | "overview"
  | "modules"
  | "digitalMenu"
  | "uberEats"
  | "orderPanel"
  | "reservations"
  | "stock"
  | "reports"
  | "accounting"
  | "menuCustomers"
  | "campaigns"
  | "qrCodes"
  | "account";

export type DashboardNavItem = {
  key: DashboardNavKey;
  label: string;
  href: string;
  mobileLabel: string;
  requiredScope?: ProductScope;
  requiresAllowAccess?: boolean;
  badgeKey?: "pendingOrders";
};

export type DashboardNavGroup = {
  id: string;
  label: string;
  items: DashboardNavKey[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  { id: "main", label: "", items: ["overview", "modules"] },
  { id: "operations", label: "Operasyon", items: ["orderPanel", "reservations", "stock"] },
  { id: "menu", label: "Menü", items: ["digitalMenu", "campaigns", "qrCodes"] },
  { id: "integrations", label: "Entegrasyonlar", items: ["uberEats"] },
  { id: "reports", label: "Raporlar", items: ["reports"] },
  { id: "management", label: "Yönetim", items: ["accounting", "menuCustomers"] },
  { id: "account", label: "", items: ["account"] },
];

export const DASHBOARD_MOBILE_PRIMARY_KEYS: DashboardNavKey[] = [
  "overview",
  "orderPanel",
  "digitalMenu",
  "reports",
];

export function splitMobileDashboardNav(items: DashboardNavItem[]): {
  primary: DashboardNavItem[];
  overflow: DashboardNavItem[];
} {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const primary: DashboardNavItem[] = [];
  for (const key of DASHBOARD_MOBILE_PRIMARY_KEYS) {
    const item = byKey.get(key);
    if (item) primary.push(item);
  }
  for (const item of items) {
    if (primary.length >= 4) break;
    if (primary.some((entry) => entry.key === item.key)) continue;
    primary.push(item);
  }
  const primaryKeys = new Set(primary.map((item) => item.key));
  return {
    primary,
    overflow: items.filter((item) => !primaryKeys.has(item.key)),
  };
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { key: "overview", label: "Genel Bakış", mobileLabel: "Genel", href: DASHBOARD_ROUTES.overview },
  { key: "modules", label: "Modüller", mobileLabel: "Modüller", href: DASHBOARD_ROUTES.modules },
  {
    key: "digitalMenu",
    label: "Menü & Şubeler",
    mobileLabel: "Menü",
    href: DASHBOARD_ROUTES.digitalMenu,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "uberEats",
    label: "Entegrasyonlar",
    mobileLabel: "Entegrasyon",
    href: DASHBOARD_ROUTES.integrations,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "orderPanel",
    label: "Sipariş Yönetimi",
    mobileLabel: "Sipariş",
    href: DASHBOARD_ROUTES.waiter,
    requiredScope: "WAITER_PANEL_OWNER",
  },
  {
    key: "reservations",
    label: "Rezervasyonlar",
    mobileLabel: "Rezervasyon",
    href: DASHBOARD_ROUTES.reservations,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "stock",
    label: "Stok",
    mobileLabel: "Stok",
    href: DASHBOARD_ROUTES.stock,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "reports",
    label: "Raporlar",
    mobileLabel: "Raporlar",
    href: DASHBOARD_ROUTES.reportsHub,
    requiredScope: "SMART_REPORTING_OWNER",
  },
  {
    key: "accounting",
    label: "Muhasebe",
    mobileLabel: "Muhasebe",
    href: DASHBOARD_ROUTES.muhasebe,
    requiresAllowAccess: true,
  },
  {
    key: "menuCustomers",
    label: "Müşteriler",
    mobileLabel: "Müşteriler",
    href: DASHBOARD_ROUTES.menuCustomers,
    requiredScope: "WAITER_PANEL_OWNER",
  },
  {
    key: "campaigns",
    label: "Kampanyalar",
    mobileLabel: "Kampanyalar",
    href: DASHBOARD_ROUTES.campaigns,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "qrCodes",
    label: "QR Kodlarım",
    mobileLabel: "QR Kodlar",
    href: DASHBOARD_ROUTES.qrCodes,
    requiredScope: "QR_CREATE_OWNER",
  },
  { key: "account", label: "Hesabım", mobileLabel: "Hesabım", href: DASHBOARD_ROUTES.account },
];

const DASHBOARD_NAV_ITEM_BY_KEY = Object.fromEntries(
  DASHBOARD_NAV_ITEMS.map((item) => [item.key, item]),
) as Record<DashboardNavKey, DashboardNavItem>;

export function getVisibleDashboardNavGroups(
  items: DashboardNavItem[],
): { group: DashboardNavGroup; items: DashboardNavItem[] }[] {
  const visibleKeys = new Set(items.map((item) => item.key));
  return DASHBOARD_NAV_GROUPS.map((group) => ({
    group,
    items: group.items
      .map((key) => DASHBOARD_NAV_ITEM_BY_KEY[key])
      .filter((item) => visibleKeys.has(item.key)),
  })).filter((entry) => entry.items.length > 0);
}

export type DashboardBreadcrumbItem = {
  label: string;
  href?: string;
};

export function buildDashboardBreadcrumbs(
  pathname: string,
  currentLabel?: string,
): DashboardBreadcrumbItem[] {
  const crumbs: DashboardBreadcrumbItem[] = [
    { label: "Genel Bakış", href: DASHBOARD_ROUTES.overview },
  ];

  if (pathname === DASHBOARD_ROUTES.overview) {
    return [{ label: "Genel Bakış" }];
  }

  if (pathname === DASHBOARD_ROUTES.modules) {
    return [{ label: "Modüller" }];
  }

  if (isOrderPanelSectionActive(pathname)) {
    crumbs.push({ label: "Sipariş Yönetimi", href: DASHBOARD_ROUTES.waiter });
    if (pathname === DASHBOARD_ROUTES.orderPanel) {
      crumbs.push({ label: "Garson Paneli" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.waiter) {
      crumbs[crumbs.length - 1] = { label: "Sipariş Yönetimi" };
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.kitchenMonitor) {
      crumbs.push({ label: "Mutfak" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.waiter}/`)) {
      crumbs.push({ label: currentLabel ?? "Sipariş Detayı" });
      return crumbs;
    }
    return crumbs;
  }

  if (isReservationsSectionActive(pathname)) {
    crumbs.push({ label: "Rezervasyonlar" });
    return crumbs;
  }

  if (isReportsSectionActive(pathname) || pathname === DASHBOARD_ROUTES.reportsHub) {
    crumbs.push({ label: "Raporlar", href: DASHBOARD_ROUTES.reportsHub });
    if (pathname === DASHBOARD_ROUTES.reportsHub) {
      crumbs[crumbs.length - 1] = { label: "Raporlar" };
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.analytics || pathname === DASHBOARD_ROUTES.analyticsLegacy) {
      crumbs.push({ label: "Menü Analitiği" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.smartReports) {
      crumbs.push({ label: "Akıllı Raporlar" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.smartReports}/`)) {
      crumbs.push({ label: "Akıllı Raporlar", href: DASHBOARD_ROUTES.smartReports });
      crumbs.push({ label: currentLabel ?? "Rapor Detayı" });
      return crumbs;
    }
    return crumbs;
  }

  if (isIntegrationsSectionActive(pathname)) {
    crumbs.push({ label: "Entegrasyonlar", href: DASHBOARD_ROUTES.integrations });
    if (pathname === DASHBOARD_ROUTES.integrations) {
      return crumbs;
    }
    if (
      pathname === DASHBOARD_ROUTES.uberEats ||
      pathname.startsWith(`${DASHBOARD_ROUTES.uberEats}/`)
    ) {
      crumbs.push({ label: "Uber Eats", href: DASHBOARD_ROUTES.uberEats });
      if (
        pathname === DASHBOARD_ROUTES.uberEatsPending ||
        pathname === DASHBOARD_ROUTES.uberEatsProducts ||
        pathname === DASHBOARD_ROUTES.uberEatsOrders ||
        pathname === DASHBOARD_ROUTES.uberEatsMenuSync
      ) {
        const labelByPath: Record<string, string> = {
          [DASHBOARD_ROUTES.uberEatsPending]: "Onay bekleyen",
          [DASHBOARD_ROUTES.uberEatsProducts]: "Ürünler",
          [DASHBOARD_ROUTES.uberEatsOrders]: "Siparişler",
          [DASHBOARD_ROUTES.uberEatsMenuSync]: "Menü senkronu",
        };
        crumbs.push({ label: labelByPath[pathname] ?? currentLabel ?? "Uber Eats" });
      }
      return crumbs;
    }
    if (
      pathname === DASHBOARD_ROUTES.yemekSepeti ||
      pathname.startsWith(`${DASHBOARD_ROUTES.yemekSepeti}/`)
    ) {
      crumbs.push({ label: "Yemek Sepeti", href: DASHBOARD_ROUTES.yemekSepeti });
      if (pathname === DASHBOARD_ROUTES.yemekSepetiOrders) {
        crumbs.push({ label: "Siparişler" });
      }
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.printer) {
      crumbs.push({ label: "Fiş yazıcısı" });
      return crumbs;
    }
    if (isOnlineOrderSectionActive(pathname)) {
      crumbs.push({ label: "Online Sipariş", href: DASHBOARD_ROUTES.onlineOrder });
      if (pathname === DASHBOARD_ROUTES.onlineOrder) {
        crumbs[crumbs.length - 1] = { label: "Online Sipariş" };
        return crumbs;
      }
      if (pathname.startsWith(`${DASHBOARD_ROUTES.onlineOrderOrders}/`)) {
        crumbs.push({ label: "Siparişler", href: DASHBOARD_ROUTES.onlineOrderOrders });
        crumbs.push({ label: currentLabel ?? "Sipariş Detayı" });
        return crumbs;
      }
      const onlineOrderLabels: Record<string, string> = {
        [DASHBOARD_ROUTES.onlineOrderSetup]: "Kurulum",
        [DASHBOARD_ROUTES.onlineOrderOrders]: "Siparişler",
        [DASHBOARD_ROUTES.onlineOrderProducts]: "Ürünler",
        [DASHBOARD_ROUTES.onlineOrderCouriers]: "Kuryeler",
        [DASHBOARD_ROUTES.onlineOrderSettings]: "Ayarlar",
      };
      crumbs.push({ label: onlineOrderLabels[pathname] ?? currentLabel ?? "Online Sipariş" });
      return crumbs;
    }
    crumbs.push({ label: currentLabel ?? "Entegrasyon" });
    return crumbs;
  }

  if (isDigitalMenuSectionActive(pathname)) {
    crumbs.push({ label: "Menü & Şubeler", href: DASHBOARD_ROUTES.digitalMenu });
    if (pathname === DASHBOARD_ROUTES.digitalMenu) {
      crumbs[crumbs.length - 1] = { label: "Menü & Şubeler" };
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuMenus) {
      crumbs.push({ label: "Şubeler" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuProductCreate) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuProducts });
      crumbs.push({ label: "Yeni ürün" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuAiImport) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuProducts });
      crumbs.push({ label: "AI ile ekle" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenuProducts}/`)) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuProducts });
      crumbs.push({ label: currentLabel ?? "Ürün" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuProducts) {
      crumbs.push({ label: "Ürünler" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuCategories) {
      crumbs.push({ label: "Kategoriler" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.feedback) {
      crumbs.push({ label: "Geri bildirimler" });
      return crumbs;
    }
    if (isRestaurantLayoutPath(pathname)) {
      const layoutBranchId = parseRestaurantLayoutBranchId(pathname);
      if (layoutBranchId != null) {
        crumbs.push({
          label: currentLabel ?? "Şube ayarları",
          href: DASHBOARD_ROUTES.branchSettings(layoutBranchId),
        });
      }
      crumbs.push({ label: "Restoran düzeni" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuCreate) {
      crumbs.push({ label: "Menü oluştur" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.branchCreate) {
      crumbs.push({ label: "Şube oluştur" });
      return crumbs;
    }
    if (parseBranchDetailId(pathname) != null) {
      crumbs.push({ label: currentLabel ?? "Şube" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenu}/subeler/`)) {
      crumbs.push({ label: currentLabel ?? "Şube ayarları" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenu}/qr/`)) {
      if (pathname.endsWith("/ayarlar")) {
        crumbs.push({ label: currentLabel ?? "Menü", href: pathname.replace(/\/ayarlar$/, "") });
        crumbs.push({ label: "Ayarlar" });
        return crumbs;
      }
      crumbs.push({ label: currentLabel ?? "Menü" });
      return crumbs;
    }
    return crumbs;
  }

  if (pathname === DASHBOARD_ROUTES.muhasebe) {
    crumbs.push({ label: "Muhasebe" });
    return crumbs;
  }

  if (pathname === DASHBOARD_ROUTES.stock) {
    crumbs.push({ label: "Stok" });
    return crumbs;
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.menuUsers)) {
    crumbs.push({ label: "Kullanıcılar", href: DASHBOARD_ROUTES.menuUsers });
    if (pathname !== DASHBOARD_ROUTES.menuUsers) {
      crumbs.push({ label: currentLabel ?? "Kullanıcı" });
    }
    return crumbs;
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.menuCustomers)) {
    crumbs.push({ label: "Müşteriler" });
    return crumbs;
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.campaigns)) {
    crumbs.push({ label: "Kampanyalar", href: DASHBOARD_ROUTES.campaigns });
    if (pathname !== DASHBOARD_ROUTES.campaigns) {
      crumbs.push({ label: currentLabel ?? "Kampanya" });
    }
    return crumbs;
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.qrCodes)) {
    crumbs.push({ label: "QR Kodlarım", href: DASHBOARD_ROUTES.qrCodes });
    if (pathname !== DASHBOARD_ROUTES.qrCodes) {
      crumbs.push({ label: currentLabel ?? "QR Kod" });
    }
    return crumbs;
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.account)) {
    crumbs.push({ label: "Hesabım", href: DASHBOARD_ROUTES.account });
    if (pathname === DASHBOARD_ROUTES.account) {
      crumbs[crumbs.length - 1] = { label: "Hesabım" };
      return crumbs;
    }
    const accountLabels: Record<string, string> = {
      [DASHBOARD_ROUTES.accountSecurity]: "Güvenlik",
      [DASHBOARD_ROUTES.accountSessions]: "Oturumlar",
      [DASHBOARD_ROUTES.accountSessionsDetail]: "Oturum detayı",
      [DASHBOARD_ROUTES.accountSubscription]: "Abonelik",
      [DASHBOARD_ROUTES.accountPackages]: "Paketler",
      [DASHBOARD_ROUTES.accountCartCheckout]: "Sepet",
      [DASHBOARD_ROUTES.accountPaymentHistory]: "Ödeme geçmişi",
      [DASHBOARD_ROUTES.accountPaymentMethods]: "Kayıtlı kartlar",
      [DASHBOARD_ROUTES.accountBillingAddresses]: "Fatura adresleri",
    };
    if (pathname.startsWith(`${DASHBOARD_ROUTES.accountPaymentHistory}/`)) {
      crumbs.push({ label: "Ödeme geçmişi", href: DASHBOARD_ROUTES.accountPaymentHistory });
      crumbs.push({ label: currentLabel ?? "Ödeme" });
      return crumbs;
    }
    crumbs.push({ label: accountLabels[pathname] ?? currentLabel ?? "Ayar" });
    return crumbs;
  }

  return crumbs;
}

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === DASHBOARD_ROUTES.digitalMenu) {
    return isDigitalMenuSectionActive(pathname);
  }
  if (href === DASHBOARD_ROUTES.integrations) {
    return isIntegrationsSectionActive(pathname);
  }
  if (href === DASHBOARD_ROUTES.waiter) {
    return isOrderPanelSectionActive(pathname);
  }
  if (href === DASHBOARD_ROUTES.reservations) {
    return isReservationsSectionActive(pathname);
  }
  if (href === DASHBOARD_ROUTES.reportsHub) {
    return isReportsSectionActive(pathname);
  }
  if (href === DASHBOARD_ROUTES.muhasebe) {
    return pathname === DASHBOARD_ROUTES.muhasebe;
  }
  if (href === DASHBOARD_ROUTES.menuUsers) {
    return (
      pathname === DASHBOARD_ROUTES.menuUsers ||
      pathname.startsWith(`${DASHBOARD_ROUTES.menuUsers}/`)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isReportsSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.reportsHub ||
    pathname === DASHBOARD_ROUTES.analytics ||
    pathname.startsWith(`${DASHBOARD_ROUTES.analytics}/`) ||
    pathname === DASHBOARD_ROUTES.analyticsLegacy ||
    pathname === DASHBOARD_ROUTES.smartReports ||
    pathname.startsWith(`${DASHBOARD_ROUTES.smartReports}/`)
  );
}

export function isOrderPanelSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.orderPanel ||
    pathname === DASHBOARD_ROUTES.waiter ||
    pathname.startsWith(`${DASHBOARD_ROUTES.waiter}/`)
  );
}

export function isReservationsSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.reservations ||
    pathname.startsWith(`${DASHBOARD_ROUTES.reservations}/`)
  );
}

export function isIntegrationsSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.integrations ||
    pathname.startsWith(`${DASHBOARD_ROUTES.integrations}/`) ||
    pathname === DASHBOARD_ROUTES.uberEats ||
    pathname.startsWith(`${DASHBOARD_ROUTES.uberEats}/`) ||
    isOnlineOrderSectionActive(pathname)
  );
}

export function isOnlineOrderSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.onlineOrder ||
    pathname.startsWith(`${DASHBOARD_ROUTES.onlineOrder}/`)
  );
}

export function isUberEatsSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.uberEats ||
    pathname.startsWith(`${DASHBOARD_ROUTES.uberEats}/`)
  );
}

export function isDigitalMenuSectionActive(pathname: string): boolean {
  if (
    isReportsSectionActive(pathname) ||
    isOrderPanelSectionActive(pathname) ||
    isReservationsSectionActive(pathname)
  ) {
    return false;
  }
  return (
    pathname === DASHBOARD_ROUTES.digitalMenu ||
    pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenu}/`)
  );
}

function parsePositiveId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseBranchDetailId(pathname: string): number | null {
  const prefix = `${DASHBOARD_ROUTES.digitalMenu}/subeler/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest || rest.includes("/")) return null;
  return parsePositiveId(rest);
}

export function parseBranchSettingsId(pathname: string): number | null {
  const prefix = `${DASHBOARD_ROUTES.digitalMenu}/subeler/`;
  if (!pathname.startsWith(prefix)) return null;
  const [idSlug, settingsSlug, extra] = pathname.slice(prefix.length).split("/");
  if (settingsSlug !== "ayarlar" || extra) return null;
  return parsePositiveId(idSlug);
}

export function parseRestaurantLayoutBranchId(pathname: string): number | null {
  const prefix = `${DASHBOARD_ROUTES.digitalMenu}/subeler/`;
  if (!pathname.startsWith(prefix)) return null;
  const [idSlug, settingsSlug, layoutSlug, extra] = pathname.slice(prefix.length).split("/");
  if (settingsSlug !== "ayarlar" || layoutSlug !== "restoran-duzeni" || extra) return null;
  return parsePositiveId(idSlug);
}

export function isRestaurantLayoutPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.restaurantLayout ||
    pathname.startsWith(`${DASHBOARD_ROUTES.restaurantLayout}/`) ||
    parseRestaurantLayoutBranchId(pathname) != null
  );
}
