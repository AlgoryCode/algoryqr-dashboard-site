export type PrintSource = "YEMEK_SEPETI" | "UBER_EATS" | "QR" | "TEST";

export type ReceiptLine = {
  quantity: number;
  name: string;
  detail?: string | null;
  details?: string[] | null;
  unitPrice?: number | null;
};

export type ReceiptPayload = {
  platformLabel: string;
  orderNumber: string;
  locationLabel?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryType?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  items: ReceiptLine[];
  totalAmount?: number | null;
  currency?: string | null;
  footerLines?: string[];
  /** Branch receipt template; see {@link withReceiptTemplate}. */
  businessName?: string | null;
  receiptHeader?: string | null;
  receiptIntro?: string | null;
  receiptFooter?: string | null;
};

export type ReceiptTemplate = {
  businessName?: string | null;
  header?: string | null;
  intro?: string | null;
  footer?: string | null;
};

const VOWELS = "aeıioöuü";

/** "Tavşan Coffee" → "Tavşan Coffee'yi", "Köfteci Ahmet" → "Köfteci Ahmet'i" (Turkish accusative). */
export function turkishAccusative(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLocaleLowerCase("tr");
  const lastVowel = [...lower].reverse().find((char) => VOWELS.includes(char)) ?? "e";
  const suffixVowel = "aı".includes(lastVowel) ? "ı" : "ei".includes(lastVowel) ? "i" : "ou".includes(lastVowel) ? "u" : "ü";
  const endsWithVowel = VOWELS.includes(lower.at(-1) ?? "");
  return `${trimmed}'${endsWithVowel ? "y" : ""}${suffixVowel}`;
}

export function defaultReceiptFooter(businessName?: string | null): string {
  const name = businessName?.trim();
  return name
    ? `${turkishAccusative(name)} tercih ettiğiniz için teşekkürler. Afiyet olsun!`
    : "Bizi tercih ettiğiniz için teşekkürler. Afiyet olsun!";
}

export function receiptTemplateFromBranch(
  branch?: { name?: string | null; receiptHeader?: string | null; receiptIntro?: string | null; receiptFooter?: string | null } | null,
): ReceiptTemplate {
  return {
    businessName: branch?.name ?? null,
    header: branch?.receiptHeader ?? null,
    intro: branch?.receiptIntro ?? null,
    footer: branch?.receiptFooter ?? null,
  };
}

/**
 * Puts the branch template around a receipt: the heading falls back to the business name and
 * the footer to a thank-you line, so every printed receipt opens and closes the same way.
 */
export function withReceiptTemplate(payload: ReceiptPayload, template: ReceiptTemplate): ReceiptPayload {
  const businessName = template.businessName?.trim() || payload.businessName || null;
  return {
    ...payload,
    businessName,
    receiptHeader: template.header?.trim() || businessName,
    receiptIntro: template.intro?.trim() || null,
    receiptFooter: template.footer?.trim() || defaultReceiptFooter(businessName),
  };
}

function templateLines(value?: string | null): string[] {
  return (value ?? "")
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean);
}

export function formatReceiptDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type MarketplaceLikeOrder = {
  id: number;
  externalOrderId: string;
  orderNumber?: string | null;
  deliveryType?: string | null;
  paymentMethod?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  note?: string | null;
  packageStatus?: string | null;
  packageCreatedAt?: string | null;
  items?: Array<{
    productName?: string | null;
    quantity: number;
    unitPrice?: number | null;
    options?: string | null;
    detail?: string | null;
  }>;
};

export type SelectedReceiptOption = {
  groupName?: string | null;
  optionName?: string | null;
};

export type KitchenLikeOrder = {
  id: number;
  orderSource?: string | null;
  tableName?: string | null;
  tableId?: number | null;
  deliveryType?: string | null;
  customerName?: string | null;
  note?: string | null;
  waiterNote?: string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  items?: Array<{
    productName?: string;
    quantity: number;
    unitPrice?: number | string;
    note?: string | null;
    selectedOptions?: SelectedReceiptOption[] | null;
  }>;
};

export function platformLabelForSource(source: PrintSource): string {
  if (source === "YEMEK_SEPETI") return "Yemek Sepeti";
  if (source === "UBER_EATS") return "Uber Eats";
  if (source === "QR") return "QR / Masa";
  return "Test fisi";
}

function normalizeReceiptSource(value?: string | null): string {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function receiptSourceLabel(orderSource?: string | null): string {
  const source = normalizeReceiptSource(orderSource);
  if (source === "UBER_EATS" || source === "UBEREATS" || source === "UBER") return "Uber Eats";
  if (source === "YEMEKSEPETI" || source === "YEMEK_SEPETI" || source === "YS") return "Yemek Sepeti";
  if (source === "PHONE") return "Telefon";
  if (
    source === "STORE" ||
    source === "ONLINE" ||
    source === "ONLINE_ORDER" ||
    source === "WEB" ||
    source === "ALGORY" ||
    source === "ALGORYQR"
  ) {
    return "Online Sipariş";
  }
  return "İç sipariş";
}

export function formatSelectedOptionLines(options?: SelectedReceiptOption[] | null): string[] {
  if (!options?.length) return [];
  const groups: Array<{ groupName: string | null; names: string[] }> = [];
  for (const option of options) {
    const name = option.optionName?.trim();
    if (!name) continue;
    const groupName = option.groupName?.trim() || null;
    const existing = groups.find((group) => group.groupName === groupName);
    if (existing) existing.names.push(name);
    else groups.push({ groupName, names: [name] });
  }
  return groups.map((group) =>
    group.groupName ? `${group.groupName}: ${group.names.join(", ")}` : group.names.join(", "),
  );
}

function receiptLocationLabel(order: KitchenLikeOrder): string | null {
  if (receiptSourceLabel(order.orderSource) === "İç sipariş") {
    const name = order.tableName?.trim();
    if (name) return `Masa: ${name}`;
    if (order.tableId != null) return `Masa: Masa ${order.tableId}`;
    return "Masa";
  }
  const delivery = (order.deliveryType ?? "").trim().toUpperCase();
  if (delivery === "PICKUP" || delivery === "STORE") return "Gel al";
  if (delivery === "DELIVERY") return "Teslimat";
  return null;
}

function formatAmount(value?: number | string | null, currency = "TRY"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function marketplaceOrderToReceipt(
  order: MarketplaceLikeOrder,
  source: "YEMEK_SEPETI" | "UBER_EATS",
): ReceiptPayload {
  return {
    platformLabel: platformLabelForSource(source),
    orderNumber: order.orderNumber?.trim() || order.externalOrderId || String(order.id),
    createdAt: order.packageCreatedAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryType: order.deliveryType,
    paymentMethod: order.paymentMethod,
    note: order.note,
    items: (order.items ?? []).map((item) => ({
      quantity: item.quantity,
      name: item.productName?.trim() || "Urun",
      detail: item.detail || item.options,
      unitPrice: item.unitPrice,
    })),
    totalAmount: order.totalAmount,
    currency: order.currency ?? "TRY",
  };
}

export function kitchenOrderToReceipt(order: KitchenLikeOrder): ReceiptPayload {
  return {
    platformLabel: receiptSourceLabel(order.orderSource),
    orderNumber: String(order.id),
    locationLabel: receiptLocationLabel(order),
    createdAt: order.submittedAt || order.createdAt,
    customerName: order.customerName,
    note: [order.note, order.waiterNote].filter(Boolean).join(" | ") || null,
    items: (order.items ?? []).map((item) => ({
      quantity: item.quantity,
      name: item.productName?.trim() || "Urun",
      details: formatSelectedOptionLines(item.selectedOptions),
      detail: item.note?.trim() || null,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
    })),
    totalAmount: order.totalAmount != null ? Number(order.totalAmount) : null,
    currency: order.currency ?? "TRY",
  };
}

export function testReceiptPayload(): ReceiptPayload {
  return {
    platformLabel: "AlgoryQR Test",
    orderNumber: "TEST",
    createdAt: new Date().toISOString(),
    customerName: "Test",
    note: "Birch CV2-UN baglanti testi",
    items: [{ quantity: 1, name: "Test urun", unitPrice: 1 }],
    totalAmount: 1,
    currency: "TRY",
  };
}

function indentedDetailLines(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => `  ${row}`);
}

const RULE = "----------------";

export function formatReceiptText(payload: ReceiptPayload): string {
  const heading = payload.receiptHeader?.trim() || payload.businessName?.trim();
  const lines: string[] = heading
    ? [heading, ...templateLines(payload.receiptIntro), RULE, `Siparis turu: ${payload.platformLabel}`]
    : [payload.platformLabel];
  lines.push(`Siparis: ${payload.orderNumber}`);
  if (payload.locationLabel?.trim()) lines.push(payload.locationLabel.trim());
  const when = formatReceiptDate(payload.createdAt);
  if (when) lines.push(when);
  if (payload.customerName) lines.push(`Musteri: ${payload.customerName}`);
  if (payload.customerPhone) lines.push(`Tel: ${payload.customerPhone}`);
  if (payload.deliveryAddress) lines.push(`Adres: ${payload.deliveryAddress}`);
  if (payload.deliveryType) lines.push(`Teslimat: ${payload.deliveryType}`);
  if (payload.paymentMethod) lines.push(`Odeme: ${payload.paymentMethod}`);
  lines.push("----------------");
  for (const item of payload.items) {
    lines.push(`${item.quantity}x ${item.name}`);
    for (const row of item.details ?? []) {
      const trimmed = row.trim();
      if (trimmed) lines.push(`  ${trimmed}`);
    }
    lines.push(...indentedDetailLines(item.detail));
  }
  if (payload.note) {
    lines.push("----------------");
    lines.push(`Not: ${payload.note}`);
  }
  const total = formatAmount(payload.totalAmount, payload.currency ?? "TRY");
  if (total) {
    lines.push("----------------");
    lines.push(`Toplam: ${total}`);
  }
  if (payload.footerLines?.length) {
    lines.push("----------------");
    lines.push("Odeme detayi");
    for (const line of payload.footerLines) lines.push(line);
  }
  const footer = templateLines(payload.receiptFooter);
  if (footer.length) {
    lines.push(RULE);
    lines.push(...footer);
  }
  return lines.join("\n");
}

export type BillReceiptSource = {
  tableLabel: string;
  orderNumber: string;
  closedAt?: string | null;
  currency?: string | null;
  totalAmount?: number | string | null;
  paidTotal?: number | string | null;
  items?: Array<{
    quantity: number;
    productName: string;
    note?: string | null;
  }>;
  payments?: Array<{
    amount?: number | string | null;
    paymentMethod?: string | null;
    tip?: boolean;
    itemSummary?: string | null;
  }>;
};

function receiptMethodLabel(method?: string | null): string {
  if (method === "CARD") return "Kredi karti";
  if (method === "CASH") return "Nakit";
  return method?.trim() || "";
}

export function billToReceipt(source: BillReceiptSource): ReceiptPayload {
  const currency = source.currency ?? "TRY";
  const payments = source.payments ?? [];
  const methods = [
    ...new Set(payments.map((payment) => receiptMethodLabel(payment.paymentMethod)).filter(Boolean)),
  ];
  const footerLines = payments.map((payment) =>
    [
      payment.tip ? "Bahsis" : payment.itemSummary?.trim() || "Odeme",
      receiptMethodLabel(payment.paymentMethod),
      formatAmount(payment.amount, currency),
    ]
      .filter(Boolean)
      .join(" · "),
  );
  const paid = formatAmount(source.paidTotal, currency);
  if (paid) footerLines.push(`Odenen: ${paid}`);

  return {
    platformLabel: source.tableLabel.trim() || "Adisyon",
    orderNumber: source.orderNumber,
    createdAt: source.closedAt,
    paymentMethod: methods.join(", ") || null,
    items: (source.items ?? []).map((item) => ({
      quantity: item.quantity,
      name: item.productName?.trim() || "Urun",
      detail: item.note,
    })),
    totalAmount: source.totalAmount != null ? Number(source.totalAmount) : null,
    currency,
    footerLines,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlLines(value?: string | null): string {
  return templateLines(value).map(escapeHtml).join("<br>");
}

/** 80 mm receipt page; the same markup feeds the settings preview and the print dialog. */
export function receiptToHtml(payload: ReceiptPayload): string {
  const currency = payload.currency ?? "TRY";
  const heading = payload.receiptHeader?.trim() || payload.businessName?.trim() || "";
  const meta: Array<[string, string]> = [];
  meta.push(["Sipariş no", payload.orderNumber]);
  if (payload.locationLabel?.trim()) meta.push(["Konum", payload.locationLabel.trim().replace(/^Masa:\s*/, "Masa ")]);
  const when = formatReceiptDate(payload.createdAt);
  if (when) meta.push(["Tarih", when]);
  if (payload.customerName) meta.push(["Müşteri", payload.customerName]);
  if (payload.customerPhone) meta.push(["Telefon", payload.customerPhone]);
  if (payload.deliveryAddress) meta.push(["Adres", payload.deliveryAddress]);
  if (payload.paymentMethod) meta.push(["Ödeme", payload.paymentMethod]);

  const items = payload.items
    .map((item) => {
      const details = [...(item.details ?? []), ...templateLines(item.detail)].map(escapeHtml);
      const line = item.unitPrice != null ? formatAmount(Number(item.unitPrice) * item.quantity, currency) : "";
      return `<div class="item"><span class="qty">${item.quantity}×</span><span class="name">${escapeHtml(item.name)}${
        details.length ? `<small>${details.join("<br>")}</small>` : ""
      }</span><span class="price">${escapeHtml(line)}</span></div>`;
    })
    .join("");
  const total = formatAmount(payload.totalAmount, currency);
  const payments = (payload.footerLines ?? []).map((row) => `<div>${escapeHtml(row)}</div>`).join("");

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Fiş ${escapeHtml(payload.orderNumber)}</title>
<style>
@page{size:80mm auto;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:#111}
body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:12px;line-height:1.4}
.r{width:72mm;margin:0 auto;padding:4mm 0 6mm}
.c{text-align:center}
h1{margin:0;font-size:17px;font-weight:700;letter-spacing:-.01em}
.intro{margin:4px 0 0;color:#333}
.type{display:inline-block;margin:8px 0 2px;padding:2px 10px;border:1px solid #111;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
hr{border:0;border-top:1px dashed #999;margin:8px 0}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin:0}
dt{color:#555}dd{margin:0;text-align:right;word-break:break-word}
.item{display:grid;grid-template-columns:auto 1fr auto;gap:6px;padding:2px 0}
.qty{font-weight:700}.price{white-space:nowrap}
small{display:block;color:#555;font-size:11px}
.note{color:#333}
.total{display:flex;justify-content:space-between;font-size:15px;font-weight:700}
.pay{color:#333;font-size:11px}
.footer{margin:0;font-weight:600}
</style></head><body><div class="r">
${heading ? `<div class="c"><h1>${escapeHtml(heading)}</h1>${payload.receiptIntro?.trim() ? `<p class="intro">${htmlLines(payload.receiptIntro)}</p>` : ""}</div>` : ""}
<div class="c"><span class="type">${escapeHtml(payload.platformLabel)}</span></div>
<hr>
<dl>${meta.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
<hr>
${items}
${payload.note ? `<hr><div class="note"><b>Not:</b> ${escapeHtml(payload.note)}</div>` : ""}
${total ? `<hr><div class="total"><span>Toplam</span><span>${escapeHtml(total)}</span></div>` : ""}
${payments ? `<div class="pay">${payments}</div>` : ""}
${payload.receiptFooter?.trim() ? `<hr><p class="c footer">${htmlLines(payload.receiptFooter)}</p>` : ""}
</div></body></html>`;
}

/**
 * Opens the browser's print dialog for one receipt, where the printer is chosen.
 * A hidden frame avoids pop-up blockers and leaves no extra window behind.
 */
export function printReceiptInBrowser(payload: ReceiptPayload) {
  if (typeof window === "undefined") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const remove = () => window.setTimeout(() => frame.remove(), 1000);
  frame.onload = () => {
    const view = frame.contentWindow;
    if (!view) return remove();
    view.addEventListener("afterprint", remove, { once: true });
    view.focus();
    view.print();
    // Safari never fires afterprint for frames; clean up later regardless.
    window.setTimeout(remove, 60_000);
  };
  frame.srcdoc = receiptToHtml(payload);
}
