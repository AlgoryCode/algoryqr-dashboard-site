import { describe, expect, it } from "vitest";

import {
  assistantCaptionForMenuReply,
  assistantCaptionForProductReply,
  looksLikeInlineProductList,
} from "./chef-recommendation-display";

describe("chef-recommendation-display", () => {
  it("detects inline product list replies", () => {
    expect(
      looksLikeInlineProductList(
        "Kokteyller: Margarita, Mojito. Yemekler: Izgara Levrek, Mantı.",
      ),
    ).toBe(true);
  });

  it("keeps a chef-style recommendation above the cards", () => {
    const reply =
      "Menünüzdeki 5 tatlı arasından: Sıcak ve çikolatalı için Soufflé. Çıtır geleneksel için Katmer. Hafif meyve için Quince Dessert.";
    expect(assistantCaptionForProductReply(reply, 5)).toBe(reply);
  });

  it("keeps a normal Turkish reply that mentions a course", () => {
    expect(assistantCaptionForProductReply("Tatlı olarak dondurma ve sufle var.", 2)).toBe(
      "Tatlı olarak dondurma ve sufle var.",
    );
  });

  it("keeps a two-sentence agent reply above cards", () => {
    const reply = "Menüde beş tatlı var. Kartlarda hepsini gösteriyorum.";
    expect(assistantCaptionForProductReply(reply, 5)).toBe(reply);
  });

  it("keeps a chef menu reply above combo cards", () => {
    const reply = "Yemek: Izgara Levrek. İçecek: Küçük Su. Tatlı: Karışık Meyve.";
    expect(assistantCaptionForMenuReply(reply, 1)).toBe(reply);
  });
});
