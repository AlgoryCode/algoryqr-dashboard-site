"use client";

import { Fragment, useEffect, useMemo, type ComponentType } from "react";
import Link from "next/link";
import {
  Building2,
  ChefHat,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Keyboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Package,
  Plus,
  QrCode,
  Search,
  User,
  UserPlus,
  Bike,
  ConciergeBell,
} from "lucide-react";

import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import TrialReminderHeaderBadge from "@/components/dashboard/TrialReminderHeaderBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccessProfile } from "@/hooks/use-access-profile";
import type { StoredUser } from "@/lib/api";
import { hasScope, type ProductScope } from "@/lib/auth-user";
import { activeNavTargetId, buildNavTargets } from "@/lib/dashboard-nav-prefs";
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_ROUTES,
  buildDashboardBreadcrumbs,
} from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";
import { ToneIcon, type Tone } from "@/components/dashboard/tone";

type Icon = ComponentType<{ className?: string }>;

type QuickAction = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: Icon;
  tone: Tone;
  scope?: ProductScope;
};

const QUICK_CREATE: QuickAction[] = [
  { id: "product", tone: "green", label: "Ürün", hint: "Menüye yeni ürün ekle", href: DASHBOARD_ROUTES.digitalMenuProductCreate, icon: Package, scope: "QR_MENU_OWNER" },
  { id: "menu", tone: "orange", label: "Menü", hint: "Yeni dijital menü oluştur", href: DASHBOARD_ROUTES.digitalMenuCreate, icon: DigitalMenuIcon, scope: "QR_MENU_OWNER" },
  { id: "staff", tone: "teal", label: "Personel", hint: "Garson, mutfak ya da kurye hesabı", href: `${DASHBOARD_ROUTES.menuUsers}?yeni=1`, icon: UserPlus, scope: "WAITER_PANEL_OWNER" },
  { id: "campaign", tone: "red", label: "Kampanya", hint: "İndirim veya duyuru başlat", href: DASHBOARD_ROUTES.campaignsCreate, icon: Megaphone, scope: "QR_MENU_OWNER" },
  { id: "branch", tone: "blue", label: "Şube", hint: "Yeni şube ekle", href: DASHBOARD_ROUTES.branchCreate, icon: Building2, scope: "QR_MENU_OWNER" },
  { id: "qr", tone: "violet", label: "QR kod", hint: "Masa veya menü için QR oluştur", href: DASHBOARD_ROUTES.qrCodesNew, icon: QrCode, scope: "QR_CREATE_OWNER" },
];

const STAFF_APPS: { id: string; label: string; hint: string; href: string; icon: Icon; tone: Tone }[] = [
  { id: "waiter", tone: "orange", label: "Garson uygulaması", hint: "Sipariş ve masa takibi", href: DASHBOARD_ROUTES.waiterPanel, icon: ConciergeBell },
  { id: "kitchen", tone: "red", label: "Mutfak uygulaması", hint: "Hazırlık ekranı", href: DASHBOARD_ROUTES.kitchenPanel, icon: ChefHat },
  { id: "courier", tone: "teal", label: "Kurye uygulaması", hint: "Teslimat takibi", href: DASHBOARD_ROUTES.courierPanel, icon: Bike },
];

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Sayfa veya işlem ara" },
  { keys: ["/"], label: "Ara" },
  { keys: ["Alt", "1–9"], label: "Sabitlenen sayfaya git" },
  { keys: ["Ctrl", "B"], label: "Yan menüyü daralt / genişlet" },
  { keys: ["?"], label: "Kısayolları göster" },
  { keys: ["Esc"], label: "Pencereyi veya aramayı kapat" },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function userInitials(user?: StoredUser | null): string {
  const first = user?.first_name?.trim()?.[0] ?? "";
  const last = user?.last_name?.trim()?.[0] ?? "";
  const fromName = `${first}${last}`.trim();
  if (fromName) return fromName.toLocaleUpperCase("tr");
  return (user?.email?.[0] ?? "?").toLocaleUpperCase("tr");
}

function userDisplayName(user?: StoredUser | null): string {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return name || user?.email || "Hesabım";
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

/** "?" tuşu ile açılan kısayol listesi. */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Klavye kısayolları</DialogTitle>
          <DialogDescription>Panelde daha hızlı gezinmek için.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border/70">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-foreground">{shortcut.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 ? <span className="text-xs text-muted-foreground">+</span> : null}
                    <Kbd>{key}</Kbd>
                  </Fragment>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function useShortcutsHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

/** Avatar menüsü: hesap, abonelik, kısayollar, çıkış. Masaüstü ve mobil başlıkta ortak. */
export function AccountMenu({
  user,
  onLogout,
  onShowShortcuts,
  compact,
}: {
  user?: StoredUser | null;
  onLogout: () => void;
  onShowShortcuts: () => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Hesap menüsü"
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full border border-border bg-card p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !compact && "pr-2.5",
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {userInitials(user)}
          </span>
          {!compact ? (
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground xl:inline">
              {userDisplayName(user)}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{userDisplayName(user)}</span>
          {user?.email ? <span className="block truncate text-xs text-muted-foreground">{user.email}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={DASHBOARD_ROUTES.account} className="gap-2">
            <User className="size-4" />
            Hesabım
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={DASHBOARD_ROUTES.accountSubscription} className="gap-2">
            <CreditCard className="size-4" />
            Abonelik ve paket
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={DASHBOARD_ROUTES.modules} className="gap-2">
            <LayoutGrid className="size-4" />
            Modüller
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShowShortcuts} className="gap-2">
          <Keyboard className="size-4" />
          Klavye kısayolları
          <span className="ml-auto text-xs text-muted-foreground">?</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "+ Yeni" menüsü: en sık oluşturulan kayıtlara tek tıkla ulaşım. */
export function QuickCreateMenu({ compact }: { compact?: boolean }) {
  const { data: accessProfile } = useAccessProfile();
  const actions = QUICK_CREATE.filter((action) => !action.scope || hasScope(accessProfile, action.scope));
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label="Yeni oluştur"
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-5" />
          </button>
        ) : (
          <Button size="sm" className="h-9 gap-1.5 rounded-full px-3.5">
            <Plus className="size-4" />
            Yeni
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Hızlı oluştur</DropdownMenuLabel>
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <DropdownMenuItem key={action.id} asChild>
              <Link href={action.href} className="gap-2.5 py-2">
                <ToneIcon tone={action.tone} icon={ActionIcon} size="lg" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{action.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{action.hint}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StaffAppsMenu() {
  const { data: accessProfile } = useAccessProfile();
  if (!hasScope(accessProfile, "WAITER_PANEL_OWNER")) return null;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Personel uygulamaları"
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LayoutGrid className="size-[18px]" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Personel uygulamaları</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Yeni sekmede açılır</DropdownMenuLabel>
        {STAFF_APPS.map((app) => {
          const AppIcon = app.icon;
          return (
            <DropdownMenuItem key={app.id} asChild>
              <a href={app.href} target="_blank" rel="noopener noreferrer" className="gap-2.5 py-2">
                <ToneIcon tone={app.tone} icon={AppIcon} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{app.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{app.hint}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Masaüstü üst bar: konum (breadcrumb) solda, eylemler sağda. Eski geniş arama kutusunun yerini alır. */
export function DashboardTopBar({
  pathname,
  pageLabel,
  user,
  onOpenSearch,
  onLogout,
  onShowShortcuts,
}: {
  pathname: string;
  pageLabel?: string;
  user?: StoredUser | null;
  onOpenSearch: () => void;
  onLogout: () => void;
  onShowShortcuts: () => void;
}) {
  const targets = useMemo(() => buildNavTargets(DASHBOARD_NAV_ITEMS), []);
  const active = useMemo(() => {
    const id = activeNavTargetId(pathname, targets);
    return id ? targets.find((target) => target.id === id) ?? null : null;
  }, [pathname, targets]);
  const crumbs = buildDashboardBreadcrumbs(pathname, pageLabel);
  const trail = crumbs.length > 1 ? crumbs : [{ label: active?.label ?? crumbs[0]?.label ?? "Panel" }];
  const ActiveIcon = active ? DASHBOARD_NAV_ICONS[active.parentKey] : null;

  return (
    // Yapışkan değil: sayfalardaki kendi "sticky top-0" filtre çubuklarının altında kalmasın.
    <div className="relative z-20 hidden border-b border-border bg-background lg:block">
      <div className="flex h-14 items-center gap-3 px-8">
        <nav aria-label="Konum" className="flex min-w-0 flex-1 items-center gap-2">
          {ActiveIcon ? (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ActiveIcon className="size-4" />
            </span>
          ) : null}
          <ol className="flex min-w-0 items-center gap-1 text-sm">
            {trail.map((crumb, index) => {
              const last = index === trail.length - 1;
              const href = "href" in crumb ? crumb.href : undefined;
              return (
                <li key={`${crumb.label}-${index}`} className={cn("flex min-w-0 items-center gap-1", !last && "hidden xl:flex")}>
                  {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden /> : null}
                  {last || !href ? (
                    <span className={cn("truncate", last ? "font-semibold text-foreground" : "text-muted-foreground")} aria-current={last ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <TrialReminderHeaderBadge />
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-9 items-center gap-2 rounded-full border border-border bg-muted/40 pl-3 pr-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sayfa veya işlem ara"
          >
            <Search className="size-4" />
            <span className="hidden xl:inline">Ara</span>
            <span className="flex items-center gap-0.5">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <StaffAppsMenu />
          <QuickCreateMenu />
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          <AccountMenu user={user} onLogout={onLogout} onShowShortcuts={onShowShortcuts} />
        </div>
      </div>
    </div>
  );
}
