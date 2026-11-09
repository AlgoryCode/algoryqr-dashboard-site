import { describe, expect, it } from "vitest";

import {
  MAX_PINNED,
  activeNavTargetId,
  buildNavTargets,
  foldTurkish,
  movePinnedId,
  pushRecentId,
  searchNavTargets,
  togglePinnedId,
} from "./dashboard-nav-prefs";
import { DASHBOARD_NAV_ITEMS, DASHBOARD_ROUTES } from "./dashboard-routes";

describe("dashboard nav prefs", () => {
  const targets = buildNavTargets(DASHBOARD_NAV_ITEMS);

  it("builds parent and child targets with group labels", () => {
    const categories = targets.find((target) => target.id === "products-categories");
    expect(categories?.isChild).toBe(true);
    expect(categories?.parentLabel).toBe("Ürünler");
    expect(targets.find((target) => target.id === "reports")?.groupLabel).toBe("Finans ve raporlar");
  });

  it("folds Turkish characters", () => {
    expect(foldTurkish("Şube Yönetimi İçin")).toBe("sube yonetimi icin");
  });

  it("matches without Turkish characters and ranks label prefixes first", () => {
    const ids = searchNavTargets(targets, "sube").map((target) => target.id);
    expect(ids[0]).toBe("myBranches");
    const rapor = searchNavTargets(targets, "rapor").map((target) => target.id);
    expect(rapor.slice(0, 2)).toEqual(["reports", "smartReports"]);
  });

  it("finds pages by keyword", () => {
    expect(searchNavTargets(targets, "garson").map((target) => target.id)).toContain("staff");
    expect(searchNavTargets(targets, "   ")).toEqual([]);
  });

  it("resolves the active target, preferring child pages", () => {
    expect(activeNavTargetId(DASHBOARD_ROUTES.digitalMenuCategories, targets)).toBe("products-categories");
    expect(activeNavTargetId(DASHBOARD_ROUTES.reportsHub, targets)).toBe("reports");
  });

  it("toggles, caps and reorders pins", () => {
    expect(togglePinnedId(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePinnedId(["a", "b"], "a")).toEqual(["b"]);
    const full = Array.from({ length: MAX_PINNED }, (_, i) => `p${i}`);
    expect(togglePinnedId(full, "extra")).toEqual(full);
    expect(movePinnedId(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
    expect(movePinnedId(["a", "b"], "a", -1)).toEqual(["a", "b"]);
  });

  it("keeps recent visits unique and bounded", () => {
    expect(pushRecentId(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    expect(pushRecentId(["a", "b", "c", "d", "e"], "f")).toEqual(["f", "a", "b", "c", "d"]);
  });
});
