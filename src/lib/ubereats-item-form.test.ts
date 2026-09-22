import { describe, expect, it } from "vitest";

import {
  emptyUberEatsItemForm,
  formFromUberEatsProduct,
  moneyFieldFromAmount,
  toCreateUberEatsProductPayload,
} from "./ubereats-item-form";

describe("toCreateUberEatsProductPayload", () => {
  it("rejects blank name and category", () => {
    expect(toCreateUberEatsProductPayload(emptyUberEatsItemForm()).ok).toBe(false);
    expect(toCreateUberEatsProductPayload({ ...emptyUberEatsItemForm(), name: "Burger" }).ok).toBe(false);
  });

  it("maps required modifier group and sold out", () => {
    const result = toCreateUberEatsProductPayload({
      name: "Cheeseburger",
      description: "Dana köfte",
      price: "220",
      categoryName: "Burger",
      imageUrl: "https://cdn.example/burger.jpg",
      soldOut: true,
      soldOutDuration: "today",
      modifierGroups: [
        {
          name: "Sos seçimi",
          required: true,
          minSelect: "1",
          maxSelect: "1",
          options: [{ name: "Cheddar", price: "8" }, { name: "", price: "0" }],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.available).toBe(false);
    expect(result.payload.price).toBe(220);
    expect(result.payload.modifierGroups).toEqual([
      {
        name: "Sos seçimi",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [{ name: "Cheddar", price: 8 }],
      },
    ]);
  });

  it("maps an existing product into the edit form", () => {
    expect(moneyFieldFromAmount(8.5)).toBe("8,5");
    const form = formFromUberEatsProduct({
      id: "p-1",
      name: "Cheeseburger",
      description: "Dana köfte",
      categoryName: "Burger",
      price: 220,
      available: false,
      modifierGroups: [
        {
          name: "Sos seçimi",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [{ name: "Cheddar", price: 8 }],
        },
      ],
    });
    expect(form.name).toBe("Cheeseburger");
    expect(form.categoryName).toBe("Burger");
    expect(form.soldOut).toBe(true);
    expect(form.modifierGroups).toEqual([
      {
        name: "Sos seçimi",
        required: true,
        minSelect: "1",
        maxSelect: "1",
        options: [{ name: "Cheddar", price: "8" }],
      },
    ]);
  });
});
