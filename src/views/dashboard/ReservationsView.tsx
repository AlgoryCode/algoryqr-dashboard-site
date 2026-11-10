"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Check,
  CircleDot,
  Clock,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";

import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DigitalMenuHubGate } from "@/components/dashboard/digital-menu/DigitalMenuHubGate";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { ListPagination } from "@/components/dashboard/ListPagination";
import { LIST_ROW, LIST_ROW_LINK, ListCard, ListHead, ListMessage, ListSkeleton } from "@/components/dashboard/ListLayout";
import { ListToolbar } from "@/components/dashboard/ListToolbar";
import { ReservationDialog, type ReservationFormValues } from "@/components/dashboard/reservations/ReservationDialog";
import { ReservationLinkDialog } from "@/components/dashboard/reservations/ReservationLinkDialog";
import { StatTile } from "@/components/dashboard/StatTile";
import { ToneBadge } from "@/components/dashboard/ToneBadge";
import { TONE_ACTION, TONES } from "@/components/dashboard/tone";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useBranches } from "@/hooks/use-branches";
import {
  ApiError,
  createMenuReservationRequest,
  updateMenuReservationRequest,
  type MenuReservationApiItem,
  type MenuReservationStatus,
} from "@/lib/api";
import { RESERVATION_SOURCE_TONE, RESERVATION_STATUS_TONE } from "@/lib/badge-tones";
import { listMenuReservationsInRange } from "@/lib/branch-reservations";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import {
  EMPTY_RESERVATION_FILTERS,
  filterReservations,
  isReservationListNarrowed,
  localDay,
  parseReservationFilters,
  RESERVATION_PAGE_SIZE,
  RESERVATION_SOURCE_LABEL,
  RESERVATION_SOURCES,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUSES,
  RESERVATION_WHEN_LABEL,
  reservationDateRange,
  reservationDayLabel,
  reservationLink,
  reservationSortsAscending,
  reservationSource,
  reservationStats,
  reservationTime,
  serializeReservationFilters,
  sortReservations,
  type ReservationListFilters,
  type ReservationWhen,
} from "@/lib/reservation-list";
import { cn } from "@/lib/utils";

const QUERY_KEY = "reservations";
const ROW_COLUMNS = "lg:grid lg:grid-cols-[minmax(0,1fr)_5rem_8rem_8rem_5.5rem]";

type MenuInfo = { menuId: number; publicId?: string | null; menuName: string; branchId: number; branchName: string };

const STATUS_ICON = { PENDING: Clock, ACTIVE: CalendarCheck, CANCELED: CalendarX } as const;
const SOURCE_ICON = { online: Send, panel: Pencil } as const;

function shortDay(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return year && month && day ? `${day}.${month}.${year.slice(2)}` : ymd;
}

function whenLabel(filters: Pick<ReservationListFilters, "when" | "day">) {
  return filters.when === "day" ? shortDay(filters.day) : RESERVATION_WHEN_LABEL[filters.when];
}

function ReservationsPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const filters = useMemo(() => parseReservationFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [dialog, setDialog] = useState<{ item: MenuReservationApiItem | null; key: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MenuReservationApiItem | null>(null);

  const branchesQuery = useBranches(true);
  const branches = useMemo(() => branchesQuery.data?.content ?? [], [branchesQuery.data]);
  const menus = useMemo<MenuInfo[]>(
    () =>
      branches.flatMap((branch) =>
        (branch.menus ?? [])
          .filter((menu) => menu.active)
          .map((menu) => ({
            menuId: menu.menuId,
            publicId: menu.publicId,
            menuName: menu.businessName,
            branchId: branch.id,
            branchName: branch.name,
          })),
      ),
    [branches],
  );
  const menuById = useMemo(() => new Map(menus.map((menu) => [menu.menuId, menu])), [menus]);
  const chosenBranches = filters.branches.filter((id) => branches.some((branch) => branch.id === id));
  const scopeMenus = chosenBranches.length ? menus.filter((menu) => chosenBranches.includes(menu.branchId)) : menus;
  const scopeMenuIds = scopeMenus.map((menu) => menu.menuId);
  const range = reservationDateRange(filters);

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, scopeMenuIds, range.from ?? "", range.to ?? ""],
    queryFn: () => listMenuReservationsInRange(scopeMenuIds, range),
    enabled: scopeMenuIds.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const all = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  // Tiles count everything in the window that matches the other filters, so they read as "how many of each".
  const stats = useMemo(() => reservationStats(filterReservations(all, { ...filters, statuses: [] })), [all, filters]);
  const visible = useMemo(
    () => sortReservations(filterReservations(all, filters), reservationSortsAscending(filters.when)),
    [all, filters],
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / RESERVATION_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const pageItems = visible.slice((page - 1) * RESERVATION_PAGE_SIZE, page * RESERVATION_PAGE_SIZE);
  const narrowed = isReservationListNarrowed(filters);
  const showMenu = scopeMenus.length > 1;

  const update = (patch: Partial<ReservationListFilters>) => {
    const current = parseReservationFilters(new URLSearchParams(window.location.search));
    const query = serializeReservationFilters({ ...current, page: 1, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const clearAll = () => router.replace(pathname, { scroll: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  const failure = (err: unknown, fallback: string) => notify("danger", err instanceof ApiError ? err.message : fallback);

  const statusMutation = useMutation({
    mutationFn: ({ item, status }: { item: MenuReservationApiItem; status: MenuReservationStatus }) =>
      updateMenuReservationRequest(item.menuId, item.id, { status }),
    onSuccess: async (_saved, { status }) => {
      await refresh();
      setCancelTarget(null);
      notify("info", status === "ACTIVE" ? "Rezervasyon onaylandı." : "Rezervasyon iptal edildi.");
    },
    onError: (err) => failure(err, "Durum güncellenemedi."),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ item, values }: { item: MenuReservationApiItem | null; values: ReservationFormValues }) => {
      if (!item) {
        return createMenuReservationRequest(values.menuId, {
          customerName: values.customerName,
          phone: values.phone || undefined,
          email: values.email || undefined,
          partySize: values.partySize,
          reservationAt: values.reservationAt,
          note: values.note || undefined,
        });
      }
      return updateMenuReservationRequest(item.menuId, item.id, {
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
        partySize: values.partySize,
        note: values.note,
        reservationAt: values.reservationAt,
      });
    },
    onSuccess: async (_saved, { item }) => {
      await refresh();
      setDialog(null);
      notify("info", item ? "Rezervasyon güncellendi." : "Rezervasyon oluşturuldu.");
    },
    onError: (err) => failure(err, "Rezervasyon kaydedilemedi."),
  });

  const openCreate = () => setDialog({ item: null, key: Date.now() });
  const busyId = statusMutation.isPending ? statusMutation.variables?.item.id : null;

  if (branchesQuery.isPending) return <DashboardLoadingState label="Rezervasyonlar yükleniyor…" />;

  const header = (
    <DashboardPageHeader
      title="Rezervasyonlar"
      hint="Gelen talepleri onaylayın, telefonla alınanları ekleyin ve rezervasyon linkinizi paylaşın."
      action={
        menus.length > 0 ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" size="sm" variant="outline" className="h-9 flex-1 gap-1.5 sm:flex-none" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-4" />
              Rezervasyon linki
            </Button>
            <Button type="button" size="sm" className="h-9 flex-1 gap-1.5 sm:flex-none" onClick={openCreate}>
              <Plus className="size-4" />
              Rezervasyon oluştur
            </Button>
          </div>
        ) : null
      }
    />
  );

  if (branches.length === 0 || menus.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        {header}
        {branches.length === 0 ? (
          <EmptyState
            title="Önce bir şube oluşturun"
            description="Rezervasyonlar şubedeki dijital menü üzerinden alınır."
            action={
              <Button asChild variant="outline">
                <Link href={DASHBOARD_ROUTES.branchCreate}>Şube oluştur</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Yayında bir menü yok"
            description="Rezervasyon linki ve talepler bir dijital menüye bağlıdır."
            action={
              <Button asChild variant="outline">
                <Link href={DASHBOARD_ROUTES.digitalMenu}>Menü oluştur</Link>
              </Button>
            }
          />
        )}
      </div>
    );
  }

  const tiles: Array<{ status: MenuReservationStatus; label: string }> = [
    { status: "PENDING", label: "Onay bekliyor" },
    { status: "ACTIVE", label: "Onaylı" },
    { status: "CANCELED", label: "İptal" },
  ];

  const toggleStatus = (status: MenuReservationStatus) =>
    update({
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((value) => value !== status)
        : RESERVATION_STATUSES.filter((value) => value === status || filters.statuses.includes(value)),
    });

  // Day headers keep a long list readable: the rows of one day sit under one title.
  const dayOf = (item: MenuReservationApiItem) => localDay(new Date(item.reservationAt));
  const dayCounts = new Map<string, number>();
  for (const item of visible) dayCounts.set(dayOf(item), (dayCounts.get(dayOf(item)) ?? 0) + 1);

  return (
    <div className="space-y-4 animate-fade-in">
      {header}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:px-0">
        {tiles.map((tile) => (
          <div key={tile.status} className="min-w-[11rem] flex-1 sm:min-w-0">
            <StatTile
              label={tile.label}
              value={String(stats[tile.status])}
              hint={whenLabel(filters)}
              icon={STATUS_ICON[tile.status]}
              tone={RESERVATION_STATUS_TONE[tile.status]}
              loading={listQuery.isPending}
              selected={filters.statuses.includes(tile.status)}
              onClick={() => toggleStatus(tile.status)}
            />
          </div>
        ))}
        <div className="min-w-[11rem] flex-1 sm:min-w-0">
          <StatTile
            label="Beklenen misafir"
            value={String(stats.guests)}
            hint="İptaller hariç"
            icon={Users}
            tone="teal"
            loading={listQuery.isPending}
          />
        </div>
      </div>

      <ListCard label="Rezervasyonlar">
        <ListToolbar
          query={filters.query}
          onQueryChange={(query) => update({ query })}
          searchPlaceholder="İsim, telefon veya not ara"
          searchLabel="Rezervasyon ara"
          searching={listQuery.isFetching && !listQuery.isPending}
          narrowed={narrowed}
          onClear={clearAll}
          filters={
            <>
              <WhenFilter filters={filters} onChange={(when, day) => update({ when, day })} />
              <FilterMenu
                label="Durum"
                icon={CircleDot}
                multiple
                values={filters.statuses}
                options={RESERVATION_STATUSES.map((status) => ({
                  value: status,
                  label: RESERVATION_STATUS_LABEL[status],
                  tone: RESERVATION_STATUS_TONE[status],
                  count: stats[status],
                }))}
                onValuesChange={(statuses) => update({ statuses })}
              />
              <FilterMenu
                label="Kaynak"
                icon={Send}
                multiple
                values={filters.sources}
                options={RESERVATION_SOURCES.map((source) => ({
                  value: source,
                  label: RESERVATION_SOURCE_LABEL[source],
                  tone: RESERVATION_SOURCE_TONE[source],
                }))}
                onValuesChange={(sources) => update({ sources })}
              />
              {branches.length > 1 ? (
                <FilterMenu
                  label="Şube"
                  icon={Building2}
                  multiple
                  values={chosenBranches.map(String)}
                  options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
                  onValuesChange={(values) => update({ branches: values.map(Number) })}
                />
              ) : null}
            </>
          }
        />

        {listQuery.isPending ? (
          <ListSkeleton />
        ) : listQuery.isError ? (
          <ListMessage title="Rezervasyonlar alınamadı" action={{ label: "Tekrar dene", onClick: () => void listQuery.refetch() }} />
        ) : visible.length === 0 ? (
          narrowed ? (
            <ListMessage
              title="Bu filtrelerle rezervasyon yok"
              description="Zamanı veya durumu değiştirerek tekrar bakın."
              action={{ label: "Filtreleri temizle", onClick: clearAll }}
            />
          ) : (
            <ListMessage
              icon={CalendarDays}
              title="Yaklaşan rezervasyon yok"
              description="Rezervasyon linkinizi paylaşın ya da telefonla gelen bir rezervasyonu siz ekleyin."
              action={{ label: "Rezervasyon oluştur", onClick: openCreate, variant: "default" }}
            />
          )
        ) : (
          <>
            <ListHead columns={ROW_COLUMNS} labels={["Misafir", "Kişi", "Durum", showMenu ? "Menü" : "Kaynak", { srOnly: "İşlemler" }]} />
            <ul className="divide-y divide-border">
              {pageItems.map((item, index) => {
                const day = dayOf(item);
                const dayHeader = index === 0 || day !== dayOf(pageItems[index - 1]);
                const dayCount = dayCounts.get(day) ?? 0;
                return (
                  <Fragment key={`${item.menuId}-${item.id}`}>
                    {dayHeader ? (
                      <li className="flex items-center justify-between bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground lg:px-4">
                        <span className="first-letter:uppercase">{reservationDayLabel(item.reservationAt)}</span>
                        <span className="tabular-nums">{dayCount} rezervasyon</span>
                      </li>
                    ) : null}
                    <ReservationRow
                      item={item}
                      menu={menuById.get(item.menuId)}
                      showMenu={showMenu}
                      busy={busyId === item.id}
                      onEdit={() => setDialog({ item, key: Date.now() })}
                      onConfirm={() => statusMutation.mutate({ item, status: "ACTIVE" })}
                      onCancel={() => setCancelTarget(item)}
                    />
                  </Fragment>
                );
              })}
            </ul>
            <ListPagination page={page} pageSize={RESERVATION_PAGE_SIZE} total={visible.length} unit="rezervasyon" onPage={(next) => update({ page: next })} />
          </>
        )}
      </ListCard>

      {dialog ? (
        <ReservationDialog
          key={dialog.key}
          open
          onOpenChange={(open) => (open ? null : setDialog(null))}
          item={dialog.item}
          menus={scopeMenus.map((menu) => ({
            menuId: menu.menuId,
            label: branches.length > 1 ? `${menu.branchName} · ${menu.menuName}` : menu.menuName,
          }))}
          defaultMenuId={scopeMenus[0]?.menuId ?? null}
          saving={saveMutation.isPending}
          onSubmit={(values) => saveMutation.mutate({ item: dialog.item, values })}
        />
      ) : null}

      <ReservationLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        links={menus.map((menu) => ({
          menuId: menu.menuId,
          title: menu.menuName,
          subtitle: branches.length > 1 ? menu.branchName : undefined,
          url: reservationLink(menu.publicId, menu.menuId),
        }))}
      />

      <AlertDialog open={cancelTarget != null} onOpenChange={(open) => (open ? null : setCancelTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rezervasyon iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget
                ? `${cancelTarget.customerName} · ${reservationDayLabel(cancelTarget.reservationAt)} ${reservationTime(cancelTarget.reservationAt)}. İptal edilen rezervasyon tekrar açılamaz.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={statusMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (cancelTarget) statusMutation.mutate({ item: cancelTarget, status: "CANCELED" });
              }}
            >
              İptal et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReservationRow({
  item,
  menu,
  showMenu,
  busy,
  onEdit,
  onConfirm,
  onCancel,
}: {
  item: MenuReservationApiItem;
  menu?: MenuInfo;
  showMenu: boolean;
  busy: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tone = RESERVATION_STATUS_TONE[item.status];
  const source = reservationSource(item);
  const SourceIcon = SOURCE_ICON[source];
  const canceled = item.status === "CANCELED";
  const contact = [item.phone, item.email].filter(Boolean).join(" · ");
  const sourceBadge = (
    <ToneBadge tone={RESERVATION_SOURCE_TONE[source]}>
      <SourceIcon className="size-3" aria-hidden />
      {RESERVATION_SOURCE_LABEL[source]}
    </ToneBadge>
  );

  return (
    <li className={cn(LIST_ROW, ROW_COLUMNS, canceled && "opacity-60")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-14 shrink-0 items-center justify-center rounded-[10px] text-sm font-semibold tabular-nums",
            TONES[tone],
          )}
        >
          {reservationTime(item.reservationAt)}
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={canceled}
            className={cn("block max-w-full truncate text-left text-sm font-medium text-foreground disabled:cursor-default", !canceled && LIST_ROW_LINK)}
          >
            {item.customerName}
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {contact || "İletişim bilgisi yok"}
            {item.note ? <span className="text-foreground/70"> · “{item.note}”</span> : null}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 lg:hidden">
            <ToneBadge tone={tone}>{RESERVATION_STATUS_LABEL[item.status]}</ToneBadge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" aria-hidden />
              {item.partySize}
            </span>
            {showMenu && menu ? <span className="truncate text-xs text-muted-foreground">{menu.menuName}</span> : sourceBadge}
          </div>
        </div>
      </div>

      <p className="hidden items-center gap-1.5 text-sm tabular-nums text-muted-foreground lg:flex">
        <Users className="size-3.5" aria-hidden />
        {item.partySize}
      </p>
      <div className="hidden lg:block">
        <ToneBadge tone={tone} dot>
          {RESERVATION_STATUS_LABEL[item.status]}
        </ToneBadge>
      </div>
      <div className="hidden min-w-0 lg:block">
        {showMenu ? (
          <p className="truncate text-sm text-muted-foreground" title={menu ? `${menu.branchName} · ${menu.menuName}` : undefined}>
            {menu?.menuName ?? `Menü #${item.menuId}`}
          </p>
        ) : (
          sourceBadge
        )}
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-end gap-1">
        {item.status === "PENDING" ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-8 rounded-[10px]", TONES.green, "hover:bg-[#D1FAE5] hover:text-[#128C7E]")}
            disabled={busy}
            onClick={onConfirm}
            aria-label={`${item.customerName} rezervasyonunu onayla`}
            title="Onayla"
          >
            <Check className="size-4" />
          </Button>
        ) : null}
        {!canceled ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="size-8" disabled={busy} aria-label="Diğer işlemler">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onSelect={onEdit} className="gap-2">
                <Pencil className="size-3.5" />
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onCancel} className={cn("gap-2", TONE_ACTION.delete, "rounded-sm bg-transparent")}>
                <X className="size-3.5" />
                İptal et
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  );
}

const WHEN_OPTIONS: Array<Exclude<ReservationWhen, "day">> = ["upcoming", "today", "tomorrow", "week", "past", "all"];

/** Time window: quick choices for the days ahead, the past, or one exact day. */
function WhenFilter({
  filters,
  onChange,
}: {
  filters: ReservationListFilters;
  onChange: (when: ReservationWhen, day: string) => void;
}) {
  const [day, setDay] = useState(filters.day);
  const active = filters.when !== EMPTY_RESERVATION_FILTERS.when;

  return (
    <FilterMenu
      label="Zaman"
      icon={CalendarDays}
      tone="violet"
      activeLabel={active ? whenLabel(filters) : null}
      idleLabel={RESERVATION_WHEN_LABEL.upcoming}
      onClear={() => onChange("upcoming", "")}
      content={(close) => (
        <div className="w-full space-y-3 md:w-60">
          <ul className="space-y-0.5">
            {WHEN_OPTIONS.map((when) => {
              const selected = filters.when === when;
              return (
                <li key={when}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(when, "");
                      close();
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                      selected && "font-medium",
                    )}
                  >
                    {RESERVATION_WHEN_LABEL[when]}
                    <Check className={cn("size-4", selected ? "text-foreground" : "invisible")} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 border-t border-border pt-3">
            <p className="px-1 text-xs font-medium text-muted-foreground">Belirli bir gün</p>
            <Input type="date" aria-label="Gün" value={day} onChange={(event) => setDay(event.target.value)} className="h-9 text-sm" />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!day}
              onClick={() => {
                onChange("day", day);
                close();
              }}
            >
              Göster
            </Button>
          </div>
        </div>
      )}
    />
  );
}

export default function ReservationsView() {
  return (
    <DigitalMenuHubGate>
      <ReservationsPanel />
    </DigitalMenuHubGate>
  );
}
