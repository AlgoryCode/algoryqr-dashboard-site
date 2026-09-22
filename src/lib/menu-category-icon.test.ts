import { describe, expect, it } from "vitest";
import { Coffee, CupSoda, IceCream, UtensilsCrossed } from "lucide-react";

import { menuCategoryIcon } from "./menu-category-icon";

describe("menuCategoryIcon", () => {
  it("maps waffle and drink slugs", () => {
    expect(menuCategoryIcon("waffle")).toBe(IceCream);
    expect(menuCategoryIcon("cuplar")).toBe(CupSoda);
    expect(menuCategoryIcon("sicak_icecekler")).toBe(Coffee);
    expect(menuCategoryIcon("Sıcak İçecekler")).toBe(Coffee);
  });

  it("falls back when slug is unknown", () => {
    expect(menuCategoryIcon(null)).toBe(UtensilsCrossed);
    expect(menuCategoryIcon("deniz")).toBe(UtensilsCrossed);
  });
});
