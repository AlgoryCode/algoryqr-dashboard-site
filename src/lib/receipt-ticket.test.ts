import { describe, expect, it } from "vitest";

import { buildEscPosBuffer, foldReceiptAscii } from "./receipt-escpos";
import {
  billToReceipt,
  defaultReceiptFooter,
  formatReceiptText,
  kitchenOrderToReceipt,
  marketplaceOrderToReceipt,
  receiptTemplateFromBranch,
  receiptToHtml,
  turkishAccusative,
  withReceiptTemplate,
} from "./receipt-ticket";

describe("receipt ticket", () => {
  it("builds marketplace receipt fields", () => {
    const payload = marketplaceOrderToReceipt(
      {
        id: 1,
        externalOrderId: "PKG-9",
        orderNumber: "YS-100",
        customerName: "Ayşe",
        items: [{ productName: "Adana", quantity: 2, unitPrice: 180, detail: "Acılı" }],
        totalAmount: 360,
        currency: "TRY",
      },
      "YEMEK_SEPETI",
    );
    const text = formatReceiptText(payload);
    expect(payload.platformLabel).toBe("Yemek Sepeti");
    expect(text).toContain("YS-100");
    expect(text).toContain("2x Adana");
    expect(text).toContain("Acılı");
  });

  it("prints closed bill payment lines", () => {
    const text = formatReceiptText(
      billToReceipt({
        tableLabel: "masa-1",
        orderNumber: "127",
        currency: "TRY",
        totalAmount: 150,
        paidTotal: 160,
        items: [{ quantity: 1, productName: "Çorba" }],
        payments: [
          { amount: 150, paymentMethod: "CARD", itemSummary: "Çorba x1" },
          { amount: 10, paymentMethod: "CASH", tip: true },
        ],
      }),
    );
    expect(text).toContain("masa-1");
    expect(text).toContain("Siparis: 127");
    expect(text).toContain("Odeme: Kredi karti, Nakit");
    expect(text).toContain("Odeme detayi");
    expect(text).toContain("Çorba x1 · Kredi karti");
    expect(text).toContain("Bahsis · Nakit");
  });

  it("prints internal orders with source header and grouped options", () => {
    const text = formatReceiptText(
      kitchenOrderToReceipt({
        id: 42,
        orderSource: "QR",
        tableName: "Bahçe 4",
        items: [
          {
            productName: "Burger",
            quantity: 1,
            selectedOptions: [
              { groupName: "Malzemeler", optionName: "Soğan yok" },
              { groupName: "Malzemeler", optionName: "Ekstra peynir" },
              { groupName: "İçecek", optionName: "Kola" },
              { groupName: "Tatlı", optionName: "Sufle" },
            ],
          },
        ],
      }),
    );
    expect(text.startsWith("İç sipariş\nSiparis: 42\nMasa: Bahçe 4")).toBe(true);
    expect(text).toContain("1x Burger");
    expect(text).toContain("  Malzemeler: Soğan yok, Ekstra peynir");
    expect(text).toContain("  İçecek: Kola");
    expect(text).toContain("  Tatlı: Sufle");
    expect(text).not.toContain("Tatlı seçimi");
  });

  it("labels online and phone orders and skips unselected groups", () => {
    const online = formatReceiptText(
      kitchenOrderToReceipt({
        id: 7,
        orderSource: "STORE",
        deliveryType: "DELIVERY",
        items: [
          {
            productName: "Pizza",
            quantity: 1,
            selectedOptions: [{ groupName: "İçecek", optionName: "Ayran" }],
          },
        ],
      }),
    );
    expect(online.startsWith("Online Sipariş\n")).toBe(true);
    expect(online).toContain("Teslimat");
    expect(online).toContain("  İçecek: Ayran");
    expect(online).not.toContain("Tatlı");

    const phone = kitchenOrderToReceipt({ id: 8, orderSource: "PHONE", deliveryType: "PICKUP" });
    expect(phone.platformLabel).toBe("Telefon");
    expect(phone.locationLabel).toBe("Gel al");
  });

  it("encodes ESC/POS init and cut", () => {
    const buffer = buildEscPosBuffer(
      {
        platformLabel: "Test",
        orderNumber: "1",
        items: [{ quantity: 1, name: "Çorba" }],
      },
      { copies: 1, cut: true },
    );
    expect(buffer[0]).toBe(0x1b);
    expect(buffer[1]).toBe(0x40);
    expect(foldReceiptAscii("Çorba")).toBe("Corba");
    expect(buffer.includes(0x1d)).toBe(true);
    const printed = buffer.toString("latin1");
    expect(printed.split("Test").length - 1).toBe(1);
  });
});

describe("receipt template", () => {
  it("builds the thank-you line with the right Turkish suffix", () => {
    expect(turkishAccusative("Tavşan Coffee")).toBe("Tavşan Coffee'yi");
    expect(turkishAccusative("Köfteci Ahmet")).toBe("Köfteci Ahmet'i");
    expect(turkishAccusative("Tarık Hamarat")).toBe("Tarık Hamarat'ı");
    expect(defaultReceiptFooter("Tavşan Coffee")).toBe(
      "Tavşan Coffee'yi tercih ettiğiniz için teşekkürler. Afiyet olsun!",
    );
  });

  it("wraps the order between header, intro and footer", () => {
    const payload = withReceiptTemplate(
      kitchenOrderToReceipt({ id: 42, orderSource: "UBER_EATS", items: [{ productName: "Latte", quantity: 1 }] }),
      receiptTemplateFromBranch({ name: "Tavşan Coffee", receiptIntro: "Moda Şubesi\nHer gün 08:00–23:00" }),
    );
    const text = formatReceiptText(payload);
    expect(text.split("\n").slice(0, 5)).toEqual([
      "Tavşan Coffee",
      "Moda Şubesi",
      "Her gün 08:00–23:00",
      "----------------",
      "Siparis turu: Uber Eats",
    ]);
    expect(text.trim().endsWith("Tavşan Coffee'yi tercih ettiğiniz için teşekkürler. Afiyet olsun!")).toBe(true);
  });

  it("prefers the branch's own header and footer", () => {
    const payload = withReceiptTemplate(
      kitchenOrderToReceipt({ id: 1, orderSource: "QR", tableName: "4" }),
      { businessName: "Tavşan", header: "TAVŞAN COFFEE", footer: "Yine bekleriz" },
    );
    const text = formatReceiptText(payload);
    expect(text.startsWith("TAVŞAN COFFEE\n")).toBe(true);
    expect(text).toContain("Siparis turu: İç sipariş");
    expect(text.trim().endsWith("Yine bekleriz")).toBe(true);
  });

  it("renders the same template into the printable page", () => {
    const html = receiptToHtml(
      withReceiptTemplate(
        kitchenOrderToReceipt({ id: 9, orderSource: "QR", items: [{ productName: "<b>Çay</b>", quantity: 2, unitPrice: 20 }] }),
        { businessName: "Tavşan Coffee" },
      ),
    );
    expect(html).toContain("<h1>Tavşan Coffee</h1>");
    expect(html).toContain("İç sipariş");
    expect(html).toContain("&lt;b&gt;Çay&lt;/b&gt;");
    expect(html).toContain("afiyet olsun".replace("a", "A"));
    expect(html).toContain("@page{size:80mm auto");
  });

  it("prints the template header first on thermal printers", () => {
    const buffer = buildEscPosBuffer(
      withReceiptTemplate({ platformLabel: "Uber Eats", orderNumber: "1", items: [] }, { businessName: "Tavşan Coffee" }),
    );
    const printed = buffer.toString("latin1");
    expect(printed.indexOf("Tavsan Coffee")).toBeLessThan(printed.indexOf("Uber Eats"));
  });
});
