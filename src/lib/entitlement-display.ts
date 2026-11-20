import type { UserEntitlementApiItem } from "@/lib/api";

const QUANTITY_ENTITLEMENT_CODES = new Set(["QR_CREATE", "QR_MENU", "QR_BRANCH"]);

type EntitlementUsageFields = Pick<
  UserEntitlementApiItem,
  "productCode" | "unlimited" | "usedQuantity" | "totalQuantity" | "remainingQuantity" | "usable" | "expired"
>;

export function isQuantityEntitlement(productCode: string): boolean {
  return QUANTITY_ENTITLEMENT_CODES.has(productCode);
}

export function formatEntitlementUsageSummary(product: EntitlementUsageFields): string {
  if (product.unlimited) {
    return "Sınırsız";
  }
  if (isQuantityEntitlement(product.productCode)) {
    return `${product.usedQuantity}/${product.totalQuantity} · ${product.remainingQuantity} kalan`;
  }
  if (!product.usable || product.expired) {
    return "Pasif";
  }
  return "Aktif";
}

export type FeatureKind = "limit" | "feature";

type FeatureCopy = { name: string; description: string; kind: FeatureKind };

/**
 * Display copy for package features, used when the backend sends only the code.
 * The backend's catalog (features table) wins whenever it sends a real name or description.
 */
export const FEATURE_COPY: Record<string, FeatureCopy> = {
  QR_BRANCH: { name: "Şube", kind: "limit", description: "Panelde yönetebileceğiniz şube sayısı." },
  QR_MENU: { name: "Dijital menü", kind: "limit", description: "Şubelerinizde yayınlayabileceğiniz dijital menü sayısı." },
  QR_CREATE: { name: "QR kod", kind: "limit", description: "Menü dışında oluşturabileceğiniz QR kodlar (link, Wi-Fi, iletişim vb.)." },
  MENU_PRODUCT: { name: "Menü ürünü", kind: "limit", description: "Menülerinize ekleyebileceğiniz ürün sayısı." },
  SMART_REPORT_QUOTA: { name: "Haftalık akıllı rapor", kind: "limit", description: "Her hafta ücretsiz oluşturabileceğiniz akıllı rapor sayısı." },
  SMART_REPORTING_ADDON: { name: "Ek akıllı rapor", kind: "limit", description: "Haftalık ücretsiz hakkınızın dışında satın aldığınız akıllı raporlar." },
  AI_MENU_IMPORT_RUN: { name: "AI menü aktarımı", kind: "limit", description: "Ayda başlatabileceğiniz AI menü aktarımı." },
  ASSISTANT_QUESTION: { name: "Günlük asistan sorusu", kind: "limit", description: "Günde sorulabilecek asistan sorusu." },
  WAITER_PANEL: { name: "Garson paneli", kind: "feature", description: "Garsonlarınız masadan sipariş alır, adisyon açar ve hesabı kapatır." },
  ONLINE_ORDER: { name: "Online sipariş", kind: "feature", description: "Paket servis için online sipariş mağazası, sipariş paneli ve kurye takibi." },
  CONSOLE_RENTAL: { name: "Konsol takip", kind: "feature", description: "Oyun konsollarını saatlik kiralayın: oturum başlatın, bitirin, ödenecek tutarı görün." },
  CUSTOM_DESIGN: { name: "Özel tasarım", kind: "feature", description: "Menünüz markanıza özel renk ve tasarımla hazırlanır." },
  AI_MENU_IMPORT: { name: "AI ile menü aktarımı", kind: "feature", description: "Menü fotoğrafından ürünleri yapay zekâ ile otomatik çıkarır." },
  SMART_ASSISTANT: { name: "Akıllı asistan", kind: "feature", description: "Müşterileriniz menüde yapay zekâ asistanına soru sorup öneri alır." },
  SMART_SUMMARY: { name: "Akıllı özet", kind: "feature", description: "Satış ve sipariş verilerinizin kısa günlük özeti." },
  SMART_REPORTING: { name: "Akıllı rapor", kind: "feature", description: "Satışlarınızı yorumlayan, öneri sunan haftalık akıllı raporlar." },
  KAFE_MENU: { name: "Kafe menüsü", kind: "feature", description: "Kafeler için hazır menü şablonu." },
};

function featureCopy(code: string): FeatureCopy | undefined {
  return FEATURE_COPY[code] ?? FEATURE_COPY[code.replace(/_ADDON$/, "")];
}

/** "SOME_FEATURE_CODE" → "Some feature code", for codes the dictionary does not know yet. */
function humanizeCode(code: string): string {
  const words = code.toLowerCase().replace(/_/g, " ").trim();
  return words ? words.charAt(0).toLocaleUpperCase("tr-TR") + words.slice(1) : code;
}

function looksLikeCode(value: string | null | undefined, code: string): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed === code || /^[A-Z0-9_]+$/.test(trimmed);
}

export type EntitlementDisplay = {
  name: string;
  description: string | null;
  kind: FeatureKind;
};

export function describeEntitlement(
  product: Pick<UserEntitlementApiItem, "productCode" | "productName" | "productDescription" | "unlimited">,
): EntitlementDisplay {
  const copy = featureCopy(product.productCode);
  const name = looksLikeCode(product.productName, product.productCode)
    ? copy?.name ?? humanizeCode(product.productCode)
    : product.productName.trim();
  const description = product.productDescription?.trim() || copy?.description || null;
  const kind: FeatureKind =
    copy?.kind ?? (isQuantityEntitlement(product.productCode) ? "limit" : "feature");
  return { name, description, kind };
}

export function formatPackageEntitlementName(
  product: Pick<UserEntitlementApiItem, "productCode" | "productName"> &
    Partial<Pick<UserEntitlementApiItem, "productDescription" | "unlimited">>,
): string {
  if (product.productCode === "QR_BRANCH") {
    return "Şube hakkı";
  }
  return describeEntitlement({ unlimited: false, ...product }).name;
}

export function formatPackageEntitlementUsageSummary(product: EntitlementUsageFields): string {
  if (product.productCode === "QR_BRANCH" && !product.unlimited) {
    return `Adet ${product.totalQuantity}`;
  }
  return formatEntitlementUsageSummary(product);
}

export function formatEntitlementUsed(product: EntitlementUsageFields): string {
  if (product.unlimited) {
    return "—";
  }
  if (isQuantityEntitlement(product.productCode)) {
    return `${product.usedQuantity}/${product.totalQuantity}`;
  }
  if (!product.usable || product.expired) {
    return "—";
  }
  return "Kullanımda";
}

export function formatEntitlementRemaining(product: EntitlementUsageFields): string {
  if (product.unlimited) {
    return "Sınırsız";
  }
  if (isQuantityEntitlement(product.productCode)) {
    return String(product.remainingQuantity);
  }
  if (!product.usable || product.expired) {
    return "Pasif";
  }
  return "Aktif";
}

export type MenuEntitlementSummary = {
  remaining: number;
  total: number;
  used: number;
  unlimited: boolean;
};

export function summarizeMenuEntitlements(
  entitlements: UserEntitlementApiItem[],
): MenuEntitlementSummary | null {
  const active = entitlements.filter(
    (item) =>
      item.productCode === "QR_MENU" &&
      !item.expired &&
      (item.usable || item.totalQuantity > 0),
  );
  if (active.length === 0) {
    return null;
  }
  if (active.some((item) => item.unlimited)) {
    return { remaining: Number.POSITIVE_INFINITY, total: 0, used: 0, unlimited: true };
  }
  return {
    remaining: active.reduce((sum, item) => sum + item.remainingQuantity, 0),
    total: active.reduce((sum, item) => sum + item.totalQuantity, 0),
    used: active.reduce((sum, item) => sum + item.usedQuantity, 0),
    unlimited: false,
  };
}

export function formatMenuQuotaLabel(summary: MenuEntitlementSummary | null): string | null {
  if (!summary) {
    return null;
  }
  if (summary.unlimited) {
    return "Sınırsız menü hakkı";
  }
  if (summary.remaining <= 0) {
    return "Dijital menü hakkınız doldu";
  }
  if (summary.remaining === 1) {
    return "1 menü hakkınız kaldı";
  }
  return `${summary.remaining} menü hakkınız kaldı`;
}

export function canCreateMenu(summary: MenuEntitlementSummary | null): boolean {
  if (!summary) {
    return true;
  }
  return summary.unlimited || summary.remaining > 0;
}

export type QrCreateQuotaSummary = {
  remaining: number;
  total: number;
  used: number;
  unlimited: boolean;
  usable: boolean;
};

export function summarizeQrCreateQuota(input: {
  remaining: number;
  total: number;
  used: number;
  unlimited: boolean;
  usable?: boolean;
}): QrCreateQuotaSummary {
  return {
    remaining: input.remaining,
    total: input.total,
    used: input.used,
    unlimited: input.unlimited,
    usable: input.usable ?? true,
  };
}

export function formatQrCreateQuotaLabel(summary: QrCreateQuotaSummary | null): string | null {
  if (!summary) {
    return null;
  }
  if (!summary.usable) {
    return "QR oluşturmak için aktif bir paket gerekli";
  }
  if (summary.unlimited) {
    return "Sınırsız QR oluşturma hakkı";
  }
  if (summary.remaining <= 0) {
    return "QR oluşturma hakkınız bitti";
  }
  if (summary.remaining === 1) {
    return "1 QR oluşturma hakkınız kaldı";
  }
  return `${summary.remaining} QR oluşturma hakkınız kaldı`;
}

export function hasQrCreateQuotaRemaining(summary: QrCreateQuotaSummary | null): boolean {
  if (!summary?.usable) {
    return false;
  }
  return summary.unlimited || summary.remaining > 0;
}
