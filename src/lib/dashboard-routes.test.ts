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
    expect(DASHBOARD_ROUTES.reportsHub).toBe("/raporlar");
    expect(DASHBOARD_ROUTES.analytics).toBe(DASHBOARD_ROUTES.reportsHub);
    expect(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(4)).toBe(
      "/raporlar?branch=4",
    );
    expect(DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(4, 12)).toBe(
      "/raporlar?branch=4&qr=12",
    );
  });
});

describe("restaurant layout under branch settings", () => {
  it("nests the layout page under branch settings", () => {
    expect(DASHBOARD_ROUTES.restaurantLayoutForBranch(16)).toBe(
      "/subedetay/16/ayarlar/restoran-duzeni",
    );
    expect(DASHBOARD_ROUTES.restaurantLayoutForBranch(16, 20)).toBe(
      "/subedetay/16/ayarlar/restoran-duzeni?qr=20",
    );
  });

  it("parses branch settings vs nested layout paths", () => {
    expect(DASHBOARD_ROUTES.branchDetail(16)).toBe("/subedetay/16");
    expect(parseBranchDetailId("/subedetay/16")).toBe(16);
    expect(parseBranchDetailId("/subedetay/16/ayarlar")).toBe(null);
    expect(parseBranchDetailId("/subelerim/yeni")).toBe(null);
    expect(parseBranchSettingsId("/subedetay/16/ayarlar")).toBe(16);
    expect(parseBranchSettingsId("/subedetay/16/ayarlar/restoran-duzeni")).toBe(
      null,
    );
    expect(
      parseRestaurantLayoutBranchId("/subedetay/16/ayarlar/restoran-duzeni"),
    ).toBe(16);
    expect(isRestaurantLayoutPath("/subedetay/16/ayarlar/restoran-duzeni")).toBe(
      true,
    );
    expect(isRestaurantLayoutPath("/subedetay/16/ayarlar")).toBe(false);
  });
});

describe("integrations routes", () => {
  it("exposes hub and partner console paths under Uber Eats", () => {
    expect(DASHBOARD_ROUTES.integrations).toBe("/entegrasyonlar");
    expect(DASHBOARD_ROUTES.yemekSepeti).toBe("/entegrasyonlar/yemek-sepeti");
    expect(DASHBOARD_ROUTES.yemekSepetiOrders).toBe(
      "/entegrasyonlar/yemek-sepeti/siparisler",
    );
    expect(DASHBOARD_ROUTES.printer).toBe("/entegrasyonlar/yazici");
    expect(DASHBOARD_ROUTES.uberEats).toBe("/uber-eats");
    expect(DASHBOARD_ROUTES.uberEatsProducts).toBe("/uber-eats/urunler");
    expect(DASHBOARD_ROUTES.uberEatsOrders).toBe("/uber-eats/siparisler");
    expect(DASHBOARD_ROUTES.uberEatsPending).toBe("/uber-eats/onay-bekleyen");
    expect(DASHBOARD_ROUTES.uberEatsMenuSync).toBe("/uber-eats/menu-senkron");
  });
});

describe("online order routes", () => {
  it("exposes the store panel paths", () => {
    expect(DASHBOARD_ROUTES.onlineOrder).toBe("/online-siparis");
    expect(DASHBOARD_ROUTES.onlineOrderSetup).toBe("/online-siparis/kurulum");
    expect(DASHBOARD_ROUTES.onlineOrderOrders).toBe("/online-siparis/siparisler");
    expect(DASHBOARD_ROUTES.onlineOrderDetail(42)).toBe("/online-siparis/siparisler/42");
    expect(DASHBOARD_ROUTES.onlineOrderProducts).toBe("/online-siparis/urunler");
    expect(DASHBOARD_ROUTES.onlineOrderCouriers).toBe("/online-siparis/kuryeler");
    expect(DASHBOARD_ROUTES.onlineOrderSettings).toBe("/online-siparis/ayarlar");
  });

  it("targets a store menu instead of a qr for catalog product pages", () => {
    expect(DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(9)).toBe(
      "/urunler/yeni?menu=9",
    );
    expect(DASHBOARD_ROUTES.digitalMenuProductCreateForMenu(9, 3)).toBe(
      "/urunler/yeni?menu=9&category=3",
    );
    expect(DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(7, 9)).toBe(
      "/urunler/7?menu=9",
    );
  });

  it("keeps the store section inside the integrations nav branch", () => {
    expect(isOnlineOrderSectionActive("/online-siparis/siparisler/8")).toBe(true);
    expect(isOnlineOrderSectionActive("/entegrasyonlar")).toBe(false);
    expect(isIntegrationsSectionActive("/online-siparis/kuryeler")).toBe(true);
  });

  it("builds breadcrumbs down to the order detail", () => {
    expect(
      buildDashboardBreadcrumbs("/online-siparis/siparisler/8", "Sipariş #S-8").map(
        (crumb) => crumb.label,
      ),
    ).toEqual(["Genel Bakış", "Entegrasyonlar", "Online Sipariş", "Siparişler", "Sipariş #S-8"]);
    expect(
      buildDashboardBreadcrumbs("/online-siparis/kuryeler").map((crumb) => crumb.label),
    ).toEqual(["Genel Bakış", "Entegrasyonlar", "Online Sipariş", "Kuryeler"]);
  });
});

describe("kitchen monitor routes", () => {
  it("sends staff screens to the staff site", () => {
    expect(DASHBOARD_ROUTES.kitchenMonitor).toBe("/garson/mutfak");
    expect(DASHBOARD_ROUTES.staffGate).toBe("http://localhost:3001");
    expect(DASHBOARD_ROUTES.kitchenPanel).toBe("http://localhost:3001");
    expect(DASHBOARD_ROUTES.kitchenLogin).toBe("http://localhost:3001");
    expect(DASHBOARD_ROUTES.courierPanel).toBe("http://localhost:3001");
    expect(DASHBOARD_ROUTES.courierLogin).toBe("http://localhost:3001");
  });

  it("opens the owner kitchen screen on the dashboard origin", () => {
    expect(DASHBOARD_ROUTES.kitchenScreen(12)).toBe("/mutfak?branch=12");
    expect(DASHBOARD_ROUTES.kitchenScreen()).toBe("/mutfak");
  });

  it("opens merchant orders on Siparişlerim", () => {
    expect(DASHBOARD_ROUTES.orders).toBe("/siparislerim");
    expect(DASHBOARD_NAV_ITEMS.find((item) => item.key === "liveOrders")?.label).toBe("Siparişlerim");
    expect(DASHBOARD_NAV_ITEMS.find((item) => item.key === "liveOrders")?.href).toBe(
      DASHBOARD_ROUTES.orders,
    );
    expect(buildDashboardBreadcrumbs(DASHBOARD_ROUTES.orders).map((crumb) => crumb.label)).toEqual([
      "Genel Bakış",
      "Siparişlerim",
    ]);
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
    DASHBOARD_NAV_ITEMS.filter((item) => !item.excludeFromSidebar).flatMap((item) => {
      const keys: string[] = [];
      if (isDashboardNavActive(pathname, item.href, item.key)) keys.push(item.key);
      for (const child of item.children ?? []) {
        if (isDashboardNavActive(pathname, child.href)) keys.push(child.key);
      }
      return keys;
    });

  it("highlights exactly one module entry per page", () => {
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuProducts)).toEqual(["products"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuCategories)).toEqual(["categories"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuOptions)).toEqual(["options"]);
    expect(activeKeys(DASHBOARD_ROUTES.feedback)).toEqual(["feedback"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenuMenus)).toEqual(["myMenus"]);
    expect(activeKeys(DASHBOARD_ROUTES.digitalMenu)).toEqual(["myBranches"]);
    expect(DASHBOARD_ROUTES.myBranches).toBe("/subelerim");
    expect(DASHBOARD_ROUTES.branchCreate).toBe("/subelerim/yeni");
    expect(activeKeys(DASHBOARD_ROUTES.myBranches)).toEqual(["myBranches"]);
    expect(activeKeys(DASHBOARD_ROUTES.branchDetail(16))).toEqual(["myBranches"]);
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
