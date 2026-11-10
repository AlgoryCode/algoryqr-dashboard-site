"use client";

import Link from "next/link";
import { ChefHat, type LucideIcon } from "lucide-react";

import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import { ToneIcon, type Tone } from "@/components/dashboard/tone";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { hasScope, type ProductScope } from "@/lib/auth-user";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
  scope: ProductScope;
};

/** The jobs owners start most often, one click from the home page. */
const ACTIONS: QuickAction[] = [
  {
    label: "Ürün ekle",
    hint: "Menüye yeni ürün",
    href: DASHBOARD_ROUTES.digitalMenuProductCreate,
    icon: DASHBOARD_NAV_ICONS.products as LucideIcon,
    tone: "green",
    scope: "QR_MENU_OWNER",
  },
  {
    label: "Menüleri düzenle",
    hint: "Kategori ve sıralama",
    href: DASHBOARD_ROUTES.digitalMenuMenus,
    icon: DASHBOARD_NAV_ICONS.myMenus as LucideIcon,
    tone: "orange",
    scope: "QR_MENU_OWNER",
  },
  {
    label: "QR oluştur",
    hint: "Masa, Wi-Fi, kartvizit",
    href: DASHBOARD_ROUTES.qrCodesNew,
    icon: DASHBOARD_NAV_ICONS.qrCodes as LucideIcon,
    tone: "violet",
    scope: "QR_MENU_OWNER",
  },
  {
    label: "Mutfak ekranı",
    hint: "Hazırlık kuyruğu",
    href: DASHBOARD_ROUTES.kitchenScreen(),
    icon: ChefHat,
    tone: "red",
    scope: "WAITER_PANEL_OWNER",
  },
  {
    label: "Rezervasyonlar",
    hint: "Bugünün masaları",
    href: DASHBOARD_ROUTES.reservations,
    icon: DASHBOARD_NAV_ICONS.reservations as LucideIcon,
    tone: "blue",
    scope: "QR_MENU_OWNER",
  },
  {
    label: "Personel",
    hint: "Hesaplar ve roller",
    href: DASHBOARD_ROUTES.menuUsers,
    icon: DASHBOARD_NAV_ICONS.staff as LucideIcon,
    tone: "teal",
    scope: "WAITER_PANEL_OWNER",
  },
];

export function OverviewQuickActions() {
  const { data: accessProfile } = useAccessProfile();
  const actions = ACTIONS.filter((action) => hasScope(accessProfile, action.scope));
  if (actions.length === 0) return null;

  return (
    <section aria-label="Hızlı işlemler" className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Hızlı işlemler</h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => (
          <li key={action.label} className="min-w-0">
            <Link
              href={action.href}
              className={cn(
                DASHBOARD_SURFACE,
                "flex h-full flex-col gap-3 p-4 transition-colors hover:border-foreground/15 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <ToneIcon tone={action.tone} icon={action.icon} size="lg" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight text-foreground">{action.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{action.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
