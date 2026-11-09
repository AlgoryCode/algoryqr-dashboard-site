import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { isKnownPath, isPanelPath, legacyPanelPath, PUBLIC_ROOT_SEGMENTS } from "@/lib/panel-paths";

describe("legacyPanelPath", () => {
  it("drops the old prefixes", () => {
    expect(legacyPanelPath("/dashboard/dijital-menu/menuler")).toBe("/menuler");
    expect(legacyPanelPath("/dashboard/hesabim/abonelik")).toBe("/hesabim/abonelik");
    expect(legacyPanelPath("/dijital-menu/urunler/yeni")).toBe("/urunler/yeni");
  });

  it("sends the old roots to their new pages", () => {
    expect(legacyPanelPath("/dashboard")).toBe("/genel-bakis");
    expect(legacyPanelPath("/dashboard/dijital-menu")).toBe("/menu-yonetimi");
  });

  it("leaves current addresses alone", () => {
    expect(legacyPanelPath("/menuler")).toBeNull();
    expect(legacyPanelPath("/dashboards")).toBeNull();
    expect(legacyPanelPath("/menu/abc")).toBeNull();
  });
});

describe("path classification", () => {
  it("covers every static panel route", () => {
    const paths = Object.values(DASHBOARD_ROUTES).filter((value): value is string => typeof value === "string");
    expect(paths.filter((value) => value.startsWith("/") && !isKnownPath(value))).toEqual([]);
  });

  it("does not treat the public menu as a panel page", () => {
    expect(isPanelPath("/menu/abc")).toBe(false);
    expect(isPanelPath("/login")).toBe(false);
  });

  it("rejects unknown addresses", () => {
    expect(isKnownPath("/olmayan-sayfa")).toBe(false);
    expect(isKnownPath("/")).toBe(true);
  });

  it("lists every top-level app folder, so a new route is not answered with 404", () => {
    const folders = readdirSync(path.join(process.cwd(), "src/app"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("(") && !entry.name.startsWith("["))
      .map((entry) => entry.name)
      .sort();
    expect(folders).toEqual([...PUBLIC_ROOT_SEGMENTS].sort());
  });
});
