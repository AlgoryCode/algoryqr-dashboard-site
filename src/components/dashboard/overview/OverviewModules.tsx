"use client";

import Link from "next/link";
import {
  BookOpen,
  Calculator,
  ClipboardList,
  IdCard,
  Megaphone,
  Settings,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { useAccessProfile } from "@/hooks/use-access-profile";
import { useAccessSession } from "@/hooks/use-commerce";
import { hasScope, type ProductScope } from "@/lib/auth-user";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_ICON_WELL, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";

type ModuleLink = {
  label: string;
  href: string;
  requiredScope?: ProductScope;
  requiresAllowAccess?: boolean;
};

type OverviewModule = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  links: ModuleLink[];
};

const OVERVIEW_MODULES: OverviewModule[] = [
  {
    id: "orders",
    title: "Siparişler ve rezervasyon",
    description: "Canlı sipariş akışı, masa planı ve rezervasyon takvimi",
    icon: ClipboardList,
    links: [
      { label: "Canlı akış", href: DASHBOARD_ROUTES.kitchenScreen(), requiredScope: "WAITER_PANEL_OWNER" },
      { label: "Online siparişler", href: DASHBOARD_ROUTES.onlineOrderOrders, requiredScope: "QR_MENU_OWNER" },
      { label: "Masa planı", href: DASHBOARD_ROUTES.restaurantLayout, requiredScope: "WAITER_PANEL_OWNER" },
      { label: "Rezervasyonlar", href: DASHBOARD_ROUTES.reservations, requiredScope: "QR_MENU_OWNER" },
    ],
  },
  {
    id: "menu",
    title: "Menü",
    description: "Ürün, fiyat, kategori ve seçenekler",
    icon: BookOpen,
    links: [
      { label: "Menülerim", href: DASHBOARD_ROUTES.digitalMenuMenus, requiredScope: "QR_MENU_OWNER" },
      { label: "Ürünler", href: DASHBOARD_ROUTES.digitalMenuProducts, requiredScope: "QR_MENU_OWNER" },
      { label: "Kategoriler", href: DASHBOARD_ROUTES.digitalMenuCategories, requiredScope: "QR_MENU_OWNER" },
    ],
  },
  {
    id: "stock",
    title: "Stok",
    description: "Hammadde, kritik seviye, fire ve reçeteye göre otomatik düşüm",
    icon: Warehouse,
    links: [{ label: "Hammaddeler", href: DASHBOARD_ROUTES.stock, requiredScope: "QR_MENU_OWNER" }],
  },
  {
    id: "staff",
    title: "Personel",
    description: "Personel hesapları, roller ve performans",
    icon: IdCard,
    links: [
      { label: "Personel", href: DASHBOARD_ROUTES.menuUsers, requiredScope: "WAITER_PANEL_OWNER" },
      { label: "Performans", href: DASHBOARD_ROUTES.reportsHub, requiredScope: "SMART_REPORTING_OWNER" },
    ],
  },
  {
    id: "finance",
    title: "Finans ve muhasebe",
    description: "Ciro, gider kayıtları, kâr-zarar ve tahsilat türleri",
    icon: Calculator,
    links: [
      { label: "Gelir-gider", href: DASHBOARD_ROUTES.muhasebe, requiresAllowAccess: true },
      { label: "Ciro raporu", href: DASHBOARD_ROUTES.reportsHub, requiredScope: "SMART_REPORTING_OWNER" },
    ],
  },
  {
    id: "marketing",
    title: "Müşteri ve pazarlama",
    description: "Yorumlar, müşteriler, kampanya ve kuponlar",
    icon: Megaphone,
    links: [
      { label: "Yorumlar", href: DASHBOARD_ROUTES.feedback, requiredScope: "QR_MENU_OWNER" },
      { label: "Müşteriler", href: DASHBOARD_ROUTES.menuCustomers, requiredScope: "WAITER_PANEL_OWNER" },
      { label: "Kampanyalar", href: DASHBOARD_ROUTES.campaigns, requiredScope: "QR_MENU_OWNER" },
    ],
  },
  {
    id: "reports",
    title: "Raporlar ve analiz",
    description: "Saatlik yoğunluk, ürün satışları, şube karşılaştırma",
    icon: TrendingUp,
    links: [
      { label: "Raporlar", href: DASHBOARD_ROUTES.reportsHub, requiredScope: "SMART_REPORTING_OWNER" },
      { label: "Akıllı raporlar", href: DASHBOARD_ROUTES.smartReports, requiredScope: "SMART_REPORTING_OWNER" },
    ],
  },
  {
    id: "settings",
    title: "Ayarlar",
    description: "Şubeler, çalışma bilgileri, ödeme ve entegrasyonlar",
    icon: Settings,
    links: [
      { label: "Şubeler", href: DASHBOARD_ROUTES.myBranches, requiredScope: "QR_MENU_OWNER" },
      { label: "Entegrasyonlar", href: DASHBOARD_ROUTES.integrations, requiredScope: "QR_MENU_OWNER" },
      { label: "Hesap", href: DASHBOARD_ROUTES.account },
    ],
  },
];

export function OverviewModules() {
  const { data: accessProfile } = useAccessProfile();
  const accessSession = useAccessSession();
  const hasAllowAccess = accessSession.data?.decision === "ALLOW";

  const modules = OVERVIEW_MODULES.map((module) => ({
    ...module,
    links: module.links.filter(
      (link) =>
        (!link.requiresAllowAccess || hasAllowAccess) &&
        (!link.requiredScope || hasScope(accessProfile, link.requiredScope)),
    ),
  })).filter((module) => module.links.length > 0);

  if (modules.length === 0) return null;

  return (
    <section aria-label="Modüller">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modüller</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article key={module.id} className={`${DASHBOARD_SURFACE} flex flex-col p-4`}>
              <Link href={module.links[0].href} className="group flex items-start gap-3">
                <span className={`${DASHBOARD_ICON_WELL} h-9 w-9 text-sm`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground group-hover:underline">
                    {module.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {module.description}
                  </span>
                </span>
              </Link>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {module.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
