import { describe, expect, it } from "vitest";

import {
  buildScanChart,
  mapUserQrToDashboardItem,
  validateQrDetails,
} from "@/components/dashboard/qr/qr-mappers";
import type { UserQrApiItem } from "@/lib/api/qr";

describe("validateQrDetails", () => {
  it("rejects empty or meaningless content", () => {
    expect(validateQrDetails("link", { url: "" })).toBe("URL zorunlu.");
    expect(validateQrDetails("link", { url: "asdasdasdasdad" })).toContain("Geçerli");
    expect(validateQrDetails("link", { url: "javascript:alert(1)" })).toContain("Geçerli");
    expect(validateQrDetails("mail", { mail: "abc" })).toContain("Geçerli");
    expect(validateQrDetails("contact", { fullName: " " })).toBe("Ad Soyad zorunlu.");
    expect(validateQrDetails("text", { text: "" })).toBe("Metin zorunlu.");
    expect(validateQrDetails("wifi", { ssid: "x", password: "", security: "WPA" })).toBe("WiFi şifresi zorunlu.");
    expect(validateQrDetails("location", { latitude: "91", longitude: "28" })).toContain("Enlem");
  });

  it("accepts valid content", () => {
    expect(validateQrDetails("link", { url: "example.com/menu" })).toBeNull();
    expect(validateQrDetails("mail", { mail: "a@example.com" })).toBeNull();
    expect(validateQrDetails("wifi", { ssid: "Misafir", password: "", security: "NONE" })).toBeNull();
    expect(validateQrDetails("location", { latitude: "41,0082", longitude: "28.9784" })).toBeNull();
  });
});

describe("buildScanChart", () => {
  it("returns seven days and fills the days without scans", () => {
    const chart = buildScanChart(
      [{ date: "2026-11-09", count: 4 }],
      new Date("2026-11-09T12:00:00+03:00"),
    );
    expect(chart).toHaveLength(7);
    expect(chart[6].scans).toBe(4);
    expect(chart.slice(0, 6).every((point) => point.scans === 0)).toBe(true);
  });
});

describe("mapUserQrToDashboardItem", () => {
  it("maps package context fields for legacy and active QR items", () => {
    const activeQr: UserQrApiItem = {
      qrId: 1,
      merchantId: 7,
      qrName: "Aktif QR",
      imgSrc: "img",
      details: { url: "https://example.com" },
      createdAt: "2026-01-01T00:00:00.000Z",
      purchaseId: 10,
      packageName: "Ultimate",
      legacy: false,
      activePackage: true,
    };
    const legacyQr: UserQrApiItem = {
      qrId: 2,
      merchantId: 7,
      qrName: "Eski QR",
      imgSrc: "img",
      details: { url: "https://legacy.example.com" },
      createdAt: "2025-01-01T00:00:00.000Z",
      purchaseId: 99,
      packageName: "Pro",
      legacy: true,
      activePackage: false,
    };

    expect(mapUserQrToDashboardItem(activeQr)).toMatchObject({
      id: 1,
      packageName: "Ultimate",
      legacy: false,
      activePackage: true,
      active: true,
    });
    expect(mapUserQrToDashboardItem(legacyQr)).toMatchObject({
      id: 2,
      packageName: "Pro",
      legacy: true,
      activePackage: false,
    });
  });
});
