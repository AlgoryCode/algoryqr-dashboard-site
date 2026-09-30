import { describe, expect, it } from "vitest";

import {
  buildDashboardBreadcrumbs,
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_ROUTES,
  isDashboardNavActive,
  isIntegrationsSectionActive,
  isOnlineOrderSectionActive,
  isRestaurantLayoutPath,
  parseBranchDetailId,
  parseBranchSettingsId,
  parseRestaurantLayoutBranchId,
  splitMobileDashboardNav,
} from "./dashboard-routes";
import { applyListQueryParams } from "@/hooks/use-list-query-state";

describe("dashboard report routes", () => {
  it("builds branch analytics urls", () => {
    expect(DASHBOARD_ROUTES.reportsHub).toBe("/dashboard/raporlar");
    expect(DASHBOARD_ROUTES.analytics).toBe(DASHBOARD_ROUTES.reportsHub);
    expect(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(4)).toBe(
      "/dashboard/raporlar?branch=4",
    );
    expect(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(4, 12)).toBe(
      "/dashboard/raporlar?branch=4&qr=12",
    );
  });
});

describe("restaurant layout under branch settings", () => {
  it("nests the layout page under branch settings", () => {
    expect(DASHBOARD_ROUTES.restaurantLayoutForBranch(16)).toBe(
      "/dashboard/dijital-menu/subeler/16/ayarlar/restoran-duzeni",
    );
    expect(DASHBOARD_ROUTES.restaurantLayoutForBranch(16, 20)).toBe(
      "/dashboard/dijital-menu/subeler/16/ayarlar/restoran-duzeni?qr=20",
    );
  });

  it("parses branch settings vs nested layout paths", () => {
    expect(DASHBOARD_ROUTES.branchDetail(16)).toBe("/dashboard/dijital-menu/subeler/16");
    expect(parseBranchDetailId("/dashboard/dijital-menu/subeler/16")).toBe(16);
    expect(parseBranchDetailId("/dashboard/dijital-menu/subeler/16/ayarlar")).toBe(null);
    expect(parseBranchDetailId("/dashboard/dijital-menu/subeler/yeni")).toBe(null);
    expect(parseBranchSettingsId("/dashboard/dijital-menu/subeler/16/ayarlar")).toBe(16);
    expect(parseBranchSettingsId("/dashboard/dijital-menu/subeler/16/ayarlar/restoran-duzeni")).toBe(
      null,
    );
    expect(
      parseRestaurantLayoutBranchId("/dashboard/dijital-menu/subeler/16/ayarlar/restoran-duzeni"),
    ).toBe(16);
    expect(isRestaurantLayoutPath("/dashboard/dijital-menu/subeler/16/ayarlar/restoran-duzeni")).toBe(
      true,
    );
    expect(isRestaurantLayoutPath("/dashboard/dijital-menu/subeler/16/ayarlar")).toBe(false);
  });
});

describe("integrations routes", () => {
  it("exposes hub and partner console paths under Uber Eats", () => {
    expect(DASHBOARD_ROUTES.integrations).toBe("/dashboard/entegrasyonlar");
    expect(DASHBOARD_ROUTES.yemekSepeti).toBe("/dashboard/entegrasyonlar/yemek-sepeti");
    expect(DASHBOARD_ROUTES.yemekSepetiOrders).toBe(
      "/dashboard/entegrasyonlar/yemek-sepeti/siparisler",
    );
    expect(DASHBOARD_ROUTES.printer).toBe("/dashboard/entegrasyonlar/yazici");
    expect(DASHBOARD_ROUTES.uberEats).toBe("/dashboard/uber-eats");
    expect(DASHBOARD_ROUTES.uberEatsProducts).toBe("/dashboard/uber-eats/urunler");
    expect(DASHBOARD_ROUTES.uberEatsOrders).toBe("/dashboard/uber-eats/siparisler");
    expect(DASHBOARD_ROUTES.uberEatsPending).toBe("/dashboard/uber-eats/onay-bekleyen");
    expect(DASHBOARD_ROUTES.uberEatsMenuSync).toBe("/dashboard/uber-eats/menu-senkron");
  });
});

describe("online order routes", () => {
  it("exposes the store panel paths", () => {
    expect(DASHBOARD_ROUTES.onlineOrder).toBe("/dashboard/online-siparis");
    expect(DASHBOARD_ROUTES.onlineOrderSetup).toBe("/dashboard/online-siparis/kurulum");
    expect(DASHBOARD_ROUTES.onlineOrderOrders).toBe("/dashboard/online-siparis/siparisler");
    expect(DASHBOARD_ROUTES.onlineOrderDetail(42)).toBe("/dashboard/online-siparis/siparisler/42");
    expect(DASHBOARD_ROUTES.onlineOrderProducts).toBe("/dashboard/online-siparis/urunler");
    expect(DASHBOARD_ROUTES.onlineOrderCouriers).toBe("/dashboard/online-siparis/kuryeler");
    expect(DASHBOARD_ROUTES.onlineOrderSettings).toBe("/dashboard/online-siparis/ayarlar");
  });

  it("targets a store menu instead of a qr for catalog product pages", () => {
    expect(DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(9)).toBe(
      "/dashboard/dijital-menu/urunler/yeni?menu=9",
    );
    expect(DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(9, 3)).toBe(
      "/dashboard/dijital-menu/urunler/yeni?menu=9&category=3",
    );
    expect(DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(7, 9)).toBe(
      "/dashboard/dijital-menu/urunler/7?menu=9",
    );
  });

  it("keeps the store section inside the integrations nav branch", () => {
    expect(isOnlineOrderSectionActive("/dashboard/online-siparis/siparisler/8")).toBe(true);
    expect(isOnlineOrderSectionActive("/dashboard/entegrasyonlar")).toBe(false);
    expect(isIntegrationsSectionActive("/dashboard/online-siparis/kuryeler")).toBe(true);
  });

  it("builds breadcrumbs down to the order detail", () => {
    expect(
      buildDashboardBreadcrumbs("/dashboard/online-siparis/siparisler/8", "Sipariş #S-8").map(
        (crumb) => crumb.label,
      ),
    ).toEqual(["Genel Bakış", "Entegrasyonlar", "Online Sipariş", "Siparişler", "Sipariş #S-8"]);
    expect(
      buildDashboardBreadcrumbs("/dashboard/online-siparis/kuryeler").map((crumb) => crumb.label),
    ).toEqual(["Genel Bakış", "Entegrasyonlar", "Online Sipariş", "Kuryeler"]);
  });
});

describe("kitchen monitor routes", () => {
  it("keeps external kitchen and courier app URLs", () => {
    expect(DASHBOARD_ROUTES.kitchenMonitor).toBe("/dashboard/garson/mutfak");
    expect(DASHBOARD_ROUTES.kitchenPanel).toBe("http://localhost:3004/mutfak");
    expect(DASHBOARD_ROUTES.kitchenLogin).toBe("http://localhost:3004/mutfak/giris");
    expect(DASHBOARD_ROUTES.courierPanel).toBe("http://localhost:3005/kurye");
    expect(DASHBOARD_ROUTES.courierLogin).toBe("http://localhost:3005/kurye/giris");
  });

  it("opens the owner kitchen screen on the dashboard origin", () => {
    expect(DASHBOARD_ROUTES.kitchenScreen(12)).toBe("/mutfak?branch=12");
    expect(DASHBOARD_ROUTES.kitchenScreen()).toBe("/mutfak");
  });
});

describe("splitMobileDashboardNav", () => {
  it("keeps four primary tabs and puts the rest in overflow", () => {
    const mobileItems = DASHBOARD_NAV_ITEMS.filter((item) => !item.excludeFromMobileNav);
    const { primary, overflow } = splitMobileDashboardNav(mobileItems);
    expect(primary.map((item) => item.key)).toEqual([
      "overview",
      "myBranches",
      "reports",
      "reservations",
    ]);
    expect(overflow.map((item) => item.key)).toContain("myMenus");
    expect(overflow.map((item) => item.key)).toContain("account");
    expect(overflow.map((item) => item.key)).not.toContain("overview");
  });

  it("fills primary slots when a scoped item is missing", () => {
    const items = DASHBOARD_NAV_ITEMS.filter(
      (item) => !item.excludeFromMobileNav && item.key !== "reservations",
    );
    const { primary } = splitMobileDashboardNav(items);
    expect(primary).toHaveLength(4);
    expect(primary[0].key).toBe("overview");
    expect(primary.map((item) => item.key)).not.toContain("reservations");
  });
});

describe("module sidebar active state", () => {
  const activeKeys = (pathname: string) =>
    DASHBOARD_NAV_ITEMS.filter(
      (item) => !item.excludeFromSidebar && isDashboardNavActive(pathname, item.href, item.key),
    ).map((item) => item.key);

  it("highlights exactly one module entry per page", () => {
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuProducts)).toEqual(["products"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuCategories)).toEqual(["categories"]);
    expect(activeKeys(DASHBOARD_ROUTES.feedback)).toEqual(["feedback"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuMenus)).toEqual(["myMenus"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenu)).toEqual(["myBranches"]);
    expect(activeKeys(DASHBOARD_ROUTES.restaurantLayoutForBranch(4))).toEqual(["restaurantLayout"]);
    expect(activeKeys(DASHBOARD_ROUTES.smartReports)).toEqual(["smartReports"]);
    expect(activeKeys(DASHBOARD_ROUTES.reportsHub)).toEqual(["reports"]);
  });
});

describe("applyListQueryParams", () => {
  it("writes, updates, and removes list filters", () => {
    const current = new URLSearchParams("qr=12");
    const next = applyListQueryParams(current, { q: "ali", status: "ACTIVE", empty: "" });
    expect(next.get("qr")).toBe("12");
    expect(next.get("q")).toBe("ali");
    expect(next.get("status")).toBe("ACTIVE");
    expect(next.has("empty")).toBe(false);

    const cleared = applyListQueryParams(next, { q: null, status: undefined });
    expect(cleared.has("q")).toBe(false);
    expect(cleared.has("status")).toBe(false);
    expect(cleared.get("qr")).toBe("12");
  });
});
