"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal } from "lucide-react";

import {
  BranchReportPicker,
  useBranchReportSelection,
} from "@/components/dashboard/BranchReportPicker";
import { DigitalMenuHubGate } from "@/components/dashboard/digital-menu/DigitalMenuHubGate";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_PANEL,
  DASHBOARD_STAT_TILE,
  DASHBOARD_SURFACE,
  DASHBOARD_TYPE_KPI,
} from "@/lib/dashboard-surface";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import {
  ApiError,
  updateMenuReservationRequest,
  type MenuReservationApiItem,
  type MenuReservationStatus,
} from "@/lib/api";
import { listBranchReservations } from "@/lib/branch-reservations";
import { cn } from "@/lib/utils";

type StatusFilter = MenuReservationStatus | "all";

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

function statusLabel(status: MenuReservationStatus): string {
  switch (status) {
    case "PENDING":
      return "Onay bekliyor";
    case "ACTIVE":
      return "Aktif";
    case "CANCELED":
      return "İptal";
    default:
      return status;
  }
}

function statusClass(status: MenuReservationStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "ACTIVE":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "CANCELED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ReservationsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBranchId = useMemo(() => {
    const raw = Number(searchParams.get("branch"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const initialQrId = useMemo(() => {
    const raw = Number(searchParams.get("qr"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);

  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();

  const { branches, selection, branchId, loading, empty, select } = useBranchReportSelection(
    initialBranchId,
    initialQrId,
  );
  const branch = selection?.branch ?? null;
  const menuNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const menu of branch?.menus ?? []) {
      map.set(menu.menuId, menu.businessName);
    }
    return map;
  }, [branch?.menus]);
  const showMenuColumn = (branch?.menus.length ?? 0) > 1;

  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const listQuery = useQuery({
    queryKey: ["branch-reservations", branchId, status, page],
    enabled: branch != null,
    queryFn: () =>
      listBranchReservations(branch!, {
        status,
        page,
        size: 20,
      }),
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      menuId: number;
      reservationId: number;
      status?: MenuReservationStatus;
      reservationAt?: string;
    }) =>
      updateMenuReservationRequest(payload.menuId, payload.reservationId, {
        status: payload.status,
        reservationAt: payload.reservationAt,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch-reservations", branchId] });
      setEditingId(null);
      notify("info", "Rezervasyon güncellendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof ApiError ? err.message : "Güncelleme başarısız.");
    },
  });

  const items = listQuery.data?.content ?? [];
  const totalPages = listQuery.data?.totalPages ?? 0;

  const total = listQuery.data?.totalElements ?? items.length;

  const renderRowActions = (item: MenuReservationApiItem) => {
    const busy = mutation.isPending;
    if (editingId === item.id) {
      return (
        <div className="flex min-w-[14rem] flex-col gap-2">
          <DateTimePicker className="h-9 w-full" value={editValue} onChange={setEditValue} />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy || !editValue}
              onClick={() =>
                mutation.mutate({
                  menuId: item.menuId,
                  reservationId: item.id,
                  reservationAt: fromLocalInputValue(editValue),
                })
              }
            >
              Kaydet
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>
              Vazgeç
            </Button>
          </div>
        </div>
      );
    }

    if (item.status === "CANCELED") {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">İşlemler</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.status === "PENDING" ? (
            <DropdownMenuItem
              onClick={() =>
                mutation.mutate({ menuId: item.menuId, reservationId: item.id, status: "ACTIVE" })
              }
            >
              Onayla
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              mutation.mutate({ menuId: item.menuId, reservationId: item.id, status: "CANCELED" })
            }
          >
            İptal et
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setEditingId(item.id);
              setEditValue(toLocalInputValue(item.reservationAt));
            }}
          >
            Tarih/saat düzenle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <DashboardPageHeader
        title="Rezervasyonlar"
        hint="Şubeye göre rezervasyonları görüntüleyin ve yönetin."
      />

      {empty ? (
        <EmptyState
          title="Şube gerekli"
          description="Rezervasyonları görmek için önce bir şube oluşturun."
          action={
            <Button asChild variant="outline">
              <Link href={DASHBOARD_ROUTES.branchCreate}>Şube oluştur</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className={`${DASHBOARD_PANEL} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <BranchReportPicker
              branches={branches}
              selectedBranchId={branchId}
              showMenuFilter={false}
              onBranchSelect={(nextBranchId) => {
                setPage(0);
                select(nextBranchId, null);
                router.replace(DASHBOARD_ROUTES.reservationsForBranch(nextBranchId), {
                  scroll: false,
                });
              }}
            />
          </div>

          {loading || branchId == null ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Şube bilgisi yükleniyor…
            </div>
          ) : (branch?.menus.length ?? 0) === 0 ? (
            <EmptyState
              title="Menü gerekli"
              description="Bu şubede dijital menü yok. Rezervasyonlar menü üzerinden alınır."
              action={
                <Button asChild variant="outline">
                  <Link href={DASHBOARD_ROUTES.digitalMenu}>Menü oluştur</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("all");
                    setPage(0);
                  }}
                  className={cn(DASHBOARD_STAT_TILE, status === "all" && "ring-2 ring-primary/30")}
                >
                  <p className={DASHBOARD_METRIC_LABEL}>Toplam</p>
                  <p className={DASHBOARD_TYPE_KPI}>{status === "all" ? total : "—"}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("PENDING");
                    setPage(0);
                  }}
                  className={cn(DASHBOARD_STAT_TILE, status === "PENDING" && "ring-2 ring-primary/30")}
                >
                  <p className={DASHBOARD_METRIC_LABEL}>Bekleyen</p>
                  <p className={DASHBOARD_TYPE_KPI}>{status === "PENDING" ? total : "—"}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("ACTIVE");
                    setPage(0);
                  }}
                  className={cn(DASHBOARD_STAT_TILE, status === "ACTIVE" && "ring-2 ring-primary/30")}
                >
                  <p className={DASHBOARD_METRIC_LABEL}>Aktif</p>
                  <p className={DASHBOARD_TYPE_KPI}>{status === "ACTIVE" ? total : "—"}</p>
                </button>
              </div>

              {listQuery.isLoading ? (
                <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rezervasyonlar yükleniyor…
                </div>
              ) : listQuery.isError ? (
                <p className="text-sm text-destructive">
                  {listQuery.error instanceof Error
                    ? listQuery.error.message
                    : "Rezervasyonlar yüklenemedi."}
                </p>
              ) : items.length === 0 ? (
                <EmptyState
                  title={status !== "all" ? "Bu durumda rezervasyon yok" : "Henüz rezervasyon yok"}
                  description={
                    status !== "all"
                      ? "Başka bir durum seçerek tekrar deneyin."
                      : "Müşteriler rezervasyon yaptığında burada görünür."
                  }
                  action={
                    status !== "all" ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStatus("all");
                          setPage(0);
                        }}
                      >
                        Tümünü göster
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className={`${DASHBOARD_SURFACE} overflow-hidden`}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-10">Müşteri</TableHead>
                        <TableHead className="h-10">İletişim</TableHead>
                        <TableHead className="h-10">Tarih / saat</TableHead>
                        <TableHead className="h-10 w-[4.5rem]">Kişi</TableHead>
                        {showMenuColumn ? <TableHead className="h-10">Menü</TableHead> : null}
                        <TableHead className="h-10">Durum</TableHead>
                        <TableHead className="h-10">Not</TableHead>
                        <TableHead className="h-10 w-[4rem] text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={`${item.menuId}-${item.id}`}>
                          <TableCell className="py-3 font-medium">{item.customerName}</TableCell>
                          <TableCell className="max-w-[12rem] py-3 text-muted-foreground">
                            <div className="truncate">{item.phone || "—"}</div>
                            <div className="truncate text-xs">{item.email || "—"}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-3 text-muted-foreground">
                            {formatDateTime(item.reservationAt)}
                          </TableCell>
                          <TableCell className="py-3 tabular-nums text-muted-foreground">
                            {item.partySize}
                          </TableCell>
                          {showMenuColumn ? (
                            <TableCell className="max-w-[10rem] truncate py-3 text-muted-foreground">
                              {menuNameById.get(item.menuId) ?? `Menü #${item.menuId}`}
                            </TableCell>
                          ) : null}
                          <TableCell className="py-3">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[14rem] truncate py-3 text-muted-foreground">
                            {item.note?.trim() || "—"}
                          </TableCell>
                          <TableCell className="py-3 text-right">{renderRowActions(item)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0 || listQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Önceki
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Sayfa {page + 1} / {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!listQuery.data?.hasNext || listQuery.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ReservationsView() {
  return (
    <DigitalMenuHubGate>
      <ReservationsPanel />
    </DigitalMenuHubGate>
  );
}
