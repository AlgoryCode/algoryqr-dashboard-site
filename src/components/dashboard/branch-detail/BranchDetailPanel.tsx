"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bike,
  Building2,
  CalendarDays,
  Check,
  ChefHat,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Hash,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Settings,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { MenuRow, ReviewRow, StaffRow } from "@/components/dashboard/branch-detail/BranchDetailLists";
import { BranchPhoto } from "@/components/dashboard/branch-detail/branch-detail-hero";
import type { BranchOverview } from "@/components/dashboard/branch-detail/branch-detail-types";
import { DigitalMenuIcon } from "@/components/icons/DigitalMenuIcon";
import { ResponsiveSheet } from "@/components/dashboard/reports/ReportShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { invalidateBranches } from "@/hooks/use-branches";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { updateBranchRequest } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

/** Geriye dönük uyumluluk için duruyor; kayıt sekmeleri artık sayfanın içinde. */
export type BranchDetailTab = "overview" | "menus" | "staff" | "reviews";

type RecordTab = "menus" | "staff" | "reviews";

type BranchOption = { id: number; name: string };

type BranchDetailPanelProps = {
  branchId: number;
  name: string;
  branches: BranchOption[];
  tab?: BranchDetailTab;
  onTab?: (tab: BranchDetailTab) => void;
  onSelectBranch: (branchId: number) => void;
  overview: BranchOverview;
  reviews: ReviewRow[];
  menus: MenuRow[];
  staff: StaffRow[];
};

const CARD =
  "rounded-2xl border border-[#ececea] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_6px_rgba(15,23,42,0.05)] dark:border-border dark:bg-card";
const RECORD_PREVIEW = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FlagKey = "kitchenEnabled" | "courierEnabled" | "active";

function parseScore(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function BranchDetailPanel(props: BranchDetailPanelProps) {
  const { branchId, name, branches, onSelectBranch, overview, menus, staff, reviews } = props;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [flags, setFlags] = useState({
    kitchenEnabled: overview.kitchenOn,
    courierEnabled: overview.courierOn,
    active: overview.active,
  });
  const [savingFlag, setSavingFlag] = useState<FlagKey | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [draft, setDraft] = useState({ name, address: "", phone: "", email: "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [recordTab, setRecordTab] = useState<RecordTab>("menus");
  const [listSheet, setListSheet] = useState<RecordTab | null>(null);

  useEffect(() => {
    setFlags({ kitchenEnabled: overview.kitchenOn, courierEnabled: overview.courierOn, active: overview.active });
  }, [overview.active, overview.courierOn, overview.kitchenOn]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const basePayload = () => ({
    name: name.trim(),
    address: overview.address?.trim() || undefined,
    phone: overview.phone?.trim() || undefined,
    email: overview.email?.trim() || undefined,
    kitchenEnabled: flags.kitchenEnabled,
    courierEnabled: flags.courierEnabled,
  });

  const saveFlag = async (key: FlagKey, next: boolean) => {
    const previous = flags[key];
    setFlags((current) => ({ ...current, [key]: next }));
    setSavingFlag(key);
    try {
      await updateBranchRequest(branchId, { ...basePayload(), [key]: next });
      await invalidateBranches(queryClient);
      const label = key === "active" ? "Şube" : key === "kitchenEnabled" ? "Mutfak" : "Kurye";
      toast({ title: `${label} ${next ? "açıldı" : "kapatıldı"}.`, variant: "success" });
    } catch (error) {
      setFlags((current) => ({ ...current, [key]: previous }));
      toast({
        title: error instanceof ApiError ? error.message : "Ayar güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setSavingFlag(null);
    }
  };

  const openInfo = () => {
    setDraft({ name, address: overview.address ?? "", phone: overview.phone ?? "", email: overview.email ?? "" });
    setInfoOpen(true);
  };

  const draftNameValid = draft.name.trim().length > 0;
  const draftEmailValid = !draft.email.trim() || EMAIL_RE.test(draft.email.trim());
  const draftDirty =
    draft.name.trim() !== name.trim() ||
    draft.address.trim() !== (overview.address ?? "").trim() ||
    draft.phone.trim() !== (overview.phone ?? "").trim() ||
    draft.email.trim() !== (overview.email ?? "").trim();

  const saveInfo = async (event: FormEvent) => {
    event.preventDefault();
    if (!draftNameValid || !draftEmailValid || !draftDirty || savingInfo) return;
    setSavingInfo(true);
    try {
      await updateBranchRequest(branchId, {
        name: draft.name.trim(),
        address: draft.address.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        kitchenEnabled: flags.kitchenEnabled,
        courierEnabled: flags.courierEnabled,
      });
      await invalidateBranches(queryClient);
      setInfoOpen(false);
      toast({ title: "Şube bilgileri güncellendi.", variant: "success" });
    } catch (error) {
      toast({
        title: error instanceof ApiError ? error.message : "Şube güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const copy = async (key: string, value: string, label: string) => {
    if (await copyText(value)) {
      setCopied(key);
      toast({ title: `${label} kopyalandı.`, variant: "info" });
    } else {
      toast({ title: `${label} kopyalanamadı.`, variant: "destructive" });
    }
  };

  const averageScore = useMemo(() => {
    const scores = reviews.map((review) => parseScore(review.score)).filter((value): value is number => value != null);
    if (scores.length === 0) return null;
    return scores.reduce((sum, value) => sum + value, 0) / scores.length;
  }, [reviews]);

  const roleSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of staff) counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
    return [...counts.entries()].map(([role, count]) => `${count} ${role.toLocaleLowerCase("tr")}`).join(" · ");
  }, [staff]);

  const firstMenu = menus[0];
  const reportsHref = DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(branchId);

  const shortcuts: ShortcutProps[] = [
    { icon: Plus, label: "Menü ekle", href: DASHBOARD_ROUTES.digitalMenuCreateForBranch(branchId) },
    { icon: UserPlus, label: "Personel", href: DASHBOARD_ROUTES.menuUsersForBranch(branchId) },
    {
      icon: LayoutGrid,
      label: "Masa planı",
      href: DASHBOARD_ROUTES.restaurantLayoutForBranch(branchId, firstMenu?.qrId ?? null),
    },
    { icon: CalendarDays, label: "Rezervasyon", href: DASHBOARD_ROUTES.reservationsForBranch(branchId) },
    { icon: BarChart3, label: "Raporlar", href: reportsHref },
    {
      icon: ChefHat,
      label: "Mutfak ekranı",
      href: DASHBOARD_ROUTES.kitchenScreen(branchId),
      external: true,
      disabled: !flags.kitchenEnabled,
      disabledHint: "Önce mutfağı açın",
    },
  ];

  const contact = [
    overview.phone
      ? { key: "phone", icon: Phone, value: overview.phone, href: `tel:${overview.phone.replace(/\s+/g, "")}` }
      : null,
    overview.address
      ? {
          key: "address",
          icon: MapPin,
          value: overview.address,
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(overview.address)}`,
        }
      : null,
    overview.email ? { key: "email", icon: Mail, value: overview.email, href: `mailto:${overview.email}` } : null,
  ].filter((row): row is { key: string; icon: LucideIcon; value: string; href: string } => row != null);

  const recordTabs: { id: RecordTab; label: string; count: number }[] = [
    { id: "menus", label: "Menüler", count: menus.length },
    { id: "staff", label: "Personel", count: staff.length },
    { id: "reviews", label: "Yorumlar", count: reviews.length },
  ];

  const recordAction: Record<RecordTab, { label: string; href: string } | undefined> = {
    menus: { label: "Menü ekle", href: DASHBOARD_ROUTES.digitalMenuCreateForBranch(branchId) },
    staff: { label: "Personel ekle", href: DASHBOARD_ROUTES.menuUsersForBranch(branchId) },
    reviews: firstMenu ? { label: "Tüm yorumlar", href: DASHBOARD_ROUTES.feedbackForQr(firstMenu.qrId) } : undefined,
  };

  const renderRecords = (tab: RecordTab, limit?: number) => {
    if (tab === "menus") {
      return menus.slice(0, limit).map((menu) => <MenuItemRow key={menu.menuId} menu={menu} />);
    }
    if (tab === "staff") {
      return staff.slice(0, limit).map((member) => <StaffItemRow key={member.id} member={member} branchId={branchId} />);
    }
    return reviews.slice(0, limit).map((review) => <ReviewItemRow key={review.id} review={review} />);
  };

  const activeTabCount = recordTabs.find((tab) => tab.id === recordTab)?.count ?? 0;
  const emptyText: Record<RecordTab, string> = {
    menus: "Bu şubede menü yok.",
    staff: "Bu şubede personel yok.",
    reviews: "Bu şube için henüz yorum yok.",
  };

  return (
    <section className="space-y-4 pb-6 animate-fade-in sm:space-y-5 lg:pb-10">
      {/* Başlık: mobilde şube seçici tam genişlik, eylemler ⋯ menüsünde */}
      <header className="flex items-center gap-2 sm:gap-3">
        <h1 className="hidden shrink-0 text-2xl font-semibold tracking-tight text-foreground sm:block">Şube detayı</h1>
        <div className="min-w-0 flex-1 sm:flex-none">
          <BranchSwitcher currentId={branchId} name={name} branches={branches} onSelectBranch={onSelectBranch} />
        </div>
        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={reportsHref}>
              <BarChart3 className="size-4" />
              Raporlar
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={DASHBOARD_ROUTES.branchSettings(branchId)}>
              <Settings className="size-4" />
              Ayarlar
            </Link>
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            aria-label="Şube işlemleri"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={openInfo} className="gap-2 py-2.5">
              <Pencil className="size-4" />
              Bilgileri düzenle
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 py-2.5">
              <Link href={reportsHref}>
                <BarChart3 className="size-4" />
                Raporlar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 py-2.5">
              <Link href={DASHBOARD_ROUTES.branchSettings(branchId)}>
                <Settings className="size-4" />
                Gelişmiş ayarlar
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Kapak */}
      <section className="relative overflow-hidden rounded-2xl bg-zinc-900 text-white" aria-label="Şube özeti">
        {overview.photoUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(overview.photoUrl)})` }}
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-zinc-900 to-zinc-950" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20 sm:bg-gradient-to-r" aria-hidden />
        <div className="relative flex min-h-[148px] flex-col justify-between gap-5 p-4 sm:min-h-[184px] sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                flags.active ? "bg-emerald-500 text-white" : "bg-white/20 text-white",
              )}
            >
              <span className={cn("size-1.5 rounded-full", flags.active ? "bg-white" : "bg-white/60")} />
              {flags.active ? "Açık" : "Kapalı"}
            </span>
            <button
              type="button"
              onClick={openInfo}
              className="hidden h-8 items-center gap-1.5 rounded-xl bg-white/95 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
            >
              <Pencil className="size-3.5" />
              Bilgileri düzenle
            </button>
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight sm:text-3xl">{name}</h2>
            {contact.length > 0 ? (
              <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {contact.map((row) => (
                  <a
                    key={row.key}
                    href={row.href}
                    target={row.key === "address" ? "_blank" : undefined}
                    rel={row.key === "address" ? "noopener noreferrer" : undefined}
                    className="inline-flex h-8 max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:max-w-sm"
                  >
                    <row.icon className="size-3.5 shrink-0" />
                    <span className="truncate">{row.value}</span>
                  </a>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={openInfo}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs text-white hover:bg-white/25"
              >
                <Plus className="size-3.5" />
                Adres ve telefon ekle
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Kısayollar: mobilde yatay kaydırılan simgeler, masaüstünde 6'lı ızgara */}
      <nav aria-label="Şube kısayolları" className="-mx-4 sm:mx-0">
        <ul className="flex gap-1 overflow-x-auto px-4 pb-1 no-scrollbar snap-x sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {shortcuts.map((shortcut) => (
            <li key={shortcut.label} className="snap-start">
              <Shortcut {...shortcut} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="list" aria-label="Şube özeti">
        <StatTile icon={DigitalMenuIcon} label="Menü" value={menus.length.toLocaleString("tr-TR")} hint={firstMenu?.name ?? "Henüz yok"} onClick={() => setRecordTab("menus")} />
        <StatTile icon={Users} label="Personel" value={staff.length.toLocaleString("tr-TR")} hint={roleSummary || "Henüz yok"} onClick={() => setRecordTab("staff")} />
        <StatTile
          icon={Star}
          label="Puan"
          value={averageScore != null ? averageScore.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : "—"}
          hint={reviews.length > 0 ? `Son ${reviews.length} yorum` : "Henüz yorum yok"}
          onClick={() => setRecordTab("reviews")}
        />
        <StatTile
          icon={Power}
          label="Durum"
          value={flags.active ? "Açık" : "Kapalı"}
          hint={`Mutfak ${flags.kitchenEnabled ? "açık" : "kapalı"} · Kurye ${flags.courierEnabled ? "açık" : "kapalı"}`}
          tone={flags.active ? "positive" : "muted"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Kayıtlar: sekmeli liste */}
        <section className={cn(CARD, "min-w-0 overflow-hidden")} aria-label="Şube kayıtları">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 pt-3 sm:px-4">
            <div role="tablist" aria-label="Kayıt türü" className="-mb-px flex min-w-0 flex-1 gap-0.5 overflow-x-auto no-scrollbar sm:flex-none sm:gap-1">
              {recordTabs.map((tab) => {
                const selected = tab.id === recordTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setRecordTab(tab.id)}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center gap-1 border-b-2 px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-1.5 sm:px-2.5",
                      selected ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] tabular-nums",
                        selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {recordAction[recordTab] ? (
              <Link
                href={recordAction[recordTab]!.href}
                aria-label={recordAction[recordTab]!.label}
                className="mb-1 inline-flex size-10 shrink-0 items-center justify-center gap-1 rounded-full bg-primary/10 text-xs font-medium text-primary hover:bg-primary/15 sm:h-9 sm:w-auto sm:rounded-lg sm:bg-transparent sm:px-2 sm:hover:bg-primary/10"
              >
                {recordTab === "reviews" ? <ChevronRight className="size-4 sm:hidden" /> : <Plus className="size-4 sm:size-3.5" />}
                <span className="hidden sm:inline">{recordAction[recordTab]!.label}</span>
              </Link>
            ) : null}
          </div>
          <div role="tabpanel" className="px-3 pb-2 sm:px-4">
            {activeTabCount === 0 ? (
              <p className="my-4 rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                {emptyText[recordTab]}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">{renderRecords(recordTab, RECORD_PREVIEW)}</ul>
            )}
            {activeTabCount > RECORD_PREVIEW ? (
              <button
                type="button"
                onClick={() => setListSheet(recordTab)}
                className="mb-1 flex h-11 w-full items-center justify-center gap-0.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5"
              >
                Tümünü gör ({activeTabCount.toLocaleString("tr-TR")})
                <ChevronRight className="size-4" />
              </button>
            ) : null}
          </div>
        </section>

        {/* Ayarlar: telefon ayarları gibi gruplu satırlar */}
        <aside className="space-y-4 lg:sticky lg:top-4" aria-label="Şube ayarları">
          <SettingsGroup title="Şube">
            <SettingsRow
              icon={Building2}
              title="Bilgiler"
              subtitle={overview.address || overview.phone || "Adres ve iletişim eklenmedi"}
              onClick={openInfo}
            />
            <SettingsRow
              icon={ImagePlus}
              title="Profil fotoğrafı"
              subtitle={overview.photoUrl ? "Kapakta görünüyor" : "Fotoğraf yok"}
              onClick={() => setPhotoOpen(true)}
              leading={
                overview.photoUrl ? (
                  <img src={overview.photoUrl} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
                ) : undefined
              }
            />
            <SwitchRow
              icon={Power}
              title="Şube açık"
              subtitle={flags.active ? "Sipariş ve rezervasyon alıyor" : "Yeni sipariş alınmıyor"}
              checked={flags.active}
              saving={savingFlag === "active"}
              onChange={(next) => (next ? void saveFlag("active", true) : setCloseConfirm(true))}
            />
          </SettingsGroup>

          <SettingsGroup title="Operasyon">
            <SwitchRow
              icon={ChefHat}
              title="Mutfak"
              subtitle="Siparişler mutfak ekranına düşer"
              checked={flags.kitchenEnabled}
              saving={savingFlag === "kitchenEnabled"}
              onChange={(next) => void saveFlag("kitchenEnabled", next)}
            />
            <SwitchRow
              icon={Bike}
              title="Kurye"
              subtitle="Mutfak siparişleri kuryeye teslim edilir"
              checked={flags.courierEnabled}
              saving={savingFlag === "courierEnabled"}
              onChange={(next) => void saveFlag("courierEnabled", next)}
            />
            {flags.courierEnabled ? (
              <SettingsRow icon={ExternalLink} title="Kurye ekranı" subtitle="Yeni sekmede açılır" href={DASHBOARD_ROUTES.staffGate} external />
            ) : null}
          </SettingsGroup>

          <SettingsGroup title="Kimlik" footer="İşletme ID, personelin giriş ekranında istenir.">
            <CopyRow
              icon={Hash}
              title="Şube ID"
              value={String(branchId)}
              copied={copied === "branch"}
              onCopy={() => void copy("branch", String(branchId), "Şube ID")}
            />
            <CopyRow
              icon={Building2}
              title="İşletme ID"
              value={String(overview.merchantId)}
              copied={copied === "merchant"}
              onCopy={() => void copy("merchant", String(overview.merchantId), "İşletme ID")}
            />
          </SettingsGroup>
        </aside>
      </div>

      {/* Tam liste */}
      <ResponsiveSheet
        open={listSheet != null}
        onOpenChange={(open) => !open && setListSheet(null)}
        icon={listSheet === "staff" ? Users : listSheet === "reviews" ? MessageSquare : DigitalMenuIcon}
        title={recordTabs.find((tab) => tab.id === listSheet)?.label ?? ""}
        description={name}
      >
        <SearchableList
          key={listSheet ?? "none"}
          items={
            listSheet === "staff"
              ? staff.map((member) => ({ key: String(member.id), text: `${member.name} ${member.role}`, node: <StaffItemRow member={member} branchId={branchId} /> }))
              : listSheet === "reviews"
                ? reviews.map((review) => ({ key: String(review.id), text: `${review.title} ${review.comment}`, node: <ReviewItemRow review={review} /> }))
                : menus.map((menu) => ({ key: String(menu.menuId), text: menu.name, node: <MenuItemRow menu={menu} /> }))
          }
        />
      </ResponsiveSheet>

      {/* Fotoğraf */}
      <ResponsiveSheet
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        icon={ImagePlus}
        variant="dialog"
        title="Profil fotoğrafı"
        description="Kapakta ve şube listesinde görünür. JPEG, PNG veya WebP, en fazla 5 MB."
      >
        <BranchPhoto branchId={branchId} name={name} photoUrl={overview.photoUrl} />
      </ResponsiveSheet>

      {/* Bilgi düzenleme */}
      <ResponsiveSheet
        open={infoOpen}
        onOpenChange={(open) => {
          if (!open && savingInfo) return;
          setInfoOpen(open);
        }}
        icon={Building2}
        variant="dialog"
        title="Şube bilgileri"
        description="Adres ve iletişim bilgileri menüde ve fişlerde görünebilir."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 sm:h-10" disabled={savingInfo} onClick={() => setInfoOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              form="branch-info-form"
              className="h-11 sm:h-10"
              disabled={!draftDirty || !draftNameValid || !draftEmailValid || savingInfo}
            >
              {savingInfo ? <Loader2 className="size-4 animate-spin" /> : "Kaydet"}
            </Button>
          </div>
        }
      >
        <form id="branch-info-form" className="space-y-4" onSubmit={(event) => void saveInfo(event)}>
          <Field id="branch-name" label="Şube adı" error={!draftNameValid ? "Şube adı zorunludur." : undefined}>
            <Input id="branch-name" className="h-11 text-base sm:h-10 sm:text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field id="branch-address" label="Adres">
            <Input
              id="branch-address"
              className="h-11 text-base sm:h-10 sm:text-sm"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              placeholder="Mahalle, cadde, no, ilçe"
              autoComplete="street-address"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="branch-phone" label="Telefon">
              <Input
                id="branch-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="h-11 text-base sm:h-10 sm:text-sm"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="0 (5xx) xxx xx xx"
              />
            </Field>
            <Field id="branch-email" label="E-posta" error={!draftEmailValid ? "Geçerli bir e-posta girin." : undefined}>
              <Input
                id="branch-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="h-11 text-base sm:h-10 sm:text-sm"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="sube@isletme.com"
              />
            </Field>
          </div>
        </form>
      </ResponsiveSheet>

      {/* Şubeyi kapatma onayı */}
      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Şube kapatılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{name}</span> kapalı görünecek ve yeni sipariş almayacak.
              İstediğiniz zaman tekrar açabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setCloseConfirm(false);
                void saveFlag("active", false);
              }}
            >
              Şubeyi kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/* ------------------------------------------------------------------ */

type ShortcutProps = {
  icon: LucideIcon;
  label: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
  disabledHint?: string;
};

/** Mobilde uygulama kısayolu gibi (yuvarlak simge + etiket), masaüstünde kart. */
function Shortcut({ icon: Icon, label, href, external, disabled, disabledHint }: ShortcutProps) {
  const className = cn(
    "group flex w-[4.4rem] flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "sm:w-full sm:flex-row sm:gap-2.5 sm:border sm:border-[#ececea] sm:bg-white sm:px-3 sm:py-2.5 sm:text-left sm:dark:border-border sm:dark:bg-card",
    disabled ? "cursor-not-allowed opacity-50" : "active:scale-[0.97] sm:hover:bg-muted/40",
  );
  const content = (
    <>
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#ececea] bg-white text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-border dark:bg-card",
          "sm:size-8 sm:rounded-lg sm:border-0 sm:bg-muted sm:shadow-none",
        )}
      >
        <Icon className="size-5 sm:size-4" />
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground sm:line-clamp-1 sm:flex-1 sm:text-sm">
        {label}
      </span>
      {external && !disabled ? <ExternalLink className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" /> : null}
    </>
  );
  if (disabled) {
    return (
      <span className={className} aria-disabled title={disabledHint}>
        {content}
      </span>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  icon: LucideIcon | typeof DigitalMenuIcon;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "muted";
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate text-xs font-medium">{label}</span>
      </span>
      <span
        className={cn(
          "mt-1.5 block truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
          tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : tone === "muted" ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground sm:text-xs" title={hint}>
        {hint}
      </span>
    </>
  );
  const className = cn(CARD, "block min-w-0 p-3 text-left sm:p-4");
  return onClick ? (
    <button
      type="button"
      role="listitem"
      onClick={onClick}
      className={cn(className, "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]")}
    >
      {body}
    </button>
  ) : (
    <div role="listitem" className={className}>
      {body}
    </div>
  );
}

function SettingsGroup({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className={cn(CARD, "divide-y divide-border/60 overflow-hidden")}>{children}</div>
      {footer ? <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

const ROW = "flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 py-2.5 text-left";

function RowIcon({ icon: Icon, active }: { icon: LucideIcon; active?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-foreground",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

function RowText({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground">{title}</span>
      {subtitle ? <span className="block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
    </span>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
  href,
  external,
  leading,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  leading?: ReactNode;
}) {
  const inner = (
    <>
      {leading ?? <RowIcon icon={icon} />}
      <RowText title={title} subtitle={subtitle} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  );
  const className = cn(ROW, "transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none active:bg-muted/60");
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    ) : (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function SwitchRow({
  icon,
  title,
  subtitle,
  checked,
  saving,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  checked: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = `branch-switch-${title.toLocaleLowerCase("tr").replace(/\s+/g, "-")}`;
  return (
    <div className={ROW}>
      <RowIcon icon={icon} active={checked} />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground" aria-live="polite">
          {saving ? "Kaydediliyor…" : subtitle}
        </span>
      </label>
      {saving ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      <Switch id={id} checked={checked} disabled={saving} onCheckedChange={onChange} />
    </div>
  );
}

function CopyRow({
  icon,
  title,
  value,
  copied,
  onCopy,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`${title} ${value}, kopyala`}
      className={cn(ROW, "transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none active:bg-muted/60")}
    >
      <RowIcon icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{title}</span>
        <span className="block truncate font-mono text-sm font-semibold tabular-nums text-foreground">{value}</span>
      </span>
      <span
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-medium",
          copied ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-foreground",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Kopyalandı" : "Kopyala"}
      </span>
    </button>
  );
}

function BranchSwitcher({
  currentId,
  name,
  branches,
  onSelectBranch,
}: {
  currentId: number;
  name: string;
  branches: BranchOption[];
  onSelectBranch: (branchId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr");
    return needle ? branches.filter((branch) => branch.name.toLocaleLowerCase("tr").includes(needle)) : branches;
  }, [branches, query]);
  if (branches.length <= 1) {
    return (
      <span className="flex h-10 min-w-0 items-center gap-2 text-sm font-medium text-foreground sm:h-9 sm:text-muted-foreground">
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
      </span>
    );
  }
  return (
    <DropdownMenu onOpenChange={(open: boolean) => !open && setQuery("")}>
      <DropdownMenuTrigger className="flex h-10 w-full min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-auto sm:max-w-[16rem]">
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Şube değiştir</DropdownMenuLabel>
        {branches.length > 6 ? (
          <div className="relative px-1.5 pb-1.5">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-[60%] text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Şube ara"
              aria-label="Şube ara"
              className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto">
          {filtered.map((branch) => (
            <DropdownMenuItem key={branch.id} onSelect={() => onSelectBranch(branch.id)} className="gap-2">
              <span className="min-w-0 flex-1 truncate">{branch.name}</span>
              {branch.id === currentId ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          {filtered.length === 0 ? <p className="px-2 py-3 text-center text-xs text-muted-foreground">Şube bulunamadı.</p> : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItemRow({ menu }: { menu: MenuRow }) {
  return (
    <li className="flex items-center gap-2 py-2">
      <Link
        href={DASHBOARD_ROUTES.digitalMenuEdit(menu.qrId)}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-sm font-medium text-foreground hover:bg-muted/50"
      >
        <span className="truncate">{menu.name}</span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </Link>
      {menu.publicHref ? (
        <a
          href={menu.publicHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${menu.name} menüsünü müşteri görünümünde aç`}
          title="Müşteri görünümünde aç"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </li>
  );
}

function StaffItemRow({ member, branchId }: { member: StaffRow; branchId: number }) {
  const initials = member.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("tr");
  return (
    <li>
      <Link
        href={DASHBOARD_ROUTES.menuUserDetail(member.id, branchId)}
        className="flex min-h-14 items-center gap-2.5 rounded-lg px-1 py-2 text-sm hover:bg-muted/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials || "?"}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{member.name}</span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{member.role}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function ReviewItemRow({ review }: { review: ReviewRow }) {
  const score = parseScore(review.score);
  return (
    <li className="space-y-1 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-medium text-foreground">{review.title}</span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            score == null
              ? "bg-muted text-muted-foreground"
              : score >= 4
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : score >= 3
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-destructive/10 text-destructive",
          )}
        >
          <Star className="size-3 fill-current" />
          {review.score}
        </span>
      </div>
      {review.comment ? <p className="line-clamp-2 text-muted-foreground">{review.comment}</p> : null}
    </li>
  );
}

function SearchableList({ items }: { items: { key: string; text: string; node: ReactNode }[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr");
    return needle ? items.filter((item) => item.text.toLocaleLowerCase("tr").includes(needle)) : items;
  }, [items, query]);
  return (
    <div className="space-y-3">
      {items.length > 6 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara…" className="h-9 pl-9" aria-label="Listede ara" />
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Eşleşen kayıt yok.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {filtered.map((item) => (
            <ItemSlot key={item.key}>{item.node}</ItemSlot>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Satır bileşenleri kendi <li> etiketini taşıdığı için ek sarmalayıcı eklemez. */
function ItemSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
