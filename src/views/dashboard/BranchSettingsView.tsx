"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight, CookingPot, ImagePlus, Loader2, Printer, Trash2 } from "lucide-react";

import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequireScope } from "@/components/auth/RequireScope";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useDashboardPageLabel } from "@/contexts/dashboard-page-label";
import { invalidateBranches, useBranch, useBranches, BRANCHES_QUERY_KEY } from "@/hooks/use-branches";
import { ApiError } from "@/lib/api";
import {
  applyBranchPhotoToAllBranchesRequest,
  applyBranchPhotoToAllMenusRequest,
  canCreateMenuOnBranch,
  deleteBranchPhotoRequest,
  deleteBranchRequest,
  enableBranchKitchenRequest,
  isBranchKitchenEnabled,
  isBranchPrintKitchenEnabled,
  updateBranchRequest,
  uploadBranchPhotoRequest,
} from "@/lib/branch";
import {
  listFailedPrintJobsRequest,
  listPrintDevicesRequest,
  retryPrintJobRequest,
  setPrintDeviceEnabledRequest,
  setPrintKitchenEnabledRequest,
  type PrintAgentDevice,
  type PrintFailedJob,
} from "@/lib/print-agent";
import { DASHBOARD_BACK, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";
import { createMenuWaiter, WaiterApiError } from "@/lib/waiter-api";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SOFT_CARD_CLASS = DASHBOARD_SURFACE;

type BranchSettingsViewProps = {
  branchId: number;
};

type SettingsSectionProps = {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  tone?: "default" | "danger";
};

function SettingsSection({
  title,
  description,
  open,
  onOpenChange,
  children,
  tone = "default",
}: SettingsSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          SOFT_CARD_CLASS,
          tone === "danger" && "border-destructive/25",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 p-5 text-left sm:p-6"
          >
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              {description ? (
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t border-border px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function BranchSettingsView({ branchId }: BranchSettingsViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { accessLoading, canUseDigitalMenu } = useDigitalMenuAccess();
  const branchesQuery = useBranches(canUseDigitalMenu);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hydratedFor, setHydratedFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState<"branches" | "menus" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [menusOpen, setMenusOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [kitchenOpen, setKitchenOpen] = useState(true);
  const [kitchenDialogOpen, setKitchenDialogOpen] = useState(false);
  const [kitchenDisplayName, setKitchenDisplayName] = useState("");
  const [kitchenUsername, setKitchenUsername] = useState("");
  const [kitchenPassword, setKitchenPassword] = useState("");
  const [kitchenSaving, setKitchenSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(true);
  const [printBusy, setPrintBusy] = useState(false);
  const [printDevices, setPrintDevices] = useState<PrintAgentDevice[]>([]);
  const [failedJobs, setFailedJobs] = useState<PrintFailedJob[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [branchRemoved, setBranchRemoved] = useState(false);
  const leavingAfterDeleteRef = useRef(false);

  const branchQuery = useBranch(branchId, canUseDigitalMenu && !deleting && !branchRemoved);
  const branch = branchQuery.data ?? null;
  useDashboardPageLabel(branch?.name);
  const menus = branch?.menus ?? [];
  const hasMenus = menus.length > 0;
  const kitchenEnabled = isBranchKitchenEnabled(branch);
  const printKitchenEnabled = isBranchPrintKitchenEnabled(branch);
  const canAddMenu = branch
    ? canCreateMenuOnBranch(branch, branchesQuery.data?.menuQuota)
    : false;

  useEffect(() => {
    if (!branch || !canUseDigitalMenu) return;
    let cancelled = false;
    void (async () => {
      try {
        const [devices, failed] = await Promise.all([
          listPrintDevicesRequest(branchId),
          listFailedPrintJobsRequest(branchId),
        ]);
        if (cancelled) return;
        setPrintDevices(devices);
        setFailedJobs(failed);
      } catch {
        if (cancelled) return;
        setPrintDevices([]);
        setFailedJobs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branch, branchId, canUseDigitalMenu, printKitchenEnabled]);

  const refreshPrintData = async () => {
    const [devices, failed] = await Promise.all([
      listPrintDevicesRequest(branchId),
      listFailedPrintJobsRequest(branchId),
    ]);
    setPrintDevices(devices);
    setFailedJobs(failed);
  };

  const togglePrintKitchen = async () => {
    setPrintBusy(true);
    try {
      await setPrintKitchenEnabledRequest(branchId, !printKitchenEnabled);
      await invalidateBranches(queryClient);
      notify("info", !printKitchenEnabled ? "Otomatik mutfak fişi açıldı." : "Otomatik mutfak fişi kapatıldı.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Yazıcı ayarı güncellenemedi.");
    } finally {
      setPrintBusy(false);
    }
  };

  const toggleDevice = async (device: PrintAgentDevice) => {
    setPrintBusy(true);
    try {
      await setPrintDeviceEnabledRequest(device.id, !device.enabled);
      await refreshPrintData();
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Cihaz güncellenemedi.");
    } finally {
      setPrintBusy(false);
    }
  };

  const retryFailedJob = async (job: PrintFailedJob) => {
    setPrintBusy(true);
    try {
      await retryPrintJobRequest(job.id);
      await refreshPrintData();
      notify("info", "Fiş tekrar kuyruğa alındı. Windows ajanı basacak.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Tekrar yazdırılamadı.");
    } finally {
      setPrintBusy(false);
    }
  };

  useEffect(() => {
    if (!branch || hydratedFor === branch.id) return;
    setName(branch.name ?? "");
    setAddress(branch.address ?? "");
    setPhone(branch.phone ?? "");
    setEmail(branch.email ?? "");
    setHydratedFor(branch.id);
    setMenusOpen(branch.menus.length > 0);
    setKitchenOpen(true);
  }, [branch, hydratedFor]);

  useEffect(() => {
    if (leavingAfterDeleteRef.current || deleting || branchRemoved) return;
    if (branchQuery.isError) {
      notify("danger", branchQuery.error instanceof ApiError ? branchQuery.error.message : "Şube yüklenemedi.");
      router.push(DASHBOARD_ROUTES.digitalMenu);
    }
  }, [branchQuery.error, branchQuery.isError, branchRemoved, deleting, notify, router]);

  const finishBranchDelete = async () => {
    leavingAfterDeleteRef.current = true;
    setBranchRemoved(true);
    setDeleteConfirmOpen(false);
    queryClient.removeQueries({ queryKey: [...BRANCHES_QUERY_KEY, branchId] });
    await queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY, exact: true });
    notify("info", "Şube silindi.");
    router.push(DASHBOARD_ROUTES.digitalMenu);
  };

  const save = async () => {
    if (!name.trim()) {
      notify("warning", "Şube adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      await updateBranchRequest(branchId, {
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      await invalidateBranches(queryClient);
      notify("info", "Şube bilgileri güncellendi.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Şube güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      notify("warning", "Desteklenen formatlar: JPEG, PNG, WebP");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      notify("warning", "Fotoğraf boyutu en fazla 5 MB olabilir.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      await uploadBranchPhotoRequest(branchId, file);
      await invalidateBranches(queryClient);
      notify("info", "Şube fotoğrafı güncellendi.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await deleteBranchPhotoRequest(branchId);
      await invalidateBranches(queryClient);
      notify("info", "Şube fotoğrafı silindi.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Fotoğraf silinemedi.");
    } finally {
      setUploading(false);
    }
  };

  const applyPhoto = async (target: "branches" | "menus") => {
    setApplying(target);
    try {
      if (target === "branches") {
        await applyBranchPhotoToAllBranchesRequest(branchId);
        notify("info", "Fotoğraf tüm şubelere uygulandı.");
      } else {
        await applyBranchPhotoToAllMenusRequest(branchId);
        notify("info", "Fotoğraf tüm menülere uygulandı.");
      }
      await invalidateBranches(queryClient);
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Fotoğraf uygulanamadı.");
    } finally {
      setApplying(null);
    }
  };

  const resetKitchenForm = () => {
    setKitchenDisplayName("");
    setKitchenUsername("");
    setKitchenPassword("");
  };

  const addKitchen = async () => {
    const displayName = kitchenDisplayName.trim();
    const username = kitchenUsername.trim();
    if (!displayName || !username || kitchenPassword.length < 6) {
      notify("warning", "Mutfak hesabı için görünen ad, kullanıcı adı ve en az 6 karakter şifre gerekir.");
      return;
    }
    setKitchenSaving(true);
    try {
      if (!kitchenEnabled) {
        await enableBranchKitchenRequest(branchId);
      }
      await createMenuWaiter(branchId, {
        username,
        password: kitchenPassword,
        displayName,
        staffRole: "KITCHEN",
      });
      await invalidateBranches(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["menu-users", branchId] });
      setKitchenDialogOpen(false);
      resetKitchenForm();
      notify("info", kitchenEnabled ? "Mutfak hesabı eklendi." : "Mutfak eklendi.");
    } catch (error) {
      notify(
        "danger",
        error instanceof WaiterApiError || error instanceof ApiError
          ? error.message
          : "Mutfak eklenemedi.",
      );
    } finally {
      setKitchenSaving(false);
    }
  };

  const removeBranch = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteBranchRequest(branchId);
      await finishBranchDelete();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        await finishBranchDelete();
        return;
      }
      leavingAfterDeleteRef.current = false;
      notify("danger", error instanceof ApiError ? error.message : "Şube silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  if (accessLoading || branchQuery.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader title="Şube ayarları" hint="Şube bilgileri yükleniyor" />
        <DashboardLoadingState label="Şube ayarları yükleniyor…" />
      </div>
    );
  }

  if (!canUseDigitalMenu) {
    return <p className="text-sm text-muted-foreground">Şube ayarları için aktif paket gerekir.</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Şube ayarları"
        hint={branch?.name ?? "Şube bilgileri"}
        back={
          <Link href={DASHBOARD_ROUTES.digitalMenu} aria-label="Menüye dön" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <SettingsSection
        title="Şube bilgileri"
        description="Ad, adres ve iletişim bilgileri"
        open={infoOpen}
        onOpenChange={setInfoOpen}
      >
        <div className="space-y-2">
          <Label htmlFor="branch-name">Şube adı</Label>
          <Input id="branch-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-address">Adres</Label>
          <Input id="branch-address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-phone">Telefon</Label>
          <Input id="branch-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-email">E-posta</Label>
          <Input id="branch-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="flex justify-end pt-1">
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Şube fotoğrafı"
        description="JPEG, PNG veya WebP · en fazla 5 MB"
        open={photoOpen}
        onOpenChange={setPhotoOpen}
      >
        {branch?.photoUrl ? (
          <img
            src={branch.photoUrl}
            alt={branch.name}
            className="h-28 w-28 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handlePhoto(event)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fotoğraf yükle"}
          </Button>
          {branch?.photoUrl ? (
            <Button variant="outline" disabled={uploading} onClick={() => void removePhoto()}>
              Fotoğrafı sil
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={!branch?.photoUrl || applying != null}
            onClick={() => void applyPhoto("branches")}
          >
            {applying === "branches" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tüm şubelere uygula"}
          </Button>
          <Button
            variant="outline"
            disabled={!branch?.photoUrl || applying != null}
            onClick={() => void applyPhoto("menus")}
          >
            {applying === "menus" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tüm menülere uygula"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Menüler"
        description={
          hasMenus
            ? `${menus.length} menü · bu şubeye bağlı dijital menüler`
            : "Bu şubede henüz menü yok · ilk menü ücretsiz"
        }
        open={menusOpen}
        onOpenChange={setMenusOpen}
      >
        {hasMenus ? (
          <div className="space-y-2">
            {menus.map((menu) => (
              <Link
                key={menu.menuId}
                href={DASHBOARD_ROUTES.digitalMenuEdit(menu.qrId)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-3 py-2.5 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{menu.businessName}</p>
                  {!menu.active ? (
                    <p className="text-xs text-muted-foreground">Yayında değil</p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Henüz menü oluşturulmadı.</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              canAddMenu
                ? DASHBOARD_ROUTES.digitalMenuCreateForBranch(branchId)
                : DASHBOARD_ROUTES.catalogProductCheckout("QR_MENU"),
            )
          }
        >
          {canAddMenu ? "Menü oluştur" : "Ek menü satın al"}
        </Button>
      </SettingsSection>

      <RequireScope scope="WAITER_PANEL_OWNER" loading={null}>
        <SettingsSection
          title="Restoran düzeni"
          description={
            hasMenus
              ? "Alanlar ve masalar · bu şubedeki menüler için"
              : "Restoran düzeni için önce bir menü oluşturun"
          }
          open={layoutOpen}
          onOpenChange={setLayoutOpen}
        >
          {hasMenus ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Teras, iç mekan gibi alanları oluşturun; masaları bu alanların altında yönetin.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={DASHBOARD_ROUTES.restaurantLayoutForBranch(branchId)}>
                  Düzeni yönet
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz menü oluşturulmadı.</p>
          )}
        </SettingsSection>
      </RequireScope>

      <RequireScope scope="WAITER_PANEL_OWNER" loading={null}>
        <SettingsSection
          title="Mutfak"
          description={
            kitchenEnabled
              ? "Mutfak bu şubede açık · hesapları Kullanıcılar sayfasından da ekleyebilirsiniz"
              : "Mutfak yok · sonra buradan mutfak hesabı ekleyebilirsiniz"
          }
          open={kitchenOpen}
          onOpenChange={setKitchenOpen}
        >
          {kitchenEnabled ? (
            <p className="text-sm text-muted-foreground">
              Mutfak uygulaması bu şubede açık. Yeni mutfak hesabı ekleyebilir veya Kullanıcılar
              sayfasından yönetebilirsiniz.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Şube oluşturulurken yalnızca garson hesabı açılır. Mutfak kullanacaksanız buradan ekleyin.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setKitchenDialogOpen(true)}>
              <CookingPot className="h-4 w-4" />
              {kitchenEnabled ? "Mutfak hesabı ekle" : "Mutfak ekle"}
            </Button>
            {kitchenEnabled ? (
              <Button asChild variant="outline" size="sm">
                <Link href={DASHBOARD_ROUTES.menuUsersForBranch(branchId)}>
                  Kullanıcıları yönet
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </SettingsSection>
      </RequireScope>

      <RequireScope scope="QR_MENU_OWNER" loading={null}>
        <SettingsSection
          title="Yazıcı ajanı"
          description={
            printKitchenEnabled
              ? "Sipariş gelince Windows ajanı mutfak fişi basar"
              : "Otomatik mutfak fişi kapalı"
          }
          open={printOpen}
          onOpenChange={setPrintOpen}
        >
          <p className="text-sm text-muted-foreground">
            Bu şube için otomatik mutfak fişini açıp kapatabilirsiniz. API Key üretmek için{" "}
            <Link href={DASHBOARD_ROUTES.accountSecurity} className="underline underline-offset-2">
              Hesabım → Güvenlik
            </Link>
            {" "}sayfasını kullanın.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant={printKitchenEnabled ? "outline" : "default"}
              size="sm"
              disabled={printBusy}
              onClick={() => void togglePrintKitchen()}
            >
              <Printer className="h-4 w-4" />
              {printKitchenEnabled ? "Otomatik fişi kapat" : "Otomatik fişi aç"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={DASHBOARD_ROUTES.accountSecurity}>API Key yönet</Link>
            </Button>
          </div>
          {printDevices.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {printDevices.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{device.deviceName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {device.printerName || "Yazıcı seçilmedi"}
                      {device.lastSeenAt
                        ? ` · son: ${new Date(device.lastSeenAt).toLocaleString("tr-TR")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={printBusy}
                    onClick={() => void toggleDevice(device)}
                  >
                    {device.enabled ? "Devre dışı" : "Etkinleştir"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Henüz eşleşmiş cihaz yok.</p>
          )}
          {failedJobs.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Son başarısız işler</p>
              <ul className="mt-2 space-y-2">
                {failedJobs.slice(0, 8).map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 text-muted-foreground">
                      <p className="truncate font-medium text-foreground">
                        #{job.id} · {job.sourceType}:{job.sourceId}
                      </p>
                      <p className="truncate">
                        {job.attempts} deneme
                        {job.lastError ? ` · ${job.lastError}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={printBusy}
                      onClick={() => void retryFailedJob(job)}
                    >
                      Tekrar yazdır
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SettingsSection>
      </RequireScope>

      <Dialog
        open={kitchenDialogOpen}
        onOpenChange={(open) => {
          if (kitchenSaving) return;
          setKitchenDialogOpen(open);
          if (!open) resetKitchenForm();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{kitchenEnabled ? "Mutfak hesabı ekle" : "Mutfak ekle"}</DialogTitle>
            <DialogDescription>
              Mutfak uygulaması için kullanıcı adı ve şifre ile bir hesap oluşturun.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (kitchenSaving) return;
              void addKitchen();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="kitchen-display">Görünen ad</Label>
              <Input
                id="kitchen-display"
                value={kitchenDisplayName}
                onChange={(event) => setKitchenDisplayName(event.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kitchen-username">Kullanıcı adı</Label>
              <Input
                id="kitchen-username"
                value={kitchenUsername}
                onChange={(event) => setKitchenUsername(event.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kitchen-password">Şifre</Label>
              <Input
                id="kitchen-password"
                type="password"
                value={kitchenPassword}
                onChange={(event) => setKitchenPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={kitchenSaving}
                onClick={() => setKitchenDialogOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={
                  kitchenSaving ||
                  !kitchenDisplayName.trim() ||
                  !kitchenUsername.trim() ||
                  kitchenPassword.length < 6
                }
              >
                {kitchenSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SettingsSection
        title="Şubeyi sil"
        description={
          hasMenus
            ? `Şube ve bağlı ${menus.length} menü kalıcı olarak silinir`
            : "Şube kalıcı olarak silinir"
        }
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tone="danger"
      >
        <div className="flex justify-end">
          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Şubeyi sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Şube kalıcı olarak silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium">{branch?.name ?? "Bu şube"}</span>
                  {hasMenus
                    ? ` ve bağlı ${menus.length} menü kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                    : " kalıcı olarak silinecek. Bu işlem geri alınamaz."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={(event) => {
                    event.preventDefault();
                    void removeBranch();
                  }}
                >
                  {deleting ? "Siliniyor..." : "Kalıcı olarak sil"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingsSection>
    </div>
  );
}
