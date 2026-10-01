import { describe, expect, it } from "vitest";

import { parseStoreHandle, publicStoreDeliveryTypes, storePath } from "./store-public";

describe("parseStoreHandle", () => {
  it("splits store number and token", () => {
    expect(parseStoreHandle("10427-Gw2AenXEevm3rFfW")).toEqual({
      storeNo: 10427,
      token: "Gw2AenXEevm3rFfW",
    });
  });

  it("ignores a leftover slug in legacy handles", () => {
    expect(parseStoreHandle("10427-kebapci-mehmet-Gw2AenXEevm3rFfW")).toEqual({
      storeNo: 10427,
      token: "Gw2AenXEevm3rFfW",
    });
  });

  it("rejects handles without store number and token", () => {
    expect(parseStoreHandle("kebapci-mehmet-token")).toBeNull();
    expect(parseStoreHandle("10427-")).toBeNull();
    expect(parseStoreHandle("10427")).toBeNull();
    expect(parseStoreHandle("")).toBeNull();
  });
});

describe("publicStoreDeliveryTypes", () => {
  it("hides delivery when the branch courier is off and keeps pickup", () => {
    expect(publicStoreDeliveryTypes(["DELIVERY", "PICKUP"], false)).toEqual(["PICKUP"]);
    expect(publicStoreDeliveryTypes(["DELIVERY", "PICKUP"], null)).toEqual(["PICKUP"]);
    expect(publicStoreDeliveryTypes(["DELIVERY", "PICKUP"], true)).toEqual(["DELIVERY", "PICKUP"]);
    expect(publicStoreDeliveryTypes(["DELIVERY", "PICKUP"])).toEqual(["DELIVERY", "PICKUP"]);
  });
});

describe("storePath", () => {
  it("builds nested storefront paths", () => {
    expect(storePath("10427-Gw2AenXEevm3rFfW")).toBe("/store/10427-Gw2AenXEevm3rFfW");
    expect(storePath("10427-Gw2AenXEevm3rFfW", "siparis", "abc")).toBe(
      "/store/10427-Gw2AenXEevm3rFfW/siparis/abc",
    );
  });
});
