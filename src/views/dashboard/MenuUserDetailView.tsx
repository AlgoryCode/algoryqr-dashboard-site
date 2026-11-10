"use client";

import { useEffect, useMemo, useState, type ElementType, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Percent,
  Pencil,
  Power,
  Sparkles,
  UserRound,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { StaffBranchAssignForm } from "@/components/dashboard/staff/StaffRosterControls";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useWaiterPanelAccess } from "@/components/dashboard/waiter/WaiterPanelAccess";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { formatBranchListLabel, type BranchItem } from "@/lib/branch";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_BACK } from "@/lib/dashboard-surface";
import { useBranches } from "@/hooks/use-branches";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  assignMerchantStaffBranch,
  listMerchantStaff,
  MERCHANT_STAFF_QUERY_KEY,
  parseStaffRole,
  STAFF_ROLE_LABEL,
  WaiterApiError,
  updateMerchantStaff,
  type MenuWaiterMember,
  type StaffRole,
} from "@/lib/personnel-management-api";
import { cn } from "@/lib/utils";

type MenuUserDetailViewProps = {
  waiterId: number;
};

type EditorKind = "profile" | "branch" | "commission" | "security";
type SectionId = EditorKind | "account";
type CommissionType = "PERCENT" | "FIXED";
type CommissionScope = "PER_ITEM" | "BILL_TOTAL";

type UpdatePayload = {
  displayName?: string;
  password?: string;
  active?: boolean;
  commissionEnabled?: boolean;
  commissionType?: CommissionType;
  commissionScope?: CommissionScope;
  commissionValue?: number;
};

const CARD =
  "rounded-2xl border border-[#ececea] bg-white dark:border-border dark:bg-card";

const MIN_PASSWORD = 6;
const MAX_DISPLAY_NAME = 120;

const ROLE_THEME: Record<StaffRole, { banner: string; avatar: string; chip: string }> = {
  WAITER: {
    banner: "from-indigo-500/25 via-violet-500/15 to-transparent",
    avatar: "from-indigo-500 to-violet-500",
    chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  KITCHEN: {
    banner: "from-orange-500/25 via-amber-400/15 to-transparent",
    avatar: "from-orange-500 to-amber-400",
    chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  COURIER: {
    banner: "from-teal-500/25 via-emerald-400/15 to-transparent",
    avatar: "from-teal-500 to-emerald-400",
    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
};

function formatJoinedAt(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function staffBranchLabel(branches: BranchItem[], branchId?: number | null): string {
  if (branchId == null) return "Şubesiz";
  const branch = branches.find((item) => item.id === branchId);
  return branch ? formatBranchListLabel(branch) : `#${branchId}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("tr");
}

function formatNumber(value: number): string {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function parseCommissionValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const parsed = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : null;
}

function commissionSummary(member: MenuWaiterMember): string {
  if (!member.commissionEnabled) return "Kapalı";
  const value = parseCommissionValue(member.commissionValue);
  if (value == null) return "Açık";
  const amount = member.commissionType === "FIXED" ? `${formatNumber(value)} ₺` : `%${formatNumber(value)}`;
  const scope = member.commissionScope === "BILL_TOTAL" ? "hesap toplamı" : "ürün başına";
  return `${amount} · ${scope}`;
}

function commissionPreview(type: CommissionType, value: number | null): string {
  if (value == null || value < 0) return "Bir değer girdiğinizde örnek hesap burada görünür.";
  if (type === "PERCENT") {
    return `1.000 ₺'lik onaylanan bir siparişte personel ${formatNumber((1000 * value) / 100)} ₺ komisyon alır.`;
  }
  return `Adisyona eklenen her ürün adedi için personel ${formatNumber(value)} ₺ komisyon alır (komisyondan muaf ürünler hariç).`;
}

function generatePassword(length = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) values[i] = Math.floor(Math.random() * 2 ** 32);
  }
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join("");
}

function passwordStrength(value: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!value) return { score: 0, label: "" };
  if (value.length < MIN_PASSWORD) return { score: 1, label: `En az ${MIN_PASSWORD} karakter` };
  let variety = 0;
  if (/[a-zçğıöşü]/.test(value)) variety += 1;
  if (/[A-ZÇĞİÖŞÜ]/.test(value)) variety += 1;
  if (/\d/.test(value)) variety += 1;
  if (/[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(value)) variety += 1;
  if (value.length >= 10 && variety >= 3) return { score: 3, label: "Güçlü" };
  if (value.length >= 8 && variety >= 2) return { score: 2, label: "Orta" };
  return { score: 1, label: "Zayıf" };
}

function pendingKind(vars: UpdatePayload | undefined): SectionId | null {
  if (!vars) return null;
  if (vars.password != null) return "security";
  if (vars.active != null) return "account";
  if (vars.displayName != null) return "profile";
  if (vars.commissionEnabled != null) return "commission";
  return null;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function MenuUserDetailView({ waiterId }: MenuUserDetailViewProps) {
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();

  const [editor, setEditor] = useState<EditorKind | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionType, setCommissionType] = useState<CommissionType>("PERCENT");
  const [commissionScope, setCommissionScope] = useState<CommissionScope>("PER_ITEM");
  const [commissionValue, setCommissionValue] = useState("");
  const [accountAction, setAccountAction] = useState<"deactivate" | "activate" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { accessLoading, accessError, retryAccess, canUseWaiterPanel } = useWaiterPanelAccess();
  const branchesQuery = useBranches(canUseWaiterPanel && !accessLoading);
  const branches = branchesQuery.data?.content ?? [];

  const usersQuery = useQuery({
    queryKey: MERCHANT_STAFF_QUERY_KEY,
    enabled: canUseWaiterPanel && !accessLoading,
    queryFn: listMerchantStaff,
  });

  const member = useMemo(
    () => (usersQuery.data ?? []).find((w) => w.id === waiterId) ?? null,
    [usersQuery.data, waiterId],
  );

  useEffect(() => {
    if (!copiedKey) return;
    const timer = window.setTimeout(() => setCopiedKey(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  const backHref = DASHBOARD_ROUTES.menuUsers;

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) => updateMerchantStaff(waiterId, payload),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      if (vars.active === true) notify("info", "Personel aktifleştirildi.");
      else if (vars.active === false) notify("info", "Personel pasifleştirildi.");
      else if (vars.password) notify("info", "Şifre güncellendi.");
      else if (vars.displayName != null) notify("info", "Görünen ad güncellendi.");
      else if (vars.commissionEnabled != null) notify("info", "Komisyon ayarı kaydedildi.");
      else notify("info", "Personel güncellendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof WaiterApiError ? err.message : "Güncelleme başarısız.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (branchId: number | null) => assignMerchantStaffBranch(waiterId, branchId),
    onSuccess: async (_data, branchId) => {
      await queryClient.invalidateQueries({ queryKey: MERCHANT_STAFF_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["menu-users"] });
      await queryClient.invalidateQueries({ queryKey: ["branchDetailUsers"] });
      notify("info", branchId == null ? "Personel şubeden çıkarıldı." : "Personel şubeye atandı.");
    },
    onError: (err) => {
      notify("danger", err instanceof WaiterApiError ? err.message : "Şube ataması yapılamadı.");
    },
  });

  if (accessLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personel detayı" hint="Personel hesabı" />
        <DashboardLoadingState label="Personel bilgileri yükleniyor…" />
      </div>
    );
  }

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (!canUseWaiterPanel) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personel detayı" hint="Personel hesabı" />
        <p className="text-sm text-muted-foreground">Personel paneli bu hesapta açık değil.</p>
      </div>
    );
  }

  const backLink = (
    <Link href={backHref} aria-label="Personeller listesine dön" className={DASHBOARD_BACK}>
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );

  if (usersQuery.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personel detayı" hint="Personel hesabı" back={backLink} />
        <DashboardLoadingState label="Personel bilgileri yükleniyor…" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <DashboardPageHeader title="Personel detayı" hint="Personel hesabı" back={backLink} />
        <div className="space-y-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Personel bulunamadı.</p>
          <Button variant="outline" asChild>
            <Link href={backHref}>Listeye dön</Link>
          </Button>
        </div>
      </div>
    );
  }

  const role = parseStaffRole(member.staffRole);
  const roleLabel = STAFF_ROLE_LABEL[role];
  const theme = ROLE_THEME[role];
  const supportsCommission = role === "WAITER";
  const branchLabel = staffBranchLabel(branches, member.branchId);
  const hasBranch = member.branchId != null;
  const reportsHref = hasBranch
    ? `${DASHBOARD_ROUTES.digitalMenuAnalyticsForBranch(member.branchId as number)}&view=personnel&staff=${member.id}`
    : null;

  const busyKind = updateMutation.isPending ? pendingKind(updateMutation.variables) : null;
  const busy = updateMutation.isPending;

  const trimmedName = displayNameDraft.trim();
  const nameDirty = trimmedName !== (member.displayName ?? "").trim();
  const nameValid = trimmedName.length > 0 && trimmedName.length <= MAX_DISPLAY_NAME;

  const parsedCommission = parseCommissionValue(commissionValue);
  const savedCommissionValue = parseCommissionValue(member.commissionValue);
  const commissionDirty =
    commissionEnabled !== Boolean(member.commissionEnabled) ||
    (commissionEnabled &&
      (commissionType !== (member.commissionType === "FIXED" ? "FIXED" : "PERCENT") ||
        commissionScope !== (member.commissionScope === "BILL_TOTAL" ? "BILL_TOTAL" : "PER_ITEM") ||
        parsedCommission !== savedCommissionValue));

  const strength = passwordStrength(password);
  const passwordValid = password.trim().length >= MIN_PASSWORD;

  /** Taslakları kayıtlı değerlerle doldurup ilgili pencereyi açar. */
  const openEditor = (kind: EditorKind) => {
    if (kind === "profile") setDisplayNameDraft(member.displayName ?? "");
    if (kind === "security") {
      setPassword("");
      setShowPassword(false);
    }
    if (kind === "commission") {
      setCommissionEnabled(Boolean(member.commissionEnabled));
      setCommissionType(member.commissionType === "FIXED" ? "FIXED" : "PERCENT");
      setCommissionScope(member.commissionScope === "BILL_TOTAL" ? "BILL_TOTAL" : "PER_ITEM");
      const value = parseCommissionValue(member.commissionValue);
      setCommissionValue(value == null ? "" : String(value));
    }
    setEditor(kind);
  };

  const closeEditor = (open: boolean) => {
    if (open) return;
    if (updateMutation.isPending || assignMutation.isPending) return;
    setEditor(null);
    setPassword("");
    setShowPassword(false);
  };

  const closeOnSuccess = { onSuccess: () => setEditor(null) };

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    if (!nameDirty || !nameValid || busy) return;
    updateMutation.mutate({ displayName: trimmedName }, closeOnSuccess);
  };

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    if (!passwordValid || busy) return;
    updateMutation.mutate(
      { password: password.trim() },
      {
        onSuccess: () => {
          setPassword("");
          setShowPassword(false);
          setEditor(null);
        },
      },
    );
  };

  const saveCommission = (event: FormEvent) => {
    event.preventDefault();
    if (busy || !commissionDirty) return;
    if (!commissionEnabled) {
      updateMutation.mutate({ commissionEnabled: false }, closeOnSuccess);
      return;
    }
    if (parsedCommission == null || parsedCommission < 0) {
      notify("danger", "Geçerli bir komisyon değeri girin.");
      return;
    }
    if (commissionType === "PERCENT" && parsedCommission > 100) {
      notify("danger", "Yüzde komisyon 100'den büyük olamaz.");
      return;
    }
    updateMutation.mutate(
      {
        commissionEnabled: true,
        commissionType,
        commissionScope,
        commissionValue: parsedCommission,
      },
      closeOnSuccess,
    );
  };

  const handleCopy = async (key: string, value: string, message: string) => {
    const ok = await copyText(value);
    if (ok) {
      setCopiedKey(key);
      notify("info", message);
    } else {
      notify("danger", "Panoya kopyalanamadı.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <DashboardPageHeader
        title="Personel detayı"
        hint="Hesap bilgileri, şube, komisyon ve güvenlik ayarları"
        back={backLink}
        action={
          reportsHref ? (
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
              <Link href={reportsHref}>
                <BarChart3 className="h-4 w-4" />
                Raporlarda gör
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Profil özeti */}
      <section className={cn(CARD, "overflow-hidden")} aria-label="Personel özeti">
        <div className={cn("h-20 bg-gradient-to-r sm:h-24", theme.banner)} aria-hidden />
        <div className="-mt-10 px-4 pb-5 sm:-mt-12 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <div
                className={cn(
                  "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-0.5 shadow-md sm:h-24 sm:w-24",
                  theme.avatar,
                )}
              >
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white text-2xl font-bold text-foreground dark:bg-card sm:text-3xl">
                  {initials(member.displayName)}
                </div>
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {member.displayName}
                  </h2>
                  <IconButton label="Görünen adı düzenle" onClick={() => openEditor("profile")}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="truncate">@{member.username}</span>
                  <IconButton
                    label="Kullanıcı adını kopyala"
                    onClick={() => void handleCopy("username", member.username, "Kullanıcı adı kopyalandı.")}
                  >
                    {copiedKey === "username" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </IconButton>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:justify-end sm:pb-1">
              <Chip className={theme.chip}>{roleLabel}</Chip>
              <Chip
                className={
                  member.active
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }
              >
                <span
                  className={cn(
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                    member.active ? "bg-emerald-500" : "bg-muted-foreground/60",
                  )}
                />
                {member.active ? "Aktif" : "Pasif"}
              </Chip>
              <Chip className="bg-muted text-foreground">
                <CalendarDays className="mr-1 h-3 w-3" />
                {formatJoinedAt(member.createdAt)}
              </Chip>
            </div>
          </div>
        </div>
      </section>

      {!hasBranch ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold">Şube atanmadı.</span> Bu hesap giriş yapsa da şube atanana kadar
              işlem göremez.
            </p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => openEditor("branch")}>
            Şimdi ata
          </Button>
        </div>
      ) : null}

      {/* Ayar kartları */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Personel ayarları">
        <SettingCard
          icon={UserRound}
          title="Profil"
          value={member.displayName}
          meta="Garson ekranı, adisyon ve raporlarda görünen ad"
          actionLabel="Adı düzenle"
          onAction={() => openEditor("profile")}
        />
        <SettingCard
          icon={Building2}
          title="Şube"
          value={branchLabel}
          meta={hasBranch ? "Yalnızca bu şubenin işlemlerini görür" : "Şube atanana kadar işlem göremez"}
          tone={hasBranch ? "default" : "warning"}
          actionLabel={hasBranch ? "Şubeyi değiştir" : "Şubeye ata"}
          onAction={() => openEditor("branch")}
        />
        {supportsCommission ? (
          <SettingCard
            icon={Percent}
            title="Komisyon"
            value={commissionSummary(member)}
            meta={member.commissionEnabled ? "Satışlardan otomatik hesaplanır" : "Komisyon hesaplanmıyor"}
            actionLabel="Komisyonu düzenle"
            onAction={() => openEditor("commission")}
          />
        ) : null}
        <SettingCard
          icon={KeyRound}
          title="Güvenlik"
          value="••••••••"
          meta="Giriş şifresi"
          actionLabel="Şifre sıfırla"
          onAction={() => openEditor("security")}
        />
        <SettingCard
          icon={Power}
          title="Hesap durumu"
          value={member.active ? "Aktif" : "Pasif"}
          meta={member.active ? "Giriş yapabilir" : "Giriş yapamaz, kayıtları korunur"}
          tone={member.active ? "default" : "muted"}
          actionLabel={member.active ? "Pasifleştir" : "Aktifleştir"}
          actionTone={member.active ? "danger" : "positive"}
          busy={busyKind === "account"}
          onAction={() => setAccountAction(member.active ? "deactivate" : "activate")}
        />
        <SettingCard
          icon={BarChart3}
          title="Performans"
          value="Personel raporu"
          meta={hasBranch ? "Satış, ciro, bahşiş ve komisyon" : "Rapor için önce şube atayın"}
          actionLabel="Raporu aç"
          href={reportsHref}
        />
      </div>

      {/* Ad düzenleme */}
      <EditSurface
        open={editor === "profile"}
        onOpenChange={closeEditor}
        icon={UserRound}
        title="Görünen adı düzenle"
        description="Garson ekranında, adisyonlarda ve raporlarda bu isim kullanılır."
        footer={
          <EditFooter onCancel={() => closeEditor(false)} busy={busyKind === "profile"}>
            <Button type="submit" form="staff-name-form" disabled={!nameDirty || !nameValid || busy}>
              {busyKind === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
          </EditFooter>
        }
      >
        <form id="staff-name-form" className="space-y-4" onSubmit={saveName}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="detail-display-name">Görünen ad</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {trimmedName.length}/{MAX_DISPLAY_NAME}
              </span>
            </div>
            <Input
              id="detail-display-name"
              value={displayNameDraft}
              onChange={(e) => setDisplayNameDraft(e.target.value)}
              maxLength={MAX_DISPLAY_NAME}
              autoComplete="off"
              autoFocus
              aria-invalid={!nameValid}
            />
            {!nameValid ? <p className="text-xs text-destructive">Görünen ad boş olamaz.</p> : null}
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2.5 text-sm">
            <p className="text-xs text-muted-foreground">Kullanıcı adı (değiştirilemez)</p>
            <p className="font-medium text-foreground">@{member.username}</p>
          </div>
        </form>
      </EditSurface>

      {/* Şube */}
      <EditSurface
        open={editor === "branch"}
        onOpenChange={closeEditor}
        icon={Building2}
        title={hasBranch ? "Şubeyi değiştir" : "Şubeye ata"}
        description={
          role === "KITCHEN"
            ? "Mutfak hesapları yalnızca mutfağı açık şubelere atanabilir."
            : role === "COURIER"
              ? "Kurye hesapları yalnızca kuryesi açık şubelere atanabilir."
              : "Personel yalnızca atandığı şubenin işlemlerini görür."
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2.5 text-sm">
            <p className="text-xs text-muted-foreground">Mevcut şube</p>
            <p className="font-medium text-foreground">{branchLabel}</p>
          </div>
          <StaffBranchAssignForm
            staffRole={role}
            branchId={member.branchId ?? null}
            branches={branches}
            pending={assignMutation.isPending}
            onAssign={(branchId: number | null) => assignMutation.mutate(branchId, closeOnSuccess)}
          />
        </div>
      </EditSurface>

      {/* Komisyon */}
      {supportsCommission ? (
        <EditSurface
          open={editor === "commission"}
          onOpenChange={closeEditor}
          variant="panel"
          icon={Percent}
          title="Komisyon ayarı"
          description="Personelin satışlarından alacağı payı belirleyin."
          footer={
            <EditFooter onCancel={() => closeEditor(false)} busy={busyKind === "commission"}>
              <Button type="submit" form="staff-commission-form" disabled={!commissionDirty || busy}>
                {busyKind === "commission" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </EditFooter>
          }
        >
          <form id="staff-commission-form" className="space-y-5" onSubmit={saveCommission}>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
              <div>
                <Label htmlFor="commission-enabled" className="text-sm font-medium">
                  Komisyon ile çalışır
                </Label>
                <p className="text-xs text-muted-foreground">Kapalıyken komisyon hesaplanmaz.</p>
              </div>
              <Switch
                id="commission-enabled"
                checked={commissionEnabled}
                onCheckedChange={setCommissionEnabled}
                disabled={busy}
              />
            </div>

            {commissionEnabled ? (
              <>
                <SegmentedControl<CommissionType>
                  label="Komisyon türü"
                  value={commissionType}
                  onChange={setCommissionType}
                  options={[
                    { value: "PERCENT", label: "Yüzde (%)", hint: "Sipariş tutarının yüzdesi" },
                    { value: "FIXED", label: "Sabit tutar (₺)", hint: "Ürün adedi başına" },
                  ]}
                />
                <SegmentedControl<CommissionScope>
                  label="Hesaplama şekli"
                  value={commissionScope}
                  onChange={setCommissionScope}
                  options={[
                    { value: "PER_ITEM", label: "Ürün başına", hint: "Her satılan ürün için" },
                    { value: "BILL_TOTAL", label: "Hesap toplamı", hint: "Hesabın tamamı için" },
                  ]}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="commission-value">
                    {commissionType === "PERCENT" ? "Yüzde değeri" : "Sabit tutar"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="commission-value"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={commissionType === "PERCENT" ? 100 : undefined}
                      step={commissionType === "PERCENT" ? "0.1" : "0.01"}
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      placeholder={commissionType === "PERCENT" ? "örn. 5" : "örn. 50"}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      {commissionType === "PERCENT" ? "%" : "₺"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Hazır değerler">
                    {(commissionType === "PERCENT" ? [3, 5, 10, 15] : [5, 10, 20, 50]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCommissionValue(String(preset))}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          parsedCommission === preset
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        {commissionType === "PERCENT" ? `%${preset}` : `${preset} ₺`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-foreground/90">{commissionPreview(commissionType, parsedCommission)}</p>
                </div>
              </>
            ) : null}
          </form>
        </EditSurface>
      ) : null}

      {/* Şifre */}
      <EditSurface
        open={editor === "security"}
        onOpenChange={closeEditor}
        icon={KeyRound}
        title="Şifre sıfırla"
        description="Eski şifre hemen geçersiz olur. Yeni şifreyi personelle güvenli bir kanaldan paylaşın."
        footer={
          <EditFooter onCancel={() => closeEditor(false)} busy={busyKind === "security"}>
            <Button type="submit" form="staff-password-form" disabled={!passwordValid || busy}>
              {busyKind === "security" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Şifreyi güncelle"}
            </Button>
          </EditFooter>
        }
      >
        <form id="staff-password-form" className="space-y-3" onSubmit={savePassword}>
          <div className="space-y-1.5">
            <Label htmlFor="detail-password">Yeni şifre</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  id="detail-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`En az ${MIN_PASSWORD} karakter`}
                  autoComplete="new-password"
                  autoFocus
                  minLength={MIN_PASSWORD}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label="Şifreyi kopyala"
                disabled={!password}
                onClick={() => void handleCopy("password", password, "Şifre kopyalandı.")}
              >
                {copiedKey === "password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {password ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3].map((step) => (
                    <span
                      key={step}
                      className={cn(
                        "h-1.5 flex-1 rounded-full bg-muted",
                        strength.score >= step &&
                          (strength.score === 1
                            ? "bg-destructive/70"
                            : strength.score === 2
                              ? "bg-amber-500"
                              : "bg-emerald-500"),
                      )}
                    />
                  ))}
                </div>
                <span className="w-28 text-right text-xs text-muted-foreground" aria-live="polite">
                  {strength.label}
                </span>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1.5"
            onClick={() => {
              setPassword(generatePassword());
              setShowPassword(true);
            }}
          >
            <Wand2 className="h-4 w-4" />
            Güçlü şifre üret
          </Button>
        </form>
      </EditSurface>

      <AlertDialog
        open={accountAction != null}
        onOpenChange={(open: boolean) => {
          if (!open && !updateMutation.isPending) setAccountAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {accountAction === "activate" ? "Personel aktifleştirilsin mi?" : "Personel pasifleştirilsin mi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{member.displayName}</span>{" "}
              {accountAction === "activate"
                ? "tekrar giriş yapabilecek."
                : "giriş yapamayacak. Geçmiş kayıtları ve raporları korunur."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateMutation.isPending}
              className={accountAction === "deactivate" ? "bg-destructive hover:bg-destructive/90" : undefined}
              onClick={(event: { preventDefault: () => void }) => {
                event.preventDefault();
                if (!accountAction) return;
                updateMutation.mutate(
                  { active: accountAction === "activate" },
                  { onSuccess: () => setAccountAction(null) },
                );
              }}
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {accountAction === "activate" ? "Aktifleştir" : "Pasifleştir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function SettingCard({
  icon: Icon,
  title,
  value,
  meta,
  actionLabel,
  onAction,
  href,
  tone = "default",
  actionTone = "default",
  busy = false,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  meta: string;
  actionLabel: string;
  onAction?: () => void;
  href?: string | null;
  tone?: "default" | "warning" | "muted";
  actionTone?: "default" | "danger" | "positive";
  busy?: boolean;
}) {
  const actionClass = cn(
    "mt-4 inline-flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    actionTone === "danger"
      ? "border-destructive/30 text-destructive hover:bg-destructive/5"
      : actionTone === "positive"
        ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-300"
        : "border-border text-foreground hover:bg-muted/60",
  );
  const actionContent = (
    <>
      <span>{actionLabel}</span>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
    </>
  );

  return (
    <article
      role="listitem"
      className={cn(
        CARD,
        "flex flex-col p-4",
        tone === "warning" && "border-amber-300/80 dark:border-amber-500/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tone === "warning"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-muted text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p
        className={cn(
          "mt-3 truncate text-lg font-semibold tracking-tight",
          tone === "muted" ? "text-muted-foreground" : "text-foreground",
        )}
        title={value}
      >
        {value}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{meta}</p>
      <div className="mt-auto">
        {href !== undefined ? (
          href ? (
            <Link href={href} className={actionClass}>
              {actionContent}
            </Link>
          ) : (
            <span className={cn(actionClass, "cursor-not-allowed opacity-50 hover:bg-transparent")} aria-disabled>
              {actionContent}
            </span>
          )
        ) : (
          <button type="button" className={actionClass} onClick={onAction} disabled={busy}>
            {actionContent}
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * Masaüstünde ortada dialog (variant="panel" ise sağdan panel), mobilde alttan açılan sayfa.
 */
function EditSurface({
  open,
  onOpenChange,
  variant = "dialog",
  icon: Icon,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "dialog" | "panel";
  icon: LucideIcon;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  const header = (TitleEl: ElementType, DescEl: ElementType) => (
    <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4 pr-12 text-left">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <TitleEl className="text-base font-semibold leading-tight text-foreground">{title}</TitleEl>
        {description ? (
          <DescEl className="mt-1 text-sm text-muted-foreground">{description}</DescEl>
        ) : null}
      </div>
    </div>
  );

  const body = <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>;
  const foot = footer ? (
    <div className="border-t border-border/70 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {footer}
    </div>
  ) : null;

  if (isMobile || variant === "panel") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 p-0",
            isMobile ? "max-h-[92dvh] rounded-t-3xl" : "w-full sm:max-w-md",
          )}
        >
          {isMobile ? (
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            </div>
          ) : null}
          {header(SheetTitle, SheetDescription)}
          {body}
          {foot}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        {header(DialogTitle, DialogDescription)}
        {body}
        {foot}
      </DialogContent>
    </Dialog>
  );
}

function EditFooter({
  onCancel,
  busy,
  children,
}: {
  onCancel: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
        Vazgeç
      </Button>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-background hover:bg-muted/50",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                {selected ? <Check className="h-4 w-4 text-primary" /> : null}
              </span>
              {option.hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

