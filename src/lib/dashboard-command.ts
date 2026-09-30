import type { ProductScope } from "@/lib/auth-user";
import { DASHBOARD_NAV_ITEMS, DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

export type DashboardCommandEntry = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords: string;
  requiredScope?: ProductScope;
  requiresAllowAccess?: boolean;
  external?: boolean;
};

const NAV_EXTRA_KEYWORDS: Partial<Record<string, string>> = {
  reservations: "rezervasyon masa misafir",
  products: "ürün yemek fiyat tükendi",
  feedback: "yorum puan şikayet geri bildirim",
  staff: "personel garson aşçı kurye kullanıcı",
  liveOrders: "sipariş mutfak canlı akış",
};

const EXTRA_COMMANDS: DashboardCommandEntry[] = [
  {
    id: "waiter-app",
    label: "Garson uygulaması",
    href: DASHBOARD_ROUTES.waiterPanel,
    group: "Operasyon",
    keywords: "garson sipariş masa teslim müşteriye teslim adisyon",
    requiredScope: "WAITER_PANEL_OWNER",
    external: true,
  },
  {
    id: "kitchen-app",
    label: "Mutfak uygulaması",
    href: DASHBOARD_ROUTES.kitchenPanel,
    group: "Operasyon",
    keywords: "mutfak kds hazırlık sipariş garsona teslim",
    requiredScope: "WAITER_PANEL_OWNER",
    external: true,
  },
  {
    id: "courier-app",
    label: "Kurye uygulaması",
    href: DASHBOARD_ROUTES.courierPanel,
    group: "Operasyon",
    keywords: "kurye teslimat yolda paket sipariş",
    requiredScope: "WAITER_PANEL_OWNER",
    external: true,
  },
  {
    id: "subscription",
    label: "Abonelik",
    href: DASHBOARD_ROUTES.accountSubscription,
    group: "Hesap",
    keywords: "paket fatura abonelik",
  },
];

export function getDashboardCommandEntries(): DashboardCommandEntry[] {
  const fromNav = DASHBOARD_NAV_ITEMS.map((item) => ({
    id: item.key,
    label: item.label,
    href: item.href,
    group: "Sayfalar",
    keywords: `${item.label} ${item.mobileLabel} ${NAV_EXTRA_KEYWORDS[item.key] ?? ""}`.trim(),
    requiredScope: item.requiredScope,
    requiresAllowAccess: item.requiresAllowAccess,
  }));
  return [...fromNav, ...EXTRA_COMMANDS];
}

export function filterCommandEntries(
  entries: DashboardCommandEntry[],
  query: string,
  allowed: (scope?: ProductScope) => boolean,
  hasAllowAccess = true,
): DashboardCommandEntry[] {
  const needle = query.trim().toLocaleLowerCase("tr");
  return entries.filter((entry) => {
    if (entry.requiresAllowAccess && !hasAllowAccess) return false;
    if (!allowed(entry.requiredScope)) return false;
    if (!needle) return true;
    const haystack = `${entry.label} ${entry.keywords}`.toLocaleLowerCase("tr");
    return haystack.includes(needle);
  });
}
