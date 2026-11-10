import { UserQrApiItem } from "@/lib/api";
import { createInitialMenuData } from "@/components/dashboard/qr-create/MenuDetails";
import { getMenuTemplate, resolveMenuThemeId } from "@/components/menu-templates/registry";
import { QrTypeData, QrTypeValue } from "@/components/dashboard/qr-create/QrTypeDetails";
import { MENU_APP_ORIGIN } from "@/lib/config";

export type DashboardQrItem = {
  id: number;
  merchantId: number;
  name: string;
  content: string;
  scans: number;
  created: string;
  type: string;
  active: boolean;
  imgSrc: string | null | undefined;
  details: Record<string, unknown>;
  menuId?: number;
  publicUrl?: string;
  purchaseId?: number | null;
  packageName?: string | null;
  legacy?: boolean;
  activePackage?: boolean;
  trackingEnabled: boolean;
  dailyScans: { date: string; count: number }[];
};

const isWebUrl = (value: string) => {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username) return false;
    return url.hostname === "localhost" || (url.hostname.includes(".") && !url.hostname.endsWith("."));
  } catch {
    return false;
  }
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isCoordinate = (value: string, limit: number) => {
  const normalized = value.trim().replace(",", ".");
  return normalized !== "" && Number.isFinite(Number(normalized)) && Math.abs(Number(normalized)) <= limit;
};

/** Returns the message to show when the details would produce a useless QR, otherwise null. */
export const validateQrDetails = (type: QrTypeValue, details: Record<string, unknown>): string | null => {
  const field = (key: string) => String(details[key] ?? "").trim();
  if (type === "link") {
    if (!field("url")) return "URL zorunlu.";
    return isWebUrl(field("url")) ? null : "Geçerli bir web adresi girin. Örn: https://example.com";
  }
  if (type === "wifi") {
    if (!field("ssid")) return "WiFi ağ adı (SSID) zorunlu.";
    return field("security") !== "NONE" && !String(details.password ?? "") ? "WiFi şifresi zorunlu." : null;
  }
  if (type === "mail") {
    if (!field("mail")) return "E-posta adresi zorunlu.";
    return isEmail(field("mail")) ? null : "Geçerli bir e-posta adresi girin.";
  }
  if (type === "contact") {
    if (!field("fullName")) return "Ad Soyad zorunlu.";
    return field("mail") && !isEmail(field("mail")) ? "Geçerli bir e-posta adresi girin." : null;
  }
  if (type === "text") return field("text") ? null : "Metin zorunlu.";
  if (type === "location") {
    if ("mapsUrl" in details) {
      if (!field("mapsUrl")) return "Google Maps bağlantısı zorunlu.";
      return isWebUrl(field("mapsUrl")) ? null : "Geçerli bir harita bağlantısı girin. Örn: https://maps.app.goo.gl/...";
    }
    if (!isCoordinate(field("latitude"), 90)) return "Enlem -90 ile 90 arasında olmalı.";
    return isCoordinate(field("longitude"), 180) ? null : "Boylam -180 ile 180 arasında olmalı.";
  }
  return null;
};

const SCAN_ZONE = "Europe/Istanbul";
const CHART_DAYS = 7;
const DAY_MS = 86_400_000;
const scanDayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCAN_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const scanDayLabel = new Intl.DateTimeFormat("tr-TR", { timeZone: SCAN_ZONE, weekday: "short" });

/** One point per day for the last week, including days with no scans. */
export const buildScanChart = (daily: DashboardQrItem["dailyScans"], now = new Date()) => {
  const countByDay = new Map(daily.map((item) => [item.date, item.count]));
  return Array.from({ length: CHART_DAYS }, (_, index) => {
    const day = new Date(now.getTime() - (CHART_DAYS - 1 - index) * DAY_MS);
    return { day: scanDayLabel.format(day), scans: countByDay.get(scanDayKey.format(day)) ?? 0 };
  });
};

export const createInitialQrTypeData = (): QrTypeData => ({
  link: "",
  wifi: { ssid: "", password: "", security: "WPA" },
  mail: { mail: "", subject: "", body: "" },
  contact: { fullName: "", phone: "", mail: "", company: "", title: "" },
  text: "",
  location: { mode: "coordinates", latitude: "", longitude: "", mapsUrl: "", label: "" },
  menu: createInitialMenuData(),
});

export const getQrDetailsByType = (type: QrTypeValue, data: QrTypeData) => {
  if (type === "link") return { url: data.link };
  if (type === "wifi") return data.wifi;
  if (type === "mail") return data.mail;
  if (type === "contact") return data.contact;
  if (type === "text") return { text: data.text };
  if (type === "menu") {
    return {
      businessName: data.menu.businessName,
      slogan: data.menu.slogan,
      phone: data.menu.phone,
      email: data.menu.email,
      address: data.menu.address,
      themeId: data.menu.themeId,
      chefName: data.menu.chefName,
      chefAvatarKey: data.menu.chefAvatarKey,
      publicOrigin: MENU_APP_ORIGIN,
    };
  }
  return locationDetails(data.location);
};

/** Keeps only the fields of the chosen way, so a location holds coordinates or a map link, never both. */
export const locationDetails = (location: QrTypeData["location"]) =>
  location.mode === "url"
    ? { mapsUrl: location.mapsUrl.trim(), label: location.label }
    : { latitude: location.latitude, longitude: location.longitude, label: location.label };

export const getBackendTypeFromDetails = (details: Record<string, unknown>): QrTypeValue => {
  if ("themeId" in details && "businessName" in details) return "menu";
  if ("url" in details) return "link";
  if ("ssid" in details) return "wifi";
  if ("mail" in details && !("fullName" in details)) return "mail";
  if ("fullName" in details) return "contact";
  if ("text" in details) return "text";
  return "location";
};

export const mapDetailsToQrTypeData = (details: Record<string, unknown>): QrTypeData => {
  const base = createInitialQrTypeData();
  if ("themeId" in details && "businessName" in details) {
    const themeId = resolveMenuThemeId(details.themeId);
    return {
      ...base,
      menu: {
        businessName: String(details.businessName ?? ""),
        slogan: String(details.slogan ?? ""),
        phone: String(details.phone ?? ""),
        email: String(details.email ?? ""),
        address: String(details.address ?? ""),
        googleReviewsUrl: String(details.googleReviewsUrl ?? ""),
        themeId,
        chefName: String(details.chefName ?? ""),
        chefAvatarKey: String(details.chefAvatarKey ?? "default"),
        logoUrl: String(details.logoUrl ?? ""),
        coverUrl: String(details.coverUrl ?? ""),
      },
    };
  }
  if ("url" in details) return { ...base, link: String(details.url ?? "") };

  if ("ssid" in details) {
    const securityRaw = String(details.security ?? "WPA");
    const security = (securityRaw === "WPA" || securityRaw === "WEP" || securityRaw === "NONE") ? securityRaw : "WPA";
    return {
      ...base,
      wifi: {
        ssid: String(details.ssid ?? ""),
        password: String(details.password ?? ""),
        security,
      },
    };
  }

  if ("mail" in details && !("fullName" in details)) {
    return {
      ...base,
      mail: {
        mail: String(details.mail ?? ""),
        subject: String(details.subject ?? ""),
        body: String(details.body ?? ""),
      },
    };
  }

  if ("fullName" in details) {
    return {
      ...base,
      contact: {
        fullName: String(details.fullName ?? ""),
        phone: String(details.phone ?? ""),
        mail: String(details.mail ?? ""),
        company: String(details.company ?? ""),
        title: String(details.title ?? ""),
      },
    };
  }

  if ("text" in details) return { ...base, text: String(details.text ?? "") };

  return {
    ...base,
    location: {
      mode: "mapsUrl" in details ? "url" : "coordinates",
      latitude: String(details.latitude ?? ""),
      longitude: String(details.longitude ?? ""),
      mapsUrl: String(details.mapsUrl ?? ""),
      label: String(details.label ?? ""),
    },
  };
};

export const getReadableDetailRows = (details: Record<string, unknown>) => {
  if ("themeId" in details && "businessName" in details) {
    return [
      { label: "İşletme", value: String(details.businessName ?? "") },
      { label: "Slogan", value: String(details.slogan ?? "") },
      { label: "Şef", value: String(details.chefName ?? "") || "Akıllı Şef" },
      { label: "Telefon", value: String(details.phone ?? "") },
      { label: "E-posta", value: String(details.email ?? "") },
      { label: "Adres", value: String(details.address ?? "") },
      { label: "Tema", value: getMenuTemplate(String(details.themeId ?? "")).name },
    ];
  }
  if ("url" in details) return [{ label: "Link", value: String(details.url ?? "") }];
  if ("ssid" in details) {
    return [
      { label: "SSID", value: String(details.ssid ?? "") },
      { label: "Güvenlik", value: String(details.security ?? "") },
    ];
  }
  if ("mail" in details && !("fullName" in details)) {
    return [
      { label: "Mail", value: String(details.mail ?? "") },
      { label: "Konu", value: String(details.subject ?? "") },
      { label: "Mesaj", value: String(details.body ?? "") },
    ];
  }
  if ("fullName" in details) {
    return [
      { label: "Ad Soyad", value: String(details.fullName ?? "") },
      { label: "Telefon", value: String(details.phone ?? "") },
      { label: "Mail", value: String(details.mail ?? "") },
      { label: "Şirket", value: String(details.company ?? "") },
      { label: "Ünvan", value: String(details.title ?? "") },
    ];
  }
  if ("text" in details) return [{ label: "Metin", value: String(details.text ?? "") }];
  if ("mapsUrl" in details) {
    return [
      { label: "Harita bağlantısı", value: String(details.mapsUrl ?? "") },
      { label: "Etiket", value: String(details.label ?? "") },
    ];
  }
  if ("latitude" in details && "longitude" in details) {
    return [
      { label: "Enlem", value: String(details.latitude ?? "") },
      { label: "Boylam", value: String(details.longitude ?? "") },
      { label: "Etiket", value: String(details.label ?? "") },
    ];
  }
  return [];
};

const formatQrType = (details: Record<string, unknown>) => {
  if ("themeId" in details && "businessName" in details) return "Menü";
  if ("ssid" in details) return "WiFi";
  if ("url" in details) return "Link";
  if ("fullName" in details) return "İletişim";
  if ("mail" in details) return "E-Posta";
  if ("latitude" in details || "mapsUrl" in details) return "Konum";
  if ("text" in details) return "Metin";
  return "QR";
};

const formatQrContent = (details: Record<string, unknown>) => {
  if ("themeId" in details && "businessName" in details) return String(details.businessName ?? "Menü QR");
  if ("url" in details) return String(details.url ?? "");
  if ("ssid" in details) return String(details.ssid ?? "");
  if ("mail" in details && !("fullName" in details)) return String(details.mail ?? "");
  if ("phone" in details && "fullName" in details) return String(details.phone ?? "");
  if ("text" in details) return String(details.text ?? "");
  if ("mapsUrl" in details) {
    const label = String(details.label ?? "");
    return label ? `${label} (${String(details.mapsUrl ?? "")})` : String(details.mapsUrl ?? "");
  }
  if ("latitude" in details && "longitude" in details) {
    const label = "label" in details ? String(details.label ?? "") : "";
    const coords = `${String(details.latitude ?? "")}, ${String(details.longitude ?? "")}`;
    return label ? `${label} (${coords})` : coords;
  }
  return "Detay mevcut";
};

export const mapUserQrToDashboardItem = (qr: UserQrApiItem): DashboardQrItem => ({
  id: qr.qrId,
  merchantId: qr.merchantId ?? 0,
  name: qr.qrName,
  content: formatQrContent(qr.details),
  scans: qr.totalScans ?? 0,
  publicUrl: qr.publicUrl ?? undefined,
  trackingEnabled: qr.trackingEnabled ?? true,
  dailyScans: qr.dailyScans ?? [],
  created: new Date(qr.createdAt).toLocaleDateString("tr-TR"),
  type: formatQrType(qr.details),
  active: qr.active ?? true,
  imgSrc: qr.imgSrc,
  details: qr.details,
  purchaseId: qr.purchaseId ?? null,
  packageName: qr.packageName ?? null,
  legacy: qr.legacy ?? false,
  activePackage: qr.activePackage ?? false,
  menuId: qr.menuId ?? undefined,
});

export const isMenuQrDetails = (details: Record<string, unknown>) =>
  ("themeId" in details && "businessName" in details) ||
  ("menuId" in details && details.menuId != null) ||
  String(details.type ?? "").toLowerCase() === "menu";
