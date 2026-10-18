import {
  MENU_THEME_PREVIEW_CATEGORIES,
  MENU_THEME_PREVIEW_PRODUCTS,
} from "@/components/menu-templates/preview-data";
import { mapMenuProductToChefItem } from "@/lib/chef/map-menu-product-to-chef-item";

import { catalogPackages, catalogProducts } from "./catalog-fixtures";

export type ApiFixtureMode = "ready" | "setup";

const OWNER_SCOPES = [
  "QR_CREATE_OWNER",
  "QR_MENU_OWNER",
  "QR_BRANCH_OWNER",
  "MENU_PRODUCT_OWNER",
  "WAITER_PANEL_OWNER",
  "SMART_ASSISTANT_OWNER",
  "SMART_SUMMARY_OWNER",
  "SMART_REPORTING_OWNER",
  "CUSTOM_DESIGN_OWNER",
  "QR_ANALYTICS_OWNER",
  "AI_MENU_IMPORT_OWNER",
  "ONLINE_ORDER_OWNER",
];

const OWNER_PRODUCTS = [
  "QR_CREATE",
  "QR_MENU",
  "QR_BRANCH",
  "MENU_PRODUCT",
  "WAITER_PANEL",
  "SMART_ASSISTANT",
  "SMART_SUMMARY",
  "SMART_REPORTING",
  "CUSTOM_DESIGN",
  "QR_ANALYTICS",
  "AI_MENU_IMPORT",
  "ONLINE_ORDER",
];

let mode: ApiFixtureMode = "ready";

export function setApiFixtureMode(next: ApiFixtureMode) {
  mode = next;
}

export function bodyForRequest(url: string): unknown {
  const path = normalizePath(url);
  if (path.includes("/reservations")) return emptyPage();
  if (path.includes("/orders")) return mode === "ready" ? pendingOrders() : [];
  return exactBody(path) ?? emptyBody();
}

function normalizePath(url: string): string {
  const noQuery = url.split("?")[0] ?? url;
  const marker = "/api/";
  const index = noQuery.indexOf(marker);
  const raw = index >= 0 ? noQuery.slice(index + marker.length - 1) : noQuery;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function exactBody(path: string): unknown | undefined {
  if (path.includes("/menu/public/") && path.includes("/products")) return publicMenuProductsPage();
  if (path.includes("/menu/public/") && path.includes("/categories")) return publicMenuCategoriesPage();
  if (path.startsWith("/menu/chef/search")) return chefAgentPreview();
  if (path.startsWith("/menu/chef/badge-search")) return chefAgentPreview();
  if (path.startsWith("/menu/chef/badges")) return chefBadgesPreview();
  if (path.startsWith("/access/context") || /\/users\/\d+\/package$/.test(path)) return sessionContext();
  if (path.startsWith("/account/payment-methods")) return paymentMethods();
  if (path.startsWith("/purchases/my/entitlements")) return [];
  if (path.startsWith("/purchases/my")) return [activePurchase()];
  if (path.startsWith("/branches")) return branches();
  if (path.startsWith("/menu/my/active")) return activeMenus();
  if (path.startsWith("/auth/token-exp")) return { accessTokenExpiresAt: null };
  if (path.startsWith("/packages")) return catalogPackages();
  if (path.startsWith("/products")) return catalogProducts();
  return undefined;
}

function sessionContext() {
  return {
    decision: "ALLOW",
    packageCode: "PRO_PACKAGE",
    packageName: "Pro",
    periodStart: null,
    periodEnd: null,
    products: OWNER_PRODUCTS,
    scopes: OWNER_SCOPES,
    entitlements: [],
    user: {
      merchantId: 1,
      firstName: "Ayşe",
      lastName: "Yılmaz",
      email: "ayse@ornek.com",
      phoneNumber: null,
      provider: "LOCAL",
      role: "OWNER",
    },
  };
}

function paymentMethods() {
  if (mode === "setup") return { items: [] };
  return {
    items: [
      {
        id: "card-1",
        cardAlias: "İşletme kartı",
        brand: "Visa",
        lastFour: "4242",
        expiryMonth: 12,
        expiryYear: 2028,
      },
    ],
  };
}

function activePurchase() {
  return {
    id: 1,
    packageName: "Pro",
    packageCode: "PRO_PACKAGE",
    status: "ACTIVE",
    purchaseType: "PAID",
    usable: true,
    expired: false,
    expiresAt: "2027-09-01T00:00:00.000Z",
  };
}

function branches() {
  if (mode === "setup") {
    return { content: [], quota: emptyQuota(), menuQuota: emptyMenuQuota() };
  }
  return {
    content: [
      {
        id: 1,
        merchantId: 1,
        name: "Kadıköy",
        grandfathered: false,
        active: true,
        menus: [{ menuId: 12, qrId: 34, businessName: "Kadıköy Menü", active: true }],
      },
    ],
    quota: emptyQuota(),
    menuQuota: emptyMenuQuota(),
  };
}

function activeMenus() {
  if (mode === "setup") return [];
  return [
    {
      menuId: 12,
      qrId: 34,
      branchId: 1,
      businessName: "Kadıköy Menü",
      themeId: "classic",
      publicUrl: "https://menu.ornek.com/kadikoy",
      active: true,
      qr: { id: 34, name: "Salon" },
    },
  ];
}

function pendingOrders() {
  return [{ status: "CONFIRMED" }, { status: "SUBMITTED" }];
}

function emptyPage() {
  return { content: [], page: 0, size: 1, totalElements: 0, totalPages: 0, hasNext: false };
}

function emptyBody(): unknown[] {
  const list: unknown[] = [];
  return Object.assign(list, {
    content: [],
    items: [],
    categories: [],
    products: [],
    orders: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 20,
    hasNext: false,
  });
}

function emptyQuota() {
  return { used: 0, allowed: 3, remaining: 3, grandfathered: 0, extraPurchased: 0, canCreate: true };
}

function emptyMenuQuota() {
  return { extraUsed: 0, extraAllowed: 3, extraRemaining: 3, canCreateExtra: true };
}

function publicMenuProductsPage() {
  const content = MENU_THEME_PREVIEW_PRODUCTS;
  return {
    content,
    page: 0,
    size: content.length,
    totalElements: content.length,
    totalPages: 1,
    hasNext: false,
  };
}

function publicMenuCategoriesPage() {
  const content = MENU_THEME_PREVIEW_CATEGORIES;
  return {
    content,
    page: 0,
    size: content.length,
    totalElements: content.length,
    totalPages: 1,
    hasNext: false,
  };
}

function chefBadgesPreview() {
  return {
    welcomeMessage:
      "Merhaba! Menünüzden size en uygun lezzetleri birlikte seçelim. İsterseniz hazır menü paketlerini de önerebilirim.",
    badges: [
      { id: "chef_recommended", label: "Şefin önerisi", filter: { type: "chefRecommended" } },
      { id: "popular", label: "En popüler", filter: { type: "popularByRating" } },
      { id: "meat", label: "Deniz ürünleri", filter: { type: "mainCategoryId", mainCategoryId: 2 } },
    ],
  };
}

function chefAgentPreview() {
  const catalog = MENU_THEME_PREVIEW_PRODUCTS;
  const products = catalog.slice(1, 5).map(mapMenuProductToChefItem);
  return {
    reply: "Akşam için birkaç ürün seçtim — kartlara dokunarak inceleyebilirsiniz.",
    conversationId: "storybook-chef-preview",
    products,
    menuSuggestions: [],
  };
}
