"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

import { useDigitalMenuAccess } from "@/components/dashboard/menu/DigitalMenuPicker";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import {
  MenuDetails,
  createInitialMenuData,
  type MenuData,
} from "@/components/dashboard/qr-create/MenuDetails";
import { resolveMenuThemeId } from "@/components/menu-templates/registry";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { resolvePublicMenuHref } from "@/lib/public-menu-href";
import { invalidateMenuByQr, useMenuByQr } from "@/hooks/use-menu-by-qr";
import { invalidatePackageUsage } from "@/hooks/use-package-usage";
import { invalidateSubscription } from "@/hooks/use-subscription";
import { ApiError, assignMenuBranchRequest, deleteMenuRequest, updateMenuRequest } from "@/lib/api";
import { invalidateBranches, useBranches } from "@/hooks/use-branches";
import Link from "next/link";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { refreshAccessAfterEntitlementChange } from "@/lib/refresh-access";
import { DASHBOARD_BACK, DASHBOARD_PANEL, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import {
  ChefQuickOptionsEditor,
  useChefChatSettings,
} from "@/components/dashboard/menu/ChefQuickOptionsEditor";
import { createEmptyChefChatSettings, type ChefChatSettings } from "@/lib/chef/chef-quick-option";
import { MenuSocialSection, type MenuSocialState } from "@/components/dashboard/social/MenuSocialSection";
import { SOCIAL_PLATFORMS, socialDraftFrom, socialPayloadFrom, type SocialVisibility } from "@/lib/social-links";

function socialStateFrom(profile: {
  socialLinks?: Parameters<typeof socialDraftFrom>[0];
  socialVisibility?: SocialVisibility | null;
} | null): MenuSocialState {
  return {
    links: socialDraftFrom(profile?.socialLinks),
    shown: Object.fromEntries(
      SOCIAL_PLATFORMS.map((p) => [p, profile?.socialVisibility?.[p] ?? true]),
    ) as MenuSocialState["shown"],
  };
}

type DigitalMenuSettingsViewProps = {
  qrId: number;
};

export default function DigitalMenuSettingsView({ qrId }: DigitalMenuSettingsViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { accessLoading, accessError, retryAccess, canUseDigitalMenu } = useDigitalMenuAccess();
  const menuQuery = useMenuByQr(qrId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menu, setMenu] = useState<MenuData>(createInitialMenuData());
  const [branchId, setBranchId] = useState<number | null>(null);
  const [menuHydratedFor, setMenuHydratedFor] = useState<number | null>(null);
  const [chefSettings, setChefSettings] = useState<ChefChatSettings>(createEmptyChefChatSettings());
  const [chefSaving, setChefSaving] = useState(false);
  const [social, setSocial] = useState<MenuSocialState>(socialStateFrom(null));

  const branchesQuery = useBranches(canUseDigitalMenu);
  const profile = menuQuery.data ?? null;
  const menuId = profile?.menuId ?? null;
  const chefSettingsQuery = useChefChatSettings(menuId);
  const selectedBranch =
    branchId != null ? (branchesQuery.data?.content ?? []).find((branch) => branch.id === branchId) ?? null : null;
  const backHref =
    profile?.branchId != null
      ? DASHBOARD_ROUTES.branchDetail(profile.branchId)
      : DASHBOARD_ROUTES.digitalMenu;

  useEffect(() => {
    if (!profile) return;
    if (menuHydratedFor === (profile.menuId ?? null)) return;
    const themeId = resolveMenuThemeId(profile.themeId);
    setMenu({
      businessName: profile.businessName ?? "",
      slogan: profile.slogan ?? "",
      phone: profile.phone ?? "",
      email: profile.email ?? "",
      address: profile.address ?? "",
      googleReviewsUrl: profile.googleReviewsUrl ?? "",
      themeId,
      chefName: profile.chefName ?? "",
      chefAvatarKey: profile.chefAvatarKey ?? "default",
      logoUrl: profile.logoUrl ?? "",
      coverUrl: profile.coverUrl ?? "",
    });
    setBranchId(profile.branchId ?? null);
    setSocial(socialStateFrom(profile));
    setMenuHydratedFor(profile.menuId ?? null);
  }, [menuHydratedFor, profile]);

  useEffect(() => {
    if (chefSettingsQuery.settings) {
      setChefSettings(chefSettingsQuery.settings);
    }
  }, [chefSettingsQuery.settings]);

  useEffect(() => {
    if (menuQuery.isError) {
      notify(
        "danger",
        menuQuery.error instanceof ApiError ? menuQuery.error.message : "Menü yüklenemedi.",
      );
      router.push(DASHBOARD_ROUTES.digitalMenu);
    }
  }, [menuQuery.error, menuQuery.isError, notify, router]);

  const saveChefSettings = async () => {
    if (menuId == null) return;
    setChefSaving(true);
    try {
      const res = await fetch(`/api/menu/${menuId}/chef-chat-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chefSettings),
      });
      const data = (await res.json().catch(() => ({}))) as ChefChatSettings & { message?: string };
      if (!res.ok) {
        throw new ApiError(res.status, data.message || "Şef ayarları kaydedilemedi");
      }
      setChefSettings(data);
      notify("info", "Şef asistanı ayarları güncellendi.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Şef ayarları kaydedilemedi.");
    } finally {
      setChefSaving(false);
    }
  };

  const saveProfile = async () => {
    if (menuId == null) return;
    if (!menu.businessName.trim()) {
      notify("warning", "Firma adı zorunlu.");
      return;
    }
    setSaving(true);
    try {
      await assignMenuBranchRequest(menuId, branchId);
      await updateMenuRequest(menuId, {
        businessName: menu.businessName.trim(),
        slogan: menu.slogan.trim(),
        phone: menu.phone.trim(),
        email: menu.email.trim(),
        address: menu.address.trim(),
        // An empty string clears the saved link; null would keep it.
        googleReviewsUrl: menu.googleReviewsUrl.trim(),
        socialLinks: socialPayloadFrom(social.links),
        socialVisibility: social.shown,
        themeId: menu.themeId,
        chefName: menu.chefName.trim(),
        chefAvatarKey: menu.chefAvatarKey.trim() || "default",
      });
      await invalidateMenuByQr(queryClient, qrId);
      await invalidateBranches(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["myMenus"] });
      notify("info", "Menü bilgileri güncellendi.");
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Menü güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async () => {
    if (menuId == null) return;
    setDeleting(true);
    try {
      await deleteMenuRequest(menuId);
      await refreshAccessAfterEntitlementChange(queryClient);
      await invalidatePackageUsage(queryClient);
      await invalidateSubscription(queryClient);
      notify("info", `"${profile?.businessName ?? "Menü"}" silindi.`);
      router.push(backHref);
    } catch (error) {
      notify("danger", error instanceof ApiError ? error.message : "Menü silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  if (accessLoading || menuQuery.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardPageHeader
          title="Menü Ayarları"
          hint="İşletme bilgileri, tema ve yayın ayarları"
          back={
            <Link href={backHref} aria-label="Geri" className={DASHBOARD_BACK}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
        <DashboardLoadingState label="Menü ayarları yükleniyor…" />
      </div>
    );
  }

  if (accessError) {
    return <AccessLoadError onRetry={() => void retryAccess()} />;
  }

  if (!canUseDigitalMenu) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push(DASHBOARD_ROUTES.digitalMenu)}>
          Dijital Menüye Dön
        </Button>
        <p className="text-sm text-muted-foreground">Menü ayarları için PRO paket gerekir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardPageHeader
        title="Menü Ayarları"
        hint={
          profile?.businessName
            ? `${profile.businessName} · işletme, tema ve yayın`
            : "İşletme bilgileri, tema ve yayın ayarları"
        }
        back={
          <Link href={backHref} aria-label="Geri" className={DASHBOARD_BACK}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      {menuId != null ? (
        <div className={`${DASHBOARD_SURFACE} p-4 sm:p-6`}>
          <Tabs defaultValue="info" className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="info">Menü bilgileri</TabsTrigger>
              <TabsTrigger value="appearance">Görünüm</TabsTrigger>
              <TabsTrigger value="chef">Şef asistanı</TabsTrigger>
            </TabsList>
            {(["info", "appearance"] as const).map((section) => (
              <TabsContent key={section} value={section} className="mt-0 space-y-5">
                {section === "info" ? (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground" htmlFor="settings-menu-branch">
                      Şube
                    </label>
                    <select
                      id="settings-menu-branch"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={branchId ?? ""}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setBranchId(Number.isSafeInteger(next) && next > 0 ? next : null);
                      }}
                    >
                      <option value="">Şube atanmadı</option>
                      {(branchesQuery.data?.content ?? []).map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <MenuDetails
                  value={menu}
                  onChange={setMenu}
                  excludeMenuId={menuId}
                  menuId={menuId}
                  section={section}
                  qrPreview={
                    profile
                      ? {
                          imgSrc: profile.qr?.imgSrc ?? null,
                          name: profile.qr?.name?.trim() || menu.businessName.trim() || "Menü QR",
                          content: resolvePublicMenuHref({
                            publicUrl: profile.publicUrl,
                            publicId: profile.publicId,
                          }),
                        }
                      : null
                  }
                />
                {section === "info" ? (
                  <MenuSocialSection
                    value={social}
                    onChange={setSocial}
                    branchId={branchId}
                    branchName={selectedBranch?.name}
                    branchLinks={
                      selectedBranch
                        ? selectedBranch.socialLinks
                        : branchId != null && branchId === profile?.branchId
                          ? profile?.branchSocialLinks
                          : null
                    }
                  />
                ) : null}
                <div className="flex justify-end">
                  <Button type="button" disabled={saving} onClick={() => void saveProfile()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                  </Button>
                </div>
              </TabsContent>
            ))}
            <TabsContent value="chef" className="mt-0 space-y-5">
              {chefSettingsQuery.loading ? (
                <DashboardLoadingState label="Şef ayarları yükleniyor…" />
              ) : (
                <ChefQuickOptionsEditor
                  menuId={menuId}
                  value={chefSettings}
                  onChange={setChefSettings}
                />
              )}
              <div className="flex justify-end">
                <Button type="button" disabled={chefSaving} onClick={() => void saveChefSettings()}>
                  {chefSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Şef ayarlarını kaydet"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {menuId != null ? (
        <div className={`${DASHBOARD_PANEL} border-destructive/30`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Menüyü sil</h2>
              <p className="text-xs text-muted-foreground">
                Menü ve bağlı QR kodu kalıcı olarak silinmez; soft delete uygulanır. Menü kotanız geri açılır.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="gap-2" disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Menüyü Sil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Menü silinsin mi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-medium">{profile?.businessName ?? "Bu menü"}</span> ve bağlı QR kodu
                    devre dışı bırakılır. Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDeleteMenu()}>Sil</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}
    </div>
  );
}
