import { describe, expect, it } from "vitest";

import { isAllowedImageUrl } from "./campaign-image-hosts";

const hosts = ["images.algorycode.com"];

describe("isAllowedImageUrl", () => {
  it("accepts https images on our host", () => {
    expect(isAllowedImageUrl("https://images.algorycode.com/menu/1.webp", hosts)).toBe(true);
  });

  it.each([
    "http://images.algorycode.com/a.png",
    "https://169.254.169.254/latest/meta-data",
    "https://images.algorycode.com.evil.test/a.png",
    "https://user:pw@images.algorycode.com/a.png",
    "https://images.algorycode.com:8443/a.png",
    "file:///etc/passwd",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isAllowedImageUrl(url, hosts)).toBe(false);
  });
});
