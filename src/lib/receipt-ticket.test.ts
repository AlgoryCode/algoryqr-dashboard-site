import { describe, expect, it } from "vitest";

import { buildEscPosBuffer, foldReceiptAscii } from "./receipt-escpos";
import { billToReceipt, formatReceiptText, marketplaceOrderToReceipt } from "./receipt-ticket";

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
  });
});
