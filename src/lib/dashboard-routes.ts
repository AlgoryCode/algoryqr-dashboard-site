import type { ProductScope } from "@/lib/auth-user";
import { STAFF_SITE_ORIGIN } from "@/lib/config";

export const DASHBOARD_ROUTES = {
  root: "/genel-bakis",
  overview: "/genel-bakis",
  /** Canonical reports URL (same as {@link DASHBOARD_ROUTES.reportsHub}). */
  analytics: "/raporlar",
  analyticsLegacy: "/analitik",
  /** Old menu-nested reports path; kept for redirects and bookmarks. */
  analyticsMenuLegacy: "/analitik",
  digitalMenu: "/menu-yonetimi",
  myBranches: "/subelerim",
  digitalMenuMenus: "/menuler",
  digitalMenuProducts: "/urunler",
  digitalMenuProductCreate: "/urunler/yeni",
  digitalMenuAiImport: "/urunler/ai-import",
  digitalMenuAiImportFor: (qrId?: number | string | null) => {
    if (qrId == null || qrId === "") return "/urunler/ai-import";
    return `/urunler/ai-import?qr=${qrId}`;
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
      ? `/urunler/yeni?${query}`
      : "/urunler/yeni";
  },
  digitalMenuProductCreateForMenu: (
    menuId: number | string,
    subCategoryId?: number | string | null,
  ) => {
    const params = new URLSearchParams({ menu: String(menuId) });
    if (subCategoryId != null && subCategoryId !== "") params.set("category", String(subCategoryId));
    return `/urunler/yeni?${params.toString()}`;
  },
  digitalMenuProductDetail: (productId: number | string, qrId: number | string) =>
    `/urunler/${productId}?qr=${qrId}`,
  digitalMenuProductDetailForMenu: (productId: number | string, menuId: number | string) =>
    `/urunler/${productId}?menu=${menuId}`,
  digitalMenuCategories: "/kategoriler",
  digitalMenuOptions: "/opsiyonlar",
  digitalMenuCreate: "/olustur",
  digitalMenuCreateForBranch: (branchId: number | string) =>
    `/olustur?branch=${branchId}`,
  branchCreate: "/subelerim/yeni",
  branchDetail: (branchId: number | string) => `/subedetay/${branchId}`,
  branchSettings: (branchId: number | string) => `/subedetay/${branchId}/ayarlar`,
  catalogProductCheckout: (code: string) =>
    `/urun-satin-al/${encodeURIComponent(code)}`,
  digitalMenuEdit: (qrId: number | string) => `/menuler/${qrId}`,
  digitalMenuSettings: (qrId: number | string) =>
    `/menuler/${qrId}/ayarlar`,
  /** The Ürünler explorer (categories and their products) opened on one menu. */
  digitalMenuProductsForQr: (qrId: number | string) =>
    `/kategoriler?qr=${qrId}`,
  digitalMenuCategoriesForQr: (qrId: number | string) =>
    `/kategoriler?qr=${qrId}`,
  digitalMenuAnalytics: (qrId: number | string) =>
    `${DASHBOARD_ROUTES.reportsHub}?qr=${qrId}`,
  digitalMenuAnalyticsForBranch: (
    branchId: number | string,
    qrId?: number | string | null,
  ) => {
    const params = new URLSearchParams();
    params.set("branch", String(branchId));
    if (qrId != null && qrId !== "") params.set("qr", String(qrId));
    return `${DASHBOARD_ROUTES.reportsHub}?${params.toString()}`;
  },
  smartReports: "/akilli-raporlar",
  smartReportNew: "/akilli-raporlar/yeni",
  smartReportHistory: "/akilli-raporlar/gecmis",
  smartReportDetail: (jobId: string) =>
    `/akilli-raporlar/${jobId}`,
  feedback: "/geri-bildirimler",
  feedbackForQr: (qrId: number | string) =>
    `/geri-bildirimler?qr=${qrId}`,
  reservations: "/rezervasyonlar",
  reservationsForBranch: (branchId: number | string) =>
    `/rezervasyonlar?branch=${branchId}`,
  restaurantLayout: "/restaurant-layout",
  restaurantLayoutForQr: (qrId: number | string) =>
    `/restaurant-layout?qr=${qrId}`,
  restaurantLayoutForBranch: (
    branchId: number | string,
    qrId?: number | string | null,
  ) => {
    const path = `/subedetay/${branchId}/ayarlar/restoran-duzeni`;
    if (qrId == null || qrId === "") return path;
    return `${path}?qr=${qrId}`;
  },
  integrations: "/entegrasyonlar",
  yemekSepeti: "/entegrasyonlar/yemek-sepeti",
  yemekSepetiOrders: "/entegrasyonlar/yemek-sepeti/siparisler",
  printer: "/entegrasyonlar/yazici",
  onlineOrder: "/online-siparis",
  onlineOrderSetup: "/online-siparis/kurulum",
  onlineOrderOrders: "/online-siparis/siparisler",
  onlineOrderDetail: (orderId: number | string) =>
    `/online-siparis/siparisler/${orderId}`,
  onlineOrderProducts: "/online-siparis/urunler",
  onlineOrderCouriers: "/online-siparis/kuryeler",
  onlineOrderSettings: "/online-siparis/ayarlar",
  uberEats: "/uber-eats",
  uberEatsProducts: "/uber-eats/urunler",
  uberEatsOrders: "/uber-eats/siparisler",
  uberEatsPending: "/uber-eats/onay-bekleyen",
  uberEatsMenuSync: "/uber-eats/menu-senkron",
  reportsHub: "/raporlar",
  orderPanel: "/siparis-paneli",
  muhasebe: "/muhasebe",
  stock: "/stok",
  stockForBranch: (branchId: number | string) => `/stok?branch=${branchId}`,
  consoleRental: "/konsol-takip",
  waiter: "/garson",
  waiterForQr: (qrId: number | string) =>
    `/garson?qr=${qrId}`,
  waiterOrderDetail: (orderId: number | string, qrId?: number | string | null) =>
    qrId != null && qrId !== ""
      ? `/garson/${orderId}?qr=${qrId}`
      : `/garson/${orderId}`,
  kitchenMonitor: "/garson/mutfak",
  kitchenMonitorForQr: (qrId: number | string) =>
    `/garson/mutfak?qr=${qrId}`,
  menuUsers: "/kullanicilar",
  menuUsersForBranch: (branchId: number | string) =>
    `/kullanicilar?branch=${branchId}`,
  menuUserDetail: (waiterId: number | string, branchId?: number | string | null) =>
    branchId != null && branchId !== ""
      ? `/kullanicilar/${waiterId}?branch=${branchId}`
      : `/kullanicilar/${waiterId}`,
  menuCustomers: "/musteriler",
  menuCustomersForQr: (qrId: number | string) =>
    `/musteriler?qr=${qrId}`,
  campaigns: "/kampanyalar",
  campaignsCreate: "/kampanyalar/yeni",
  campaignDetail: (campaignId: number | string) => `/kampanyalar/${campaignId}`,
  campaignDetailForQr: (campaignId: number | string, qrId: number | string) =>
    `/kampanyalar/${campaignId}?qr=${qrId}`,
  campaignsForQr: (qrId: number | string) =>
    `/kampanyalar?qr=${qrId}`,
  staffGate: STAFF_SITE_ORIGIN,
  waiterLogin: STAFF_SITE_ORIGIN,
  waiterPanel: STAFF_SITE_ORIGIN,
  kitchenLogin: STAFF_SITE_ORIGIN,
  kitchenPanel: STAFF_SITE_ORIGIN,
  courierLogin: STAFF_SITE_ORIGIN,
  courierPanel: STAFF_SITE_ORIGIN,
  kitchenScreen: (branchId?: number | string | null) =>
    branchId != null && branchId !== "" ? `/mutfak?branch=${branchId}` : "/mutfak",
  orders: "/siparislerim",

  digitalMenuCheckout: (packageId: number | string) =>
    `/satin-al/${packageId}`,
  qrCodes: "/qr-kodlarim",
  qrCodesNew: "/qr-kodlarim/yeni",
  qrCodeDetail: (id: number | string) => `/qr-kodlarim/${id}`,
  account: "/hesabim",
  accountSecurity: "/hesabim/guvenlik",
  accountSessions: "/hesabim/oturumlar",
  accountSessionsDetail: "/hesabim/oturumlar/detay",
  accountSubscription: "/hesabim/abonelik",
  accountPackages: "/hesabim/abonelik/paketler",
  accountPackagesHighlight: (highlight: string) =>
    `/hesabim/abonelik/paketler?highlight=${encodeURIComponent(highlight)}`,
  accountPlanChange: (packageId: number | string) =>
    `/hesabim/abonelik/paket-degistir?to=${packageId}`,
  accountSubscriptionCheckout: (packageId: number | string) =>
    `/hesabim/abonelik/satin-al/${packageId}`,
  accountCartCheckout: "/hesabim/abonelik/sepet",
  modules: "/moduller",
  accountPurchaseDetail: (purchaseId: number | string) =>
    `/hesabim/abonelik/satin-alma/${purchaseId}`,
  accountPaymentHistory: "/hesabim/odeme-gecmisi",
  accountPaymentHistoryDetail: (purchaseId: number | string) =>
    `/hesabim/odeme-gecmisi/${purchaseId}`,
  accountPaymentMethods: "/hesabim/kayitli-kartlarim",
  accountBillingAddresses: "/hesabim/fatura-adreslerim",
  trialStart: "/deneme/baslat",
  trialExpired: "/deneme/bitti",
  demoLanding: "/demo",
  demoLogin: "/demo/login",
  demoRegister: "/demo/register",
  welcomeOnboarding: "/karsilama",
} as const;

export type DashboardNavKey =
  | "overview"
  | "modules"
  | "digitalMenu"
  | "myBranches"
  | "myMenus"
  | "products"
  | "uberEats"
  | "liveOrders"
  | "reservations"
  | "restaurantLayout"
  | "stock"
  | "consoleRental"
  | "staff"
  | "reports"
  | "smartReports"
  | "accounting"
  | "feedback"
  | "menuCustomers"
  | "campaigns"
  | "qrCodes"
  | "account";

export type DashboardNavChild = {
  key: string;
  label: string;
  href: string;
  /** Reachable from search (Ctrl K) but not listed under its parent in the sidebar or mobile menu. */
  hiddenInNav?: boolean;
};

/** The sub pages listed under a nav item in the sidebar and the mobile menu. */
export function navChildren(item: Pick<DashboardNavItem, "children">): DashboardNavChild[] {
  return (item.children ?? []).filter((child) => !child.hiddenInNav);
}

export type DashboardNavItem = {
  key: DashboardNavKey;
  label: string;
  href: string;
  mobileLabel: string;
  requiredScope?: ProductScope;
  requiresAllowAccess?: boolean;
  badgeKey?: "pendingOrders";
  /** Hidden from mobile bottom nav and “Daha fazla” sheet */
  excludeFromMobileNav?: boolean;
  /** Hidden from desktop sidebar */
  excludeFromSidebar?: boolean;
  children?: DashboardNavChild[];
};

export type DashboardNavGroup = {
  id: string;
  label: string;
  items: DashboardNavKey[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  { id: "main", label: "", items: ["overview"] },
  {
    id: "operations",
    label: "Operasyon",
    items: ["liveOrders", "reservations", "restaurantLayout", "stock", "consoleRental"],
  },
  { id: "menu", label: "Menü", items: ["myMenus", "products", "qrCodes"] },
  {
    id: "business",
    label: "İşletme",
    items: ["staff", "menuCustomers", "feedback", "campaigns"],
  },
  { id: "finance", label: "Finans ve raporlar", items: ["accounting", "reports", "smartReports"] },
  {
    id: "settings",
    label: "Ayarlar",
    items: ["myBranches", "uberEats", "modules", "account"],
  },
];

export const DASHBOARD_MOBILE_PRIMARY_KEYS: DashboardNavKey[] = [
  "overview",
  "myMenus",
  "myBranches",
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

const DIGITAL_MENU_SECTION_ROOTS = [
  DASHBOARD_ROUTES.digitalMenu,
  DASHBOARD_ROUTES.digitalMenuMenus,
  DASHBOARD_ROUTES.digitalMenuProducts,
  "/akilli-raporlar",
  "/analitik",
  "/geri-bildirimler",
  "/kategoriler",
  "/olustur",
  "/opsiyonlar",
  "/qr",
  "/restaurant-layout",
  "/satin-al",
  "/urun-satin-al",
];

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { key: "overview", label: "Genel Bakış", mobileLabel: "Genel", href: DASHBOARD_ROUTES.overview },
  { key: "modules", label: "Modüller", mobileLabel: "Modüller", href: DASHBOARD_ROUTES.modules },
  {
    key: "digitalMenu",
    label: "Menü & Şubeler",
    mobileLabel: "Menü",
    href: DASHBOARD_ROUTES.digitalMenu,
    requiredScope: "QR_MENU_OWNER",
    excludeFromMobileNav: true,
    excludeFromSidebar: true,
  },
  {
    key: "myBranches",
    label: "Şubelerim",
    mobileLabel: "Şubelerim",
    href: DASHBOARD_ROUTES.myBranches,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "myMenus",
    label: "Menülerim",
    mobileLabel: "Menü",
    href: DASHBOARD_ROUTES.digitalMenuMenus,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "products",
    label: "Ürünler",
    mobileLabel: "Ürünler",
    // The Ürünler explorer: categories (or options) in a second sidebar, their products beside it.
    href: DASHBOARD_ROUTES.digitalMenuCategories,
    requiredScope: "QR_MENU_OWNER",
    // Switched between inside the explorer itself; kept here so search still finds them.
    children: [
      {
        key: "categories",
        label: "Kategoriler",
        href: DASHBOARD_ROUTES.digitalMenuCategories,
        hiddenInNav: true,
      },
      {
        key: "options",
        label: "Opsiyonlar",
        href: DASHBOARD_ROUTES.digitalMenuOptions,
        hiddenInNav: true,
      },
    ],
  },
  {
    key: "uberEats",
    label: "Entegrasyonlar",
    mobileLabel: "Entegrasyon",
    href: DASHBOARD_ROUTES.integrations,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "liveOrders",
    label: "Siparişlerim",
    mobileLabel: "Siparişler",
    href: DASHBOARD_ROUTES.orders,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "reservations",
    label: "Rezervasyonlar",
    mobileLabel: "Rezervasyon",
    href: DASHBOARD_ROUTES.reservations,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "restaurantLayout",
    label: "Masa planı",
    mobileLabel: "Masa planı",
    href: DASHBOARD_ROUTES.restaurantLayout,
    requiredScope: "WAITER_PANEL_OWNER",
  },
  {
    key: "stock",
    label: "Stok",
    mobileLabel: "Stok",
    href: DASHBOARD_ROUTES.stock,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "consoleRental",
    label: "Konsol takip",
    mobileLabel: "Konsol",
    href: DASHBOARD_ROUTES.consoleRental,
    requiredScope: "QR_MENU_OWNER",
  },
  {
    key: "staff",
    label: "Personeller",
    mobileLabel: "Personeller",
    href: DASHBOARD_ROUTES.menuUsers,
    requiredScope: "WAITER_PANEL_OWNER",
  },
  {
    key: "reports",
    label: "Raporlar",
    mobileLabel: "Raporlar",
    href: DASHBOARD_ROUTES.reportsHub,
    requiredScope: "SMART_REPORTING_OWNER",
  },
  {
    key: "smartReports",
    label: "Akıllı raporlar",
    mobileLabel: "Akıllı rapor",
    href: DASHBOARD_ROUTES.smartReports,
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
    key: "feedback",
    label: "Yorumlar",
    mobileLabel: "Yorumlar",
    href: DASHBOARD_ROUTES.feedback,
    requiredScope: "QR_MENU_OWNER",
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

  if (isBranchesSectionActive(pathname)) {
    if (pathname === DASHBOARD_ROUTES.myBranches) {
      crumbs.push({ label: "Şubelerim" });
      return crumbs;
    }
    crumbs.push({ label: "Şubelerim", href: DASHBOARD_ROUTES.myBranches });
    if (pathname === DASHBOARD_ROUTES.branchCreate) {
      crumbs.push({ label: "Şube oluştur" });
      return crumbs;
    }
    const detailId = parseBranchDetailId(pathname);
    if (detailId != null) {
      crumbs.push({ label: currentLabel ?? "Şube detayı" });
      return crumbs;
    }
    const settingsId = parseBranchSettingsId(pathname);
    if (settingsId != null) {
      crumbs.push({ label: currentLabel ?? "Şube", href: DASHBOARD_ROUTES.branchDetail(settingsId) });
      crumbs.push({ label: "Ayarlar" });
      return crumbs;
    }
    const layoutId = parseRestaurantLayoutBranchId(pathname);
    if (layoutId != null) {
      crumbs.push({ label: currentLabel ?? "Şube ayarları", href: DASHBOARD_ROUTES.branchSettings(layoutId) });
      crumbs.push({ label: "Restoran düzeni" });
      return crumbs;
    }
    return crumbs;
  }

  if (isReservationsSectionActive(pathname)) {
    crumbs.push({ label: "Rezervasyonlar" });
    return crumbs;
  }

  if (isOrdersSectionActive(pathname)) {
    crumbs.push({ label: "Siparişlerim" });
    return crumbs;
  }

  if (isReportsSectionActive(pathname) || pathname === DASHBOARD_ROUTES.reportsHub) {
    crumbs.push({ label: "Raporlar", href: DASHBOARD_ROUTES.reportsHub });
    if (pathname === DASHBOARD_ROUTES.reportsHub) {
      crumbs[crumbs.length - 1] = { label: "Raporlar" };
      return crumbs;
    }
    if (
      pathname === DASHBOARD_ROUTES.analyticsLegacy ||
      pathname === DASHBOARD_ROUTES.analyticsMenuLegacy
    ) {
      crumbs.push({ label: "Raporlar" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.smartReports) {
      crumbs.push({ label: "Akıllı Raporlar" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.smartReports}/`)) {
      crumbs.push({ label: "Akıllı Raporlar", href: DASHBOARD_ROUTES.smartReports });
      crumbs.push({
        label:
          pathname === DASHBOARD_ROUTES.smartReportNew
            ? "Yeni Rapor"
            : pathname === DASHBOARD_ROUTES.smartReportHistory
              ? "Geçmiş Raporlar"
              : currentLabel ?? "Rapor Detayı",
      });
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
      crumbs.push({ label: "Menülerim" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuProductCreate) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuCategories });
      crumbs.push({ label: "Yeni ürün" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuAiImport) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuCategories });
      crumbs.push({ label: "AI ile ekle" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenuProducts}/`)) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuCategories });
      crumbs.push({ label: currentLabel ?? "Ürün" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuProducts) {
      crumbs.push({ label: "Ürünler" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuCategories) {
      crumbs.push({ label: "Ürünler" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuOptions) {
      crumbs.push({ label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuCategories });
      crumbs.push({ label: "Opsiyonlar" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.feedback) {
      crumbs.push({ label: "Geri bildirimler" });
      return crumbs;
    }
    if (isRestaurantLayoutPath(pathname)) {
      crumbs.push({ label: "Restoran düzeni" });
      return crumbs;
    }
    if (pathname === DASHBOARD_ROUTES.digitalMenuCreate) {
      crumbs.push({ label: "Menü Oluşturma Sihirbazı" });
      return crumbs;
    }
    if (pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenuMenus}/`)) {
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

  if (pathname === DASHBOARD_ROUTES.consoleRental) {
    crumbs.push({ label: "Konsol takip" });
    return crumbs;
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.menuUsers)) {
    crumbs.push({ label: "Personeller", href: DASHBOARD_ROUTES.menuUsers });
    if (pathname !== DASHBOARD_ROUTES.menuUsers) {
      crumbs.push({ label: currentLabel ?? "Personel" });
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

const BRANCH_DETAIL_PREFIX = "/subedetay/";

export function isBranchesSectionActive(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.myBranches ||
    pathname.startsWith(`${DASHBOARD_ROUTES.myBranches}/`) ||
    pathname.startsWith(BRANCH_DETAIL_PREFIX)
  );
}

export function isBranchesHubNavActive(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTES.digitalMenu || isBranchesSectionActive(pathname);
}

function isMenuSubsectionPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.digitalMenuProducts ||
    pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenuProducts}/`) ||
    pathname === DASHBOARD_ROUTES.digitalMenuCategories ||
    pathname === DASHBOARD_ROUTES.digitalMenuOptions ||
    pathname === DASHBOARD_ROUTES.feedback ||
    isRestaurantLayoutPath(pathname)
  );
}

export function isMenusNavActive(pathname: string): boolean {
  if (!isDigitalMenuSectionActive(pathname)) {
    return false;
  }
  return !isBranchesHubNavActive(pathname) && !isMenuSubsectionPath(pathname);
}

export function isDashboardNavActive(
  pathname: string,
  href: string,
  navKey?: DashboardNavKey,
): boolean {
  if (navKey === "myBranches") {
    return isBranchesHubNavActive(pathname) && !isRestaurantLayoutPath(pathname);
  }
  if (navKey === "myMenus") {
    return isMenusNavActive(pathname);
  }
  if (navKey === "products") {
    return (
      pathname === DASHBOARD_ROUTES.digitalMenuProducts ||
      pathname.startsWith(`${DASHBOARD_ROUTES.digitalMenuProducts}/`) ||
      pathname === DASHBOARD_ROUTES.digitalMenuCategories ||
      pathname === DASHBOARD_ROUTES.digitalMenuOptions
    );
  }
  if (navKey === "restaurantLayout") {
    return isRestaurantLayoutPath(pathname);
  }
  if (navKey === "reports") {
    return (
      isReportsSectionActive(pathname) &&
      pathname !== DASHBOARD_ROUTES.smartReports &&
      !pathname.startsWith(`${DASHBOARD_ROUTES.smartReports}/`)
    );
  }
  if (href === DASHBOARD_ROUTES.digitalMenu) {
    return isDigitalMenuSectionActive(pathname);
  }
  if (href === DASHBOARD_ROUTES.digitalMenuMenus) {
    return pathname === DASHBOARD_ROUTES.digitalMenuMenus;
  }
  if (href === DASHBOARD_ROUTES.integrations) {
    return isIntegrationsSectionActive(pathname);
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
    pathname === DASHBOARD_ROUTES.analyticsLegacy ||
    pathname === DASHBOARD_ROUTES.analyticsMenuLegacy ||
    pathname.startsWith(`${DASHBOARD_ROUTES.analyticsMenuLegacy}/`) ||
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

export function isOrdersSectionActive(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTES.orders || pathname.startsWith(`${DASHBOARD_ROUTES.orders}/`);
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
  return DIGITAL_MENU_SECTION_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

function parsePositiveId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseBranchDetailId(pathname: string): number | null {
  if (!pathname.startsWith(BRANCH_DETAIL_PREFIX)) return null;
  const rest = pathname.slice(BRANCH_DETAIL_PREFIX.length);
  if (!rest || rest.includes("/")) return null;
  return parsePositiveId(rest);
}

export function parseBranchSettingsId(pathname: string): number | null {
  if (!pathname.startsWith(BRANCH_DETAIL_PREFIX)) return null;
  const [idSlug, settingsSlug, extra] = pathname.slice(BRANCH_DETAIL_PREFIX.length).split("/");
  if (settingsSlug !== "ayarlar" || extra) return null;
  return parsePositiveId(idSlug);
}

export function parseRestaurantLayoutBranchId(pathname: string): number | null {
  if (!pathname.startsWith(BRANCH_DETAIL_PREFIX)) return null;
  const [idSlug, settingsSlug, layoutSlug, extra] = pathname
    .slice(BRANCH_DETAIL_PREFIX.length)
    .split("/");
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
