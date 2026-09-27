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

  it("uses short caption when products are shown as cards", () => {
    expect(
      assistantCaptionForProductReply(
        "Kokteyller: Margarita, Mojito, Aperol Spritz. Yemekler: Izgara Levrek.",
        3,
      ),
    ).toBe("Size özel seçtiklerim — detay için karta dokunun.");
  });

  it("uses short caption when menu combos are shown as cards", () => {
    expect(
      assistantCaptionForMenuReply(
        "Yemek: Izgara Levrek. İçecek: Küçük Su. Tatlı: Karışık Meyve.",
        1,
      ),
    ).toBe("Tam menü önerilerim aşağıda — sepete tek dokunuşla ekleyebilirsiniz.");
  });
});
