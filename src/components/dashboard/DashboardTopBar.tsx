"use client";

import { Fragment, useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Building2,
  ChefHat,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Keyboard,
  LayoutGrid,
  LogOut,
  Megaphone,
  Package,
  QrCode,
  Search,
  Bot,
  User,
  UserPlus,
  Bike,
  ConciergeBell,
  Zap,
} from "lucide-react";

import { DashboardAssistantChat } from "@/components/dashboard/DashboardAssistantChat";
import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { BrandLogo } from "@/components/BrandLogo";
import { SIDEBAR_EASE } from "@/components/dashboard/DashboardSidebarNav";
import TrialReminderHeaderBadge from "@/components/dashboard/TrialReminderHeaderBadge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import type { StoredUser } from "@/lib/api";
import { hasScope, type ProductScope } from "@/lib/auth-user";
import {
  DASHBOARD_ROUTES,
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
  { id: "product", tone: "green", label: "Ürün ekle", hint: "Menüye yeni ürün", href: DASHBOARD_ROUTES.digitalMenuProductCreate, icon: Package, scope: "QR_MENU_OWNER" },
  { id: "menu", tone: "red", label: "Menü oluştur", hint: "Yeni dijital menü", href: DASHBOARD_ROUTES.digitalMenuCreate, icon: DigitalMenuIcon, scope: "QR_MENU_OWNER" },
  { id: "staff", tone: "teal", label: "Personel ekle", hint: "Garson, mutfak, kurye", href: `${DASHBOARD_ROUTES.menuUsers}?yeni=1`, icon: UserPlus, scope: "WAITER_PANEL_OWNER" },
  { id: "campaign", tone: "red", label: "Kampanya başlat", hint: "İndirim veya duyuru", href: DASHBOARD_ROUTES.campaignsCreate, icon: Megaphone, scope: "QR_MENU_OWNER" },
  { id: "branch", tone: "blue", label: "Şube ekle", hint: "Yeni işletme noktası", href: DASHBOARD_ROUTES.branchCreate, icon: Building2, scope: "QR_MENU_OWNER" },
  { id: "qr", tone: "violet", label: "QR kod oluştur", hint: "Masa veya menü için", href: DASHBOARD_ROUTES.qrCodesNew, icon: QrCode, scope: "QR_CREATE_OWNER" },
];

const STAFF_APPS: { id: string; label: string; hint: string; href: string; icon: Icon; tone: Tone }[] = [
  { id: "waiter", tone: "red", label: "Garson uygulaması", hint: "Sipariş ve masa takibi", href: DASHBOARD_ROUTES.waiterPanel, icon: ConciergeBell },
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
}: {
  user?: StoredUser | null;
  onLogout: () => void;
  onShowShortcuts: () => void;
}) {
  // The stored user can be empty (e.g. after an admin "login as"); fall back to the profile API.
  const needsProfile = !user?.first_name?.trim() && !user?.email?.trim();
  const { data: profile } = useMyProfile(needsProfile);
  const effectiveUser: StoredUser | null =
    needsProfile && profile
      ? {
          email: profile.email ?? "",
          first_name: profile.firstName ?? undefined,
          last_name: profile.lastName ?? undefined,
        }
      : user ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Hesap menüsü"
          title={userDisplayName(effectiveUser)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F3] text-xs font-semibold text-[#F03245] transition-shadow hover:ring-2 hover:ring-[#F03245]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-2 data-[state=open]:ring-[#F03245]/40 dark:bg-[#F03245]/15 dark:text-[#FB7185]"
        >
          {userInitials(effectiveUser)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{userDisplayName(effectiveUser)}</span>
          {effectiveUser?.email ? <span className="block truncate text-xs text-muted-foreground">{effectiveUser.email}</span> : null}
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

/** "Hızlı işlemler" menüsü: en sık yapılan işlemlere (ürün, menü, personel…) tek tıkla ulaşım. */
export function QuickCreateMenu({ compact }: { compact?: boolean }) {
  const { data: accessProfile } = useAccessProfile();
  const actions = QUICK_CREATE.filter((action) => !action.scope || hasScope(accessProfile, action.scope));
  const staffApps = hasScope(accessProfile, "WAITER_PANEL_OWNER") ? STAFF_APPS : [];
  if (actions.length === 0 && staffApps.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label="Hızlı işlemler"
            className="inline-flex size-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
          >
            <Zap className="size-[18px]" />
          </button>
        ) : (
          <button
            type="button"
            className="group inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card pl-2 pr-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted/60"
          >
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-3.5" strokeWidth={2.25} />
            </span>
            Hızlı işlemler
            <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[22rem] p-2">
        <div className="px-1.5 pb-2 pt-1">
          <p className="text-sm font-semibold text-foreground">Hızlı işlemler</p>
          <p className="text-xs text-muted-foreground">Sık yaptığınız işlemleri buradan tek tıkla başlatın.</p>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <DropdownMenuItem
                key={action.id}
                asChild
                className="flex-col items-start gap-2 rounded-xl border border-transparent p-2.5 focus:border-border focus:bg-muted/60"
              >
                <Link href={action.href}>
                  <ToneIcon tone={action.tone} icon={ActionIcon} size="lg" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{action.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{action.hint}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
        {staffApps.length > 0 ? (
          <>
            <DropdownMenuSeparator className="my-2" />
            <div className="flex items-baseline justify-between gap-2 px-1.5 pb-1">
              <p className="text-xs font-semibold text-foreground">Personel uygulamaları</p>
              <p className="text-[11px] text-muted-foreground">Yeni sekmede açılır</p>
            </div>
            {staffApps.map((app) => {
              const AppIcon = app.icon;
              return (
                <DropdownMenuItem key={app.id} asChild className="gap-2.5 rounded-xl py-2 focus:bg-muted/60">
                  <a href={app.href} target="_blank" rel="noopener noreferrer">
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
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shared look for the round icon buttons in the desktop and mobile top bars. */
export const TOPBAR_ICON_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[#FFF0F3] hover:text-[#F03245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-[#FFF0F3] data-[state=open]:text-[#F03245] dark:hover:bg-[#F03245]/15 dark:hover:text-[#FB7185] dark:data-[state=open]:bg-[#F03245]/15 dark:data-[state=open]:text-[#FB7185]";

/**
 * Desktop top bar: brand (only while the sidebar is collapsed) and search on the left,
 * actions on the right. Breadcrumbs live in the page content instead.
 */
export function DashboardTopBar({
  collapsed = false,
  user,
  onOpenSearch,
  onLogout,
  onShowShortcuts,
}: {
  collapsed?: boolean;
  user?: StoredUser | null;
  onOpenSearch: () => void;
  onLogout: () => void;
  onShowShortcuts: () => void;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    // Yapışkan değil: sayfalardaki kendi "sticky top-0" filtre çubuklarının altında kalmasın.
    <div className="relative z-20 hidden border-b border-border bg-card lg:block">
      <div className="flex h-16 items-center gap-3 px-6 xl:px-8">
        {/* The logo slides in here when the sidebar collapses, and out again when it opens. */}
        <div
          inert={!collapsed}
          aria-hidden={!collapsed || undefined}
          className={cn(
            "grid shrink-0 transition-[grid-template-columns,opacity] duration-300 motion-reduce:transition-none",
            SIDEBAR_EASE,
            collapsed ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
          )}
        >
          <div className="flex items-center overflow-hidden">
            <Link
              href={DASHBOARD_ROUTES.overview}
              className="flex shrink-0 items-center gap-2 rounded-xl py-1 pr-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BrandLogo size="sm" className="h-8 max-w-none sm:h-8" />
              <span className="whitespace-nowrap text-base font-bold">
                Algory<span className="text-muted-foreground">QR</span>
              </span>
            </Link>
            <span className="mx-2 h-6 w-px shrink-0 bg-border" aria-hidden />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex h-10 w-full max-w-md min-w-0 items-center gap-2.5 rounded-xl border border-border bg-muted/40 pl-3 pr-2 text-sm text-muted-foreground transition-colors hover:border-[#F03245]/30 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Sayfa veya işlem ara"
        >
          <Search className="size-4 shrink-0 transition-colors group-hover:text-[#F03245]" />
          <span className="min-w-0 flex-1 truncate text-left">Sayfa veya işlem ara…</span>
          <span className="hidden shrink-0 items-center gap-0.5 xl:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <TrialReminderHeaderBadge />
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="group inline-flex h-9 items-center gap-2 rounded-xl bg-[#FFF0F3] pl-2.5 pr-3 text-sm font-medium text-[#F03245] transition-colors hover:bg-[#FFE3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F03245]/40 dark:bg-[#F03245]/15 dark:text-[#FB7185] dark:hover:bg-[#F03245]/25"
            aria-label="Asistana sor"
          >
            <Bot className="size-4 text-primary transition-transform duration-300 group-hover:rotate-12" aria-hidden />
            Asistana sor
          </button>
          <QuickCreateMenu />
          <span className="mx-2 h-6 w-px bg-border" aria-hidden />
          <AccountMenu user={user} onLogout={onLogout} onShowShortcuts={onShowShortcuts} />
        </div>
      </div>
      <DashboardAssistantChat open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
}
