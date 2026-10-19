import { describe, expect, it } from "vitest";

import { buildEscPosBuffer, foldReceiptAscii } from "./receipt-escpos";
import {
  billToReceipt,
  formatReceiptText,
  kitchenOrderToReceipt,
  marketplaceOrderToReceipt,
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
