import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  PRODUCT_SERVICE_BASE_URL: "https://stage.production.algorycode.com",
  PRODUCT_SERVICE_AUTH_TOKEN: "test-token",
  PRODUCT_SERVICE_AUTH_HEADER: "X-Service-Token",
}));

import axios from "axios";

import { fetchProductServicePackages } from "@/lib/server/product-service-catalog";

vi.mock("axios");

describe("fetchProductServicePackages", () => {
  it("maps catalog packages and builds availableModules", async () => {
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (String(url).includes("/catalog/packages")) {
        return {
          status: 200,
          data: {
            content: [
              {
                id: 1,
                code: "PRO_PACKAGE",
                name: "Pro",
                description: "Pro paket",
                features: ["Sinirsiz urun"],
                price: 599,
                currency: "TRY",
                active: true,
                validityDays: 30,
                items: [
                  {
                    id: 10,
                    productId: 2,
                    productCode: "MENU_PRODUCT",
                    productName: "Menu",
                    quantity: 1,
                    unlimited: true,
                  },
                ],
              },
            ],
          },
        };
      }
      return {
        status: 200,
        data: {
          content: [
            {
              id: 2,
              code: "MENU_PRODUCT",
              name: "Menu",
              unitPrice: 2,
              vatRate: 20,
              consumable: true,
              addonPurchasable: true,
              active: true,
            },
            {
              id: 3,
              code: "WAITER_PANEL",
              name: "Garson",
              unitPrice: 149,
              vatRate: 20,
              consumable: false,
              addonPurchasable: true,
              active: true,
            },
          ],
        },
      };
    });

    const packages = await fetchProductServicePackages();

    expect(packages).toHaveLength(1);
    expect(packages[0].code).toBe("PRO_PACKAGE");
    expect(packages[0].availableModules?.map((m) => m.productCode)).toEqual(["WAITER_PANEL"]);
  });
});
