import { describe, expect, it } from "vitest";

import { parseStoreHandle, storePath } from "./store-public";

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

describe("storePath", () => {
  it("builds nested storefront paths", () => {
    expect(storePath("10427-Gw2AenXEevm3rFfW")).toBe("/store/10427-Gw2AenXEevm3rFfW");
    expect(storePath("10427-Gw2AenXEevm3rFfW", "siparis", "abc")).toBe(
      "/store/10427-Gw2AenXEevm3rFfW/siparis/abc",
    );
  });
});
