"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  createQrRequest, deleteQrRequest, getMyActiveMenusRequest, getStoredUser,
  getMerchantQrsRequest, StoredUser, updateQrActiveRequest, updateQrNameRequest, updateQrRequest,
} from "@/lib/api";
import { refreshAccessAfterEntitlementChange } from "@/lib/refresh-access";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTrigger, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  QrCode, Plus, MoreHorizontal, Download, Share2, Trash2, Edit, Copy,
  Link as LinkIcon, Wifi, Mail, Phone, FileText, MapPin, Check, ArrowLeft,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { QrTypeDetails, QrTypeData, QrTypeValue } from "@/components/dashboard/qr-create/QrTypeDetails";
import {
  createInitialQrTypeData, getQrDetailsByType, getBackendTypeFromDetails,
  mapDetailsToQrTypeData, getReadableDetailRows, mapUserQrToDashboardItem,
  isMenuQrDetails,
  validateQrDetails,
  buildScanChart,
  type DashboardQrItem,
} from "@/components/dashboard/qr/qr-mappers";
// removed QrListScope filter; always listing ALL
import {
  copyQrImageToClipboard,
  copyTextToClipboard,
  downloadQrImage,
  shareQr,
} from "@/components/dashboard/qr/qr-actions";
import { TONE_BUTTON, TONES, ToneIcon } from "@/components/dashboard/tone";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { invalidatePackageUsage } from "@/hooks/use-package-usage";
import { invalidateSubscription } from "@/hooks/use-subscription";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import { useDashboardPageLabel } from "@/contexts/dashboard-page-label";
import { useListQueryState } from "@/hooks/use-list-query-state";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { useQrCreateAccess } from "@/hooks/use-qr-create-access";
import {
  DASHBOARD_BACK,
  DASHBOARD_SURFACE,
} from "@/lib/dashboard-surface";

const qrTypes = [
  { value: "link", label: "Link", icon: LinkIcon, tone: "teal", desc: "Web sitesi veya URL" },
  { value: "wifi", label: "WiFi", icon: Wifi, tone: "violet", desc: "Kablosuz ağ bilgisi" },
  { value: "mail", label: "E-Posta", icon: Mail, tone: "orange", desc: "E-posta şablonu" },
  { value: "contact", label: "İletişim", icon: Phone, tone: "green", desc: "vCard bilgileri" },
  { value: "text", label: "Metin", icon: FileText, tone: "blue", desc: "Düz metin içeriği" },
  { value: "location", label: "Konum", icon: MapPin, tone: "red", desc: "GPS koordinatları" },
] as const;

const qrModes = [
  {
    value: "dynamic",
    label: "Dinamik",
    desc: "Basılı QR aynı kalır, içeriği sonradan değiştirebilirsiniz.",
    wifiDesc: "Şifre değişse de QR aynı kalır, müşteri ağa elle bağlanır.",
  },
  {
    value: "static",
    label: "Sabit",
    desc: "İçerik QR'ın içindedir, değişirse yeniden basılması gerekir.",
    wifiDesc: "Telefon okutunca WiFi'ye doğrudan bağlanır, şifre değişirse yeniden basılır.",
  },
] as const;

const listTypeOf = (qr: DashboardQrItem) => qrTypes.find((type) => type.label === qr.type);

function useTooltipStyle() {
  return {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(var(--foreground))",
  };
}

export type QrCodesMode = "list" | "create" | "detail";

interface DashboardQrCodesViewProps {
  mode: QrCodesMode;
  qrId?: number;
  initialUser?: StoredUser | null;
}

const QR_PAGE_SIZE = 5;

const DashboardQrCodesView = ({ mode, qrId, initialUser = null }: DashboardQrCodesViewProps) => {
  const tooltipStyle = useTooltipStyle();
  const user = useMemo(() => initialUser || getStoredUser(), [initialUser]);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const { canCreateQr, qrQuotaLabel, accessLoading: isQrAccessLoading, accessError, retryAccess } = useQrCreateAccess();
  const { searchParams, setQuery } = useListQueryState();
  const [isLoading, setIsLoading] = useState(false);
  // scope filter removed; always list ALL
  const [nameQuery, setNameQuery] = useState(() => searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedQrType, setSelectedQrType] = useState<QrTypeValue>("link");
  const [qrName, setQrName] = useState("");
  const [qrTypeData, setQrTypeData] = useState<QrTypeData>(() => createInitialQrTypeData());
  const [qrTracking, setQrTracking] = useState(true);
  const [qrMode, setQrMode] = useState<"dynamic" | "static">("dynamic");
  const selectQrType = (type: QrTypeValue) => {
    setSelectedQrType(type);
    // A phone only joins WiFi automatically from a static QR; everything else benefits from being editable.
    setQrMode(type === "wifi" ? "static" : "dynamic");
  };
  const [isCreating, setIsCreating] = useState(false);
  const [qrPendingDelete, setQrPendingDelete] = useState<DashboardQrItem | null>(null);
  const createInFlight = useRef(false);
  const [userQrs, setUserQrs] = useState<DashboardQrItem[]>([]);

  // QR Detail/Edit state
  const [selectedQR, setSelectedQR] = useState<DashboardQrItem | null>(null);
  useDashboardPageLabel(mode === "detail" ? selectedQR?.name : undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editQrType, setEditQrType] = useState<QrTypeValue>("link");
  const [editQrTypeData, setEditQrTypeData] = useState<QrTypeData>(() => createInitialQrTypeData());

  // UI: Kaydet butonunun hangi uyarıyı göstermesi gerektiğini belirler.
  const editNameTrimmed = editName.trim();
  const editOriginalType = selectedQR ? getBackendTypeFromDetails(selectedQR.details) : editQrType;
  const editOriginalDetailsData = selectedQR ? mapDetailsToQrTypeData(selectedQR.details) : createInitialQrTypeData();
  const nameChangedForUi = selectedQR ? editNameTrimmed !== selectedQR.name : false;
  const activeUnchangedForUi = selectedQR ? editActive === selectedQR.active : false;
  const detailsUnchangedForUi = selectedQR
    ? editQrType === editOriginalType && JSON.stringify(editQrTypeData) === JSON.stringify(editOriginalDetailsData)
    : false;
  const nameOnlyEditForUi = selectedQR ? nameChangedForUi && activeUnchangedForUi && detailsUnchangedForUi : false;
  const menuActiveOnlyEditForUi = selectedQR
    ? isMenuQrDetails(selectedQR.details) && !nameChangedForUi && !activeUnchangedForUi && detailsUnchangedForUi
    : false;
  const hasChangesForUi = selectedQR ? nameChangedForUi || !activeUnchangedForUi || !detailsUnchangedForUi : false;
  // A dynamic QR keeps its printed image, so only the other cases need a warning.
  const reprintWarning = !selectedQR || selectedQR.publicUrl
    ? null
    : isMenuQrDetails(selectedQR.details)
      ? "Güncelleme yeni bir QR oluşturur; eski QR devre dışı kalır. Devam edilsin mi?"
      : "Bu sabit bir QR: bilgiler görselin içinde saklanır. Kaydedince yeni bir görsel üretilir, eski basılı QR eski bilgilerle kalır. Devam edilsin mi?";

  const hasListFilter = nameQuery.trim() !== "" || typeFilter !== "all";

  const fetchUserQrs = useCallback(async (): Promise<DashboardQrItem[]> => {
    setIsLoading(true);
    try {
      const pageSize = mode === "detail" || hasListFilter ? 50 : QR_PAGE_SIZE;
      const pageIndex = mode === "detail" || hasListFilter ? 0 : page;
      const response = await getMerchantQrsRequest(user?.id ?? "me", {
        includeImage: true,
        page: pageIndex,
        size: pageSize,
        scope: "ALL",
      });
      const mapped = (response.content ?? [])
        .map(mapUserQrToDashboardItem)
        .filter((qr) => !isMenuQrDetails(qr.details));
      setUserQrs(mapped);
      setTotalElements(response.totalElements ?? mapped.length);
      setTotalPages(response.totalPages ?? 0);
      if (mode === "list" && mapped.length === 0 && pageIndex > 0) {
        setPage((current) => Math.max(0, current - 1));
      }
      return mapped;
    } catch (error) {
      const message = error instanceof Error ? error.message : "QR kodlar getirilemedi.";
      notify("danger", message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [hasListFilter, mode, notify, page, user?.id]);

  useEffect(() => {
    setPage(0);
  }, [hasListFilter]);

  const visibleQrs = useMemo(() => {
    const query = nameQuery.trim().toLocaleLowerCase("tr");
    return userQrs.filter((qr) => {
      if (typeFilter !== "all" && qr.type !== typeFilter) return false;
      if (!query) return true;
      return `${qr.name} ${qr.content} ${qr.type}`.toLocaleLowerCase("tr").includes(query);
    });
  }, [nameQuery, typeFilter, userQrs]);

  const handleDeleteQr = useCallback(async (qr: DashboardQrItem) => {
    try {
      await deleteQrRequest(qr.id);
      setSelectedQR((prev) => (prev?.id === qr.id ? null : prev));
      await fetchUserQrs();
      setIsEditing(false);
      await invalidatePackageUsage(queryClient);
      await invalidateSubscription(queryClient);
      router.push(DASHBOARD_ROUTES.qrCodes);
      notify("info", `"${qr.name}" silindi.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "QR kod silinemedi.";
      notify("danger", message);
    }
  }, [fetchUserQrs, notify, queryClient, router]);

  const handleCopyQr = useCallback(async (qr: DashboardQrItem) => {
    try {
      if (qr.imgSrc) {
        const imageOk = await copyQrImageToClipboard(qr.imgSrc);
        if (imageOk) {
          notify("info", "QR panoya kopyalandı.");
          return;
        }
      }
      const textOk = await copyTextToClipboard(qr.content);
      if (textOk) {
        notify("info", "İçerik panoya kopyalandı.");
        return;
      }
      notify("warning", "Kopyalama başarısız.");
    } catch {
      notify("warning", "Kopyalama başarısız.");
    }
  }, [notify]);

  const handleDownloadQr = useCallback((qr: DashboardQrItem) => {
    if (!qr.imgSrc) {
      notify("warning", "İndirilecek QR görseli bulunamadı.");
      return;
    }
    const ok = downloadQrImage(qr.imgSrc, qr.name);
    if (ok) notify("info", "QR indirildi.");
    else notify("warning", "İndirme başarısız.");
  }, [notify]);

  const handleShareQr = useCallback(async (qr: DashboardQrItem) => {
    try {
      const ok = await shareQr({
        title: qr.name,
        text: qr.content,
        imgSrc: qr.imgSrc ?? undefined,
      });
      if (ok) {
        notify("info", "Paylaşım açıldı.");
        return;
      }
      const copied = await copyTextToClipboard(qr.content);
      if (copied) {
        notify("warning", "Paylaşım desteklenmiyor; içerik kopyalandı.");
        return;
      }
      notify("warning", "Paylaşım desteklenmiyor.");
    } catch {
      notify("warning", "Paylaşım iptal edildi veya başarısız.");
    }
  }, [notify]);

  const handleSaveQrEdit = useCallback(async () => {
    if (!selectedQR) return;

    const trimmedName = editName.trim();

    if (!trimmedName) {
      notify("warning", "QR kod adı zorunlu.");
      return;
    }

    const originalType = getBackendTypeFromDetails(selectedQR.details);
    const originalDetailsData = mapDetailsToQrTypeData(selectedQR.details);
    const nameChanged = trimmedName !== selectedQR.name;
    const activeUnchanged = editActive === selectedQR.active;
    const detailsUnchanged = editQrType === originalType && JSON.stringify(editQrTypeData) === JSON.stringify(originalDetailsData);

    // Hiçbir şey değişmediyse çağrı yapma.
    if (!nameChanged && activeUnchanged && detailsUnchanged) {
      setIsEditing(false);
      return;
    }

    const nameOnlyEdit = nameChanged && activeUnchanged && detailsUnchanged;
    const menuActiveOnlyEdit =
      isMenuQrDetails(selectedQR.details) && !nameChanged && !activeUnchanged && detailsUnchanged;

    if (menuActiveOnlyEdit) {
      try {
        await updateQrActiveRequest(selectedQR.id, { active: editActive });
        const refreshedQrs = await fetchUserQrs();
        const refreshedSelected = refreshedQrs.find((item) => item.id === selectedQR.id) || null;
        setSelectedQR(refreshedSelected);
        setIsEditing(false);
        setEditActive(refreshedSelected?.active ?? editActive);
        await invalidatePackageUsage(queryClient);
        await invalidateSubscription(queryClient);
        notify("info", editActive ? `"${selectedQR.name}" aktif edildi.` : `"${selectedQR.name}" pasif edildi.`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Menü durumu güncellenemedi.";
        notify("danger", message);
        return;
      }
    }

    // Name-only edit: PATCH /qr/update-name -> yeni QR üretmez.
    if (nameOnlyEdit) {
      try {
        await updateQrNameRequest(selectedQR.id, { qrName: trimmedName });
        const refreshedQrs = await fetchUserQrs();
        const refreshedSelected = refreshedQrs.find((item) => item.id === selectedQR.id) || null;
        setSelectedQR(refreshedSelected);
        setIsEditing(false);
        setEditActive(refreshedSelected?.active ?? selectedQR.active);

        notify("info", `"${trimmedName}" adı güncellendi.`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "QR adı güncellenemedi.";
        notify("danger", message);
        return;
      }
    }

    const details = getQrDetailsByType(editQrType, editQrTypeData);
    const detailsError = validateQrDetails(editQrType, details);
    if (detailsError) {
      notify("warning", detailsError);
      return;
    }

    try {
      const updateResponse = await updateQrRequest(selectedQR.id, {
        merchantId: selectedQR.merchantId,
        qrName: trimmedName,
        type: editQrType,
        details,
      });

      const refreshedQrs = await fetchUserQrs();
      const refreshedSelected =
        refreshedQrs.find((item) => item.id === (updateResponse.qrId ?? selectedQR.id)) || refreshedQrs[0] || null;

      setSelectedQR(refreshedSelected);
      setIsEditing(false);
      if (refreshedSelected) {
        setEditName(refreshedSelected.name);
        setEditActive(refreshedSelected.active);
        const refreshedType = getBackendTypeFromDetails(refreshedSelected.details);
        setEditQrType(refreshedType);
        setEditQrTypeData(mapDetailsToQrTypeData(refreshedSelected.details));
      }

      if (reprintWarning) {
        notify("warning", `"${trimmedName}" güncellendi. Yeni QR görselini indirip basılı QR'ı yenileyin.`);
      } else {
        notify("info", `"${trimmedName}" güncellendi. Basılı QR aynı kalır, yeni içeriği açar.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "QR kod güncellenemedi.";
      notify("danger", message);
    }
  }, [editActive, editName, editQrType, editQrTypeData, fetchUserQrs, notify, queryClient, reprintWarning, selectedQR]);

  useEffect(() => {
    if (true) {
      void fetchUserQrs();
    }
  }, [fetchUserQrs]);

  useEffect(() => {
    if (mode !== "detail" || !qrId) {
      if (mode !== "detail") setSelectedQR(null);
      return;
    }
    const found = userQrs.find((item) => item.id === qrId) ?? null;
    setSelectedQR(found);
  }, [mode, qrId, userQrs]);

  useEffect(() => {
    if (mode !== "detail" || !qrId || isLoading) {
      return;
    }
    if (userQrs.some((item) => item.id === qrId)) {
      return;
    }

    let cancelled = false;
    void getMyActiveMenusRequest()
      .then((menus) => {
        if (cancelled) return;
        if (menus.some((menu) => menu.qrId === qrId)) {
          router.replace(DASHBOARD_ROUTES.digitalMenuEdit(qrId));
          return;
        }
        router.replace(DASHBOARD_ROUTES.qrCodes);
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(DASHBOARD_ROUTES.qrCodes);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, mode, qrId, router, userQrs]);

  const handleCreateQR = useCallback(async () => {
    if (!canCreateQr) {
      notify(
        "warning",
        accessError
          ? "Paket bilgileri alınamadı. Lütfen tekrar deneyin."
          : qrQuotaLabel === "QR oluşturma hakkınız bitti"
            ? qrQuotaLabel
            : "QR oluşturmak için uygun bir paket gerekli.",
      );
      return;
    }
    const trimmedQrName = qrName.trim();
    const details = getQrDetailsByType(selectedQrType, qrTypeData);

    if (!trimmedQrName) {
      notify("warning", "QR kod adı zorunlu.");
      return;
    }

    const detailsError = validateQrDetails(selectedQrType, details);
    if (detailsError) {
      notify("warning", detailsError);
      return;
    }

    // The ref blocks a second click in the same tick, before the disabled state reaches the button.
    if (createInFlight.current) return;
    createInFlight.current = true;
    setIsCreating(true);

    try {
      const response = await createQrRequest({
        qrName: trimmedQrName,
        type: selectedQrType,
        details,
        trackingEnabled: qrTracking && qrMode === "dynamic",
        qrMode,
      });
      notify("info", `"${trimmedQrName}" başarıyla oluşturuldu!`);
      setQrName("");
      setQrTypeData(createInitialQrTypeData());
      selectQrType("link");
      void invalidatePackageUsage(queryClient);
      void invalidateSubscription(queryClient);
      await fetchUserQrs();
      if (response.qrId != null) {
        router.push(DASHBOARD_ROUTES.qrCodeDetail(response.qrId));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "QR kod oluşturulamadı.";
      notify("danger", message);
    } finally {
      createInFlight.current = false;
      setIsCreating(false);
    }
  }, [accessError, canCreateQr, fetchUserQrs, notify, qrMode, qrName, qrQuotaLabel, qrTracking, qrTypeData, queryClient, router, selectedQrType]);

  const selectedTypeMeta = selectedQR ? listTypeOf(selectedQR) : undefined;
  const handleCopyAddress = async (address: string) => {
    const copied = await copyTextToClipboard(address).catch(() => false);
    if (copied) notify("info", "Sabit adres kopyalandı.");
    else notify("warning", "Kopyalama başarısız.");
  };

  return (
    <>
          {mode === "list" && (
            <div className="space-y-5 animate-fade-in">
              <DashboardPageHeader
                title="QR Kodlarım"
                hint={[
                  totalElements > 0 ? `${totalElements} QR kod` : null,
                  !isQrAccessLoading ? qrQuotaLabel : null,
                ].filter(Boolean).join(" · ")}
                action={
                  canCreateQr ? (
                    <Button className="w-full gap-2 sm:w-auto" asChild>
                      <Link href={DASHBOARD_ROUTES.qrCodesNew}>
                        <Plus className="h-4 w-4" />
                        Yeni QR Kod
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2 sm:w-auto"
                      disabled
                      title={qrQuotaLabel ?? "QR oluşturma hakkınız yok"}
                    >
                      <Plus className="h-4 w-4" />
                      Yeni QR Kod
                    </Button>
                  )
                }
              />

              {totalElements > 0 || hasListFilter ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={nameQuery}
                      onChange={(event) => {
                        const next = event.target.value;
                        setNameQuery(next);
                        setQuery({ q: next.trim() || null });
                      }}
                      placeholder="Ad veya içerik ara…"
                      className="h-10 pl-9"
                      aria-label="QR ara"
                    />
                  </div>
                  <FilterSelect
                    className="w-full sm:w-[10rem]"
                    label="Tür"
                    value={typeFilter}
                    onValueChange={(next) => {
                      setTypeFilter(next);
                      setQuery({ type: next === "all" ? null : next });
                    }}
                    options={[
                      { value: "all", label: "Tümü" },
                      ...qrTypes.map((type) => ({ value: type.label, label: type.label })),
                    ]}
                  />
                </div>
              ) : null}

              {isLoading && userQrs.length === 0 ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-[4.5rem] w-full rounded-lg" />
                  ))}
                </div>
              ) : userQrs.length === 0 ? (
                <EmptyState
                  title="Henüz QR kod yok"
                  description="İlk QR kodunuzu oluşturup masaya veya menüye bağlayın."
                  action={
                    canCreateQr ? (
                      <Button asChild>
                        <Link href={DASHBOARD_ROUTES.qrCodesNew}>QR oluştur</Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : visibleQrs.length === 0 ? (
                <EmptyState
                  title="Sonuç bulunamadı"
                  description="Aramayı veya tür filtresini değiştirip tekrar deneyin."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNameQuery("");
                        setTypeFilter("all");
                        setQuery({ q: null, type: null });
                      }}
                    >
                      Filtreleri temizle
                    </Button>
                  }
                />
              ) : (
                <ul className={`${DASHBOARD_SURFACE} divide-y divide-border overflow-hidden`}>
                  {visibleQrs.map((qr) => (
                    <li key={qr.id} className="relative flex items-center gap-3 p-3 transition-colors hover:bg-accent/30 sm:gap-4 sm:p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {qr.imgSrc ? (
                          <img
                            src={`data:image/png;base64,${qr.imgSrc}`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <QrCode className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={DASHBOARD_ROUTES.qrCodeDetail(qr.id)}
                          className="block truncate text-sm font-medium text-foreground after:absolute after:inset-0"
                        >
                          {qr.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{qr.content || "İçerik yok"}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${qr.publicUrl ? TONES.green : TONES.orange}`}>
                            {qr.publicUrl ? "Dinamik" : "Sabit"}
                          </span>
                          {listTypeOf(qr) ? (
                            <ToneIcon tone={listTypeOf(qr)!.tone} icon={listTypeOf(qr)!.icon} size="sm" />
                          ) : null}
                          <span className="truncate">
                            {qr.type}
                            <span className="hidden sm:inline"> · {qr.created}</span>
                            {qr.publicUrl ? ` · ${qr.scans} tarama` : ""}
                          </span>
                        </p>
                      </div>
                      <div className="relative z-10 flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className={`${TONE_BUTTON} w-9 ${TONES.green}`}
                          title="İndir"
                          aria-label={`${qr.name} QR kodunu indir`}
                          onClick={() => handleDownloadQr(qr)}
                        >
                          <Download className="h-4 w-4 [stroke-width:1.75]" />
                        </button>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground"
                              aria-label={`${qr.name} için diğer işlemler`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => router.push(DASHBOARD_ROUTES.qrCodeDetail(qr.id))}>
                              <span className="mr-2"><ToneIcon tone="violet" icon={Edit} /></span>
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void handleCopyQr(qr)}>
                              <span className="mr-2"><ToneIcon tone="teal" icon={Copy} /></span>
                              Kopyala
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void handleShareQr(qr)}>
                              <span className="mr-2"><ToneIcon tone="orange" icon={Share2} /></span>
                              Paylaş
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setQrPendingDelete(qr)}
                            >
                              <span className="mr-2"><ToneIcon tone="red" icon={Trash2} /></span>
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <AlertDialog
                open={qrPendingDelete != null}
                onOpenChange={(open) => {
                  if (!open) setQrPendingDelete(null);
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>QR silinsin mi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="font-medium">{qrPendingDelete?.name}</span> QR’ını tamamen silersiniz. Bu işlem
                      geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (qrPendingDelete) void handleDeleteQr(qrPendingDelete);
                      }}
                    >
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {!hasListFilter && totalElements > QR_PAGE_SIZE ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Sayfa {page + 1} / {Math.max(1, totalPages)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={page <= 0}
                      onClick={() => setPage((value) => Math.max(0, value - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Önceki
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Sonraki
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── QR Detail / Edit ── */}
          {mode === "detail" && !selectedQR ? (
            <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[18rem_minmax(0,1fr)]">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : null}

          {mode === "detail" && selectedQR && (
            <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">
              <DashboardPageHeader
                title={isEditing ? "QR Kodu Düzenle" : selectedQR.name}
                hint={isEditing ? null : `${selectedQR.created} tarihinde oluşturuldu`}
                back={
                  <button
                    type="button"
                    onClick={() => {
                      router.push(DASHBOARD_ROUTES.qrCodes);
                      setIsEditing(false);
                    }}
                    aria-label="QR listesine dön"
                    className={DASHBOARD_BACK}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                }
                action={
                  !isEditing ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2 sm:w-auto"
                      onClick={() => {
                        setIsEditing(true);
                        setEditName(selectedQR.name);
                        setEditActive(selectedQR.active);
                        const backendType = getBackendTypeFromDetails(selectedQR.details);
                        setEditQrType(backendType);
                        setEditQrTypeData(mapDetailsToQrTypeData(selectedQR.details));
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Düzenle
                    </Button>
                  ) : null
                }
              />

              <div className="grid items-start gap-5 md:grid-cols-[18rem_minmax(0,1fr)]">
                <div className={`${DASHBOARD_SURFACE} space-y-3 p-4 md:sticky md:top-6`}>
                  <div className="mx-auto aspect-square w-full max-w-[16rem] overflow-hidden rounded-lg border border-border bg-white p-2">
                    {selectedQR.imgSrc ? (
                      <img
                        src={`data:image/png;base64,${selectedQR.imgSrc}`}
                        alt={`${selectedQR.name} QR kodu`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <QrCode className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${TONE_BUTTON} h-10 w-full gap-2 text-sm font-medium ${TONES.green}`}
                    onClick={() => handleDownloadQr(selectedQR)}
                  >
                    <Download className="h-4 w-4 [stroke-width:1.75]" />
                    İndir
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className={`${TONE_BUTTON} w-full gap-1.5 text-xs font-medium ${TONES.teal}`}
                      title="QR görselini kopyala"
                      onClick={() => void handleCopyQr(selectedQR)}
                    >
                      <Copy className="h-3.5 w-3.5 [stroke-width:1.75]" />
                      Kopyala
                    </button>
                    <button
                      type="button"
                      className={`${TONE_BUTTON} w-full gap-1.5 text-xs font-medium ${TONES.orange}`}
                      onClick={() => void handleShareQr(selectedQR)}
                    >
                      <Share2 className="h-3.5 w-3.5 [stroke-width:1.75]" />
                      Paylaş
                    </button>
                    {!isMenuQrDetails(selectedQR.details) ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button type="button" className={`${TONE_BUTTON} w-full gap-1.5 text-xs font-medium ${TONES.red}`}>
                            <Trash2 className="h-3.5 w-3.5 [stroke-width:1.75]" />
                            Sil
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>QR silinsin mi?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <span className="font-medium">{selectedQR.name}</span> QR’ını tamamen silersiniz. Bu işlem geri alınamaz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void handleDeleteQr(selectedQR)}>Sil</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0 space-y-5">
                  {isEditing ? (
                    <div className={`${DASHBOARD_SURFACE} space-y-5 p-5`}>
                      <div className="space-y-2">
                        <Label htmlFor="qr-edit-name" className="text-xs text-muted-foreground">QR kod adı</Label>
                        <Input
                          id="qr-edit-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <QrTypeDetails
                        selectedType={editQrType}
                        data={editQrTypeData}
                        onChange={setEditQrTypeData}
                      />
                      {isMenuQrDetails(selectedQR.details) ? (
                        <div className="flex items-center justify-between gap-4">
                          <Label htmlFor="qr-edit-active" className="text-sm font-normal text-foreground">Aktif</Label>
                          <Switch id="qr-edit-active" checked={editActive} onCheckedChange={setEditActive} />
                        </div>
                      ) : null}
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          İptal
                        </Button>
                        {nameOnlyEditForUi || menuActiveOnlyEditForUi || (hasChangesForUi && !reprintWarning) ? (
                          <Button className="gap-2" onClick={() => void handleSaveQrEdit()}>
                            <Check className="h-4 w-4" />
                            Kaydet
                          </Button>
                        ) : hasChangesForUi ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="gap-2">
                                <Check className="h-4 w-4" />
                                Kaydet
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Kaydet onayı</AlertDialogTitle>
                                <AlertDialogDescription>{reprintWarning}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleSaveQrEdit()}>
                                  Onayla
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button className="gap-2" disabled>
                            <Check className="h-4 w-4" />
                            Kaydet
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`${DASHBOARD_SURFACE} p-5`}>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedTypeMeta ? <ToneIcon tone={selectedTypeMeta.tone} icon={selectedTypeMeta.icon} size="lg" /> : null}
                          <span className="text-sm font-medium text-foreground">{selectedQR.type}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${selectedQR.publicUrl ? TONES.green : TONES.orange}`}>
                            {selectedQR.publicUrl ? "Dinamik" : "Sabit"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedQR.publicUrl
                            ? "İçeriği değiştirdiğinizde basılı QR aynı kalır."
                            : "İçerik QR'ın içindedir. Değiştirirseniz yeniden basılması gerekir."}
                        </p>

                        <dl className="mt-3 divide-y divide-border border-t border-border">
                          {getReadableDetailRows(selectedQR.details)
                            .filter((row) => row.value)
                            .map((row) => (
                              <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
                                <dt className="shrink-0 text-sm text-muted-foreground">{row.label}</dt>
                                <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground">{row.value}</dd>
                              </div>
                            ))}
                          {selectedQR.publicUrl ? (
                            <div className="flex items-center justify-between gap-4 py-2.5">
                              <dt className="shrink-0 text-sm text-muted-foreground">Sabit adres</dt>
                              <dd className="flex min-w-0 items-center gap-2">
                                <a
                                  href={selectedQR.publicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="min-w-0 truncate text-sm font-medium text-primary"
                                >
                                  {selectedQR.publicUrl.replace(/^https?:\/\//, "")}
                                </a>
                                <button
                                  type="button"
                                  className={`${TONE_BUTTON} h-8 w-8 shrink-0 ${TONES.teal}`}
                                  title="Adresi kopyala"
                                  aria-label="Sabit adresi kopyala"
                                  onClick={() => void handleCopyAddress(selectedQR.publicUrl!)}
                                >
                                  <Copy className="h-3.5 w-3.5 [stroke-width:1.75]" />
                                </button>
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>

                      {selectedQR.publicUrl ? (
                        <div className={`${DASHBOARD_SURFACE} p-5`}>
                          <div className="flex items-baseline justify-between gap-4">
                            <h2 className="text-sm font-semibold text-foreground">Taramalar</h2>
                            {selectedQR.trackingEnabled ? (
                              <p className="text-xs text-muted-foreground">
                                Toplam <span className="text-lg font-semibold text-foreground">{selectedQR.scans.toLocaleString("tr-TR")}</span>
                              </p>
                            ) : null}
                          </div>
                          {selectedQR.trackingEnabled ? (
                            <div className="mt-3 h-40">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={buildScanChart(selectedQR.dailyScans)} margin={{ left: -24, right: 4, top: 4, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#128C7E" stopOpacity={0.2} />
                                      <stop offset="100%" stopColor="#128C7E" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, "Tarama"]} />
                                  <Area type="monotone" dataKey="scans" stroke="#128C7E" strokeWidth={1.75} fill="url(#detailGrad)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Bu QR için tarama takibi kapalı.</p>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── QR Create ── */}
          {mode === "create" && (
            <div className="mx-auto max-w-xl space-y-6 animate-fade-in">
              <DashboardPageHeader
                title="Yeni QR Kod"
                hint={
                  accessError
                    ? "Paket bilgileri alınamadı. Lütfen tekrar deneyin."
                    : (qrQuotaLabel ?? (canCreateQr ? undefined : "QR oluşturmak için uygun bir paket gerekli."))
                }
                back={
                  <button
                    type="button"
                    onClick={() => router.push(DASHBOARD_ROUTES.qrCodes)}
                    aria-label="QR listesine dön"
                    className={DASHBOARD_BACK}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                }
              />

              {accessError ? (
                <Button variant="outline" onClick={() => void retryAccess()}>
                  Tekrar dene
                </Button>
              ) : null}

              <div className={`${DASHBOARD_SURFACE} space-y-6 p-5 sm:p-6`}>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">İçerik türü</Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {qrTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        aria-pressed={selectedQrType === type.value}
                        onClick={() => selectQrType(type.value)}
                        disabled={!canCreateQr}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          selectedQrType === type.value
                            ? "border-foreground/30 bg-accent text-foreground"
                            : "border-border text-muted-foreground hover:bg-accent/50"
                        }`}
                      >
                        <ToneIcon tone={type.tone} icon={type.icon} size="lg" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-name" className="text-xs text-muted-foreground">QR kod adı</Label>
                  <Input
                    id="qr-name"
                    placeholder="Örn: Web Sitesi QR"
                    value={qrName}
                    onChange={(e) => setQrName(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <QrTypeDetails
                  selectedType={selectedQrType}
                  data={qrTypeData}
                  onChange={setQrTypeData}
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">QR modu</Label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    {qrModes.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={qrMode === option.value}
                        onClick={() => setQrMode(option.value)}
                        disabled={!canCreateQr}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          qrMode === option.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {qrModes.find((option) => option.value === qrMode)?.[selectedQrType === "wifi" ? "wifiDesc" : "desc"]}
                  </p>
                </div>

                {qrMode === "dynamic" ? (
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="qr-tracking" className="text-sm font-normal text-foreground">Taramaları say</Label>
                    <Switch id="qr-tracking" checked={qrTracking} onCheckedChange={setQrTracking} />
                  </div>
                ) : null}

                <Button className="w-full" onClick={handleCreateQR} disabled={!canCreateQr || isCreating}>
                  {isCreating ? "Oluşturuluyor…" : "QR Kod Oluştur"}
                </Button>
              </div>
            </div>
          )}
    </>
  );
};


export default DashboardQrCodesView;
