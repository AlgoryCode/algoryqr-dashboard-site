"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Plus, Receipt, ReceiptText, Trash2, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import {
  DigitalMenuPicker,
  useDigitalMenuAccess,
  useDigitalMenuOptions,
} from "@/components/dashboard/menu/DigitalMenuPicker";
import { BranchPicker, useBranchSelection } from "@/components/dashboard/BranchPicker";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DateFilterMenu } from "@/components/dashboard/DateFilterMenu";
import { FilterChips } from "@/components/dashboard/FilterChips";
import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { ListPagination } from "@/components/dashboard/ListPagination";
import { LIST_ROW, LIST_ROW_LINK, ListCard, ListHead, ListMessage, ListSkeleton } from "@/components/dashboard/ListLayout";
import { ListToolbar } from "@/components/dashboard/ListToolbar";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { StatTile } from "@/components/dashboard/StatTile";
import { ToneBadge } from "@/components/dashboard/ToneBadge";
import { TONE_ACTION, ToneIcon, type Tone } from "@/components/dashboard/tone";
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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyInput, parseMoneyInput } from "@/components/ui/money-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useAccessSession } from "@/hooks/use-commerce";
import {
  ACCOUNTING_PAGE_SIZE,
  ACCOUNTING_TYPES,
  accountingTypeParam,
  EMPTY_ACCOUNTING_FILTERS,
  entryTypeLabel,
  formatAccountingAmount,
  formatAccountingDate,
  isAccountingNarrowed,
  parseAccountingFilters,
  serializeAccountingFilters,
  signedAmountPrefix,
  sourceTypeLabel,
  type AccountingListFilters,
} from "@/lib/accounting-list";
import { ENTRY_SOURCE_TONE, ENTRY_TYPE_TONE } from "@/lib/badge-tones";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";
import {
  ApiError,
  createAccountingEntryRequest,
  createBranchFixedExpenseRequest,
  deleteAccountingEntryRequest,
  getAccountingEntryDetailRequest,
  listAccountingEntriesRequest,
  type AccountingEntryApiItem,
  type AccountingEntryType,
  type FixedExpensePeriod,
} from "@/lib/api";

const formatAmount = formatAccountingAmount;
const formatDateTime = formatAccountingDate;

const ENTRY_ICON: Record<AccountingEntryType, LucideIcon> = {
  GELIR: TrendingUp,
  GIDER: TrendingDown,
  BORC: Receipt,
};

/** Amount colour follows the entry type: money in green, money out red, debt orange. */
const AMOUNT_TEXT: Record<AccountingEntryType, string> = {
  GELIR: "text-[#128C7E] dark:text-[#4ADE80]",
  GIDER: "text-[#F03245] dark:text-[#FB7185]",
  BORC: "text-[#C2410C] dark:text-[#FB923C]",
};

/** The menu column only fits on wide screens; below that the menu name moves under the title. */
const ROW_COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_5rem_8.5rem_7.5rem_2rem] lg:items-center lg:gap-3 xl:grid-cols-[minmax(0,2.2fr)_5rem_8.5rem_minmax(0,1.2fr)_7.5rem_2rem] xl:gap-4";

function canLoadEntryLines(item: AccountingEntryApiItem): boolean {
  return (
    item.sourceType === "BILL_SALE" ||
    item.sourceBillId != null ||
    item.sourceOrderId != null
  );
}

type ExpenseMode = "ONE_TIME" | "FIXED";

function toLocalInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

export default function AccountingView() {
  const router = useRouter();
  const accessSession = useAccessSession();
  const hasAllowAccess = accessSession.data?.decision === "ALLOW";

  useEffect(() => {
    if (accessSession.isLoading || accessSession.isError) return;
    if (!hasAllowAccess) {
      router.replace(DASHBOARD_ROUTES.accountPackages);
    }
  }, [accessSession.isError, accessSession.isLoading, hasAllowAccess, router]);

  if (accessSession.isLoading || !hasAllowAccess) {
    return <DashboardLoadingState label="Yönlendiriliyor…" />;
  }

  return <AccountingViewContent />;
}

function AccountingViewContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useDashboardBanners();
  const queryClient = useQueryClient();

  const { canUseDigitalMenu } = useDigitalMenuAccess();
  const { menuQrs } = useDigitalMenuOptions(canUseDigitalMenu);
  const {
    branches,
    branchId: fixedExpenseBranchId,
    select: selectFixedExpenseBranch,
  } = useBranchSelection(null, true);

  // Filters live in the address, so a trip to another page and back lands on the same list.
  const filters = useMemo(() => parseAccountingFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [detailItem, setDetailItem] = useState<AccountingEntryApiItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountingEntryApiItem | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<AccountingEntryType>("GELIR");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(toLocalInputValue());
  const [note, setNote] = useState("");
  const [formMenuId, setFormMenuId] = useState<number | null>(null);
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>("ONE_TIME");
  const [expensePeriod, setExpensePeriod] = useState<FixedExpensePeriod>("MONTHLY");
  const [dialogBranchId, setDialogBranchId] = useState<number | null>(null);

  const update = (patch: Partial<AccountingListFilters>) => {
    const current = parseAccountingFilters(new URLSearchParams(window.location.search));
    const query = serializeAccountingFilters({ ...current, page: 1, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const createFixedExpenseMutation = useMutation({
    mutationFn: (payload: {
      branchId: number;
      title: string;
      amount: number;
      period: FixedExpensePeriod;
    }) =>
      createBranchFixedExpenseRequest(payload.branchId, {
        title: payload.title,
        amount: payload.amount,
        period: payload.period,
        active: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch-fixed-expenses"] });
      setDialogOpen(false);
      resetForm();
      notify("info", "Sabit gider eklendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof ApiError ? err.message : "Sabit gider eklenemedi.");
    },
  });

  const listQuery = useQuery({
    queryKey: ["accounting-entries", filters.types.join(","), filters.query, filters.range.from, filters.range.to, filters.page],
    queryFn: () =>
      listAccountingEntriesRequest({
        type: accountingTypeParam(filters.types),
        q: filters.query.trim() || undefined,
        from: filters.range.from || undefined,
        to: filters.range.to || undefined,
        page: filters.page - 1,
        size: ACCOUNTING_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: createAccountingEntryRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      setDialogOpen(false);
      resetForm();
      notify("info", "Kayıt eklendi.");
    },
    onError: (err) => {
      notify("danger", err instanceof ApiError ? err.message : "Kayıt eklenemedi.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccountingEntryRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
      setDetailItem(null);
      setDeleteTarget(null);
      notify("info", "Kayıt silindi.");
    },
    onError: (err) => {
      notify("danger", err instanceof ApiError ? err.message : "Kayıt silinemedi.");
    },
  });

  const items = listQuery.data?.content ?? [];
  const totalElements = listQuery.data?.totalElements ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;
  const summary = listQuery.data?.summary;
  const narrowed = isAccountingNarrowed(filters);

  // The last page can vanish after a delete or a filter change; step back to the real last one.
  useEffect(() => {
    if (totalPages > 0 && filters.page > totalPages) {
      const current = parseAccountingFilters(new URLSearchParams(window.location.search));
      const query = serializeAccountingFilters({ ...current, page: totalPages }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [filters.page, totalPages, pathname, router]);

  function resetForm() {
    setTitle("");
    setAmount("");
    setOccurredAt(toLocalInputValue());
    setNote("");
    setFormMenuId(null);
    setExpenseMode("ONE_TIME");
    setExpensePeriod("MONTHLY");
    setDialogBranchId(fixedExpenseBranchId);
  }

  function openDialog(entryType: AccountingEntryType) {
    setDialogType(entryType);
    resetForm();
    setDialogOpen(true);
  }

  function openFixedExpenseDialog() {
    setDialogType("GIDER");
    resetForm();
    setExpenseMode("FIXED");
    setDialogOpen(true);
  }

  function handleSubmit() {
    const parsedAmount = parseMoneyInput(amount);
    if (!title.trim()) {
      notify("danger", "Başlık zorunludur.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0.01) {
      notify("danger", "Geçerli bir tutar girin.");
      return;
    }

    if (dialogType === "GIDER" && expenseMode === "FIXED") {
      const branchId = dialogBranchId ?? fixedExpenseBranchId;
      if (branchId == null) {
        notify("danger", "Şube seçin.");
        return;
      }
      createFixedExpenseMutation.mutate({
        branchId,
        title: title.trim(),
        amount: parsedAmount,
        period: expensePeriod,
      });
      return;
    }

    if (!occurredAt) {
      notify("danger", "İşlem tarihi zorunludur.");
      return;
    }

    createMutation.mutate({
      entryType: dialogType,
      title: title.trim(),
      amount: parsedAmount,
      occurredAt: fromLocalInputValue(occurredAt),
      note: note.trim() || undefined,
      menuId: dialogType === "GELIR" && formMenuId != null ? formMenuId : undefined,
    });
  }

  const saving = createMutation.isPending || createFixedExpenseMutation.isPending;

  const typeOptions: Array<{ value: AccountingEntryType; label: string; tone?: Tone }> = [
    { value: "GELIR", label: "Gelir", tone: ENTRY_TYPE_TONE.GELIR },
    { value: "GIDER", label: "Gider", tone: ENTRY_TYPE_TONE.GIDER },
    { value: "BORC", label: "Borç", tone: ENTRY_TYPE_TONE.BORC },
  ];

  const stats: Array<{ type: AccountingEntryType; label: string; value: number | string | undefined }> = [
    { type: "GELIR", label: "Toplam gelir", value: summary?.totalGelir },
    { type: "GIDER", label: "Toplam gider", value: summary?.totalGider },
    { type: "BORC", label: "Toplam borç", value: summary?.totalBorc },
  ];

  const addActions: Array<{ label: string; icon: LucideIcon; tone: Tone; run: () => void }> = [
    { label: "Gelir ekle", icon: TrendingUp, tone: ENTRY_TYPE_TONE.GELIR, run: () => openDialog("GELIR") },
    { label: "Gider ekle", icon: TrendingDown, tone: ENTRY_TYPE_TONE.GIDER, run: () => openDialog("GIDER") },
    { label: "Borç ekle", icon: Receipt, tone: ENTRY_TYPE_TONE.BORC, run: () => openDialog("BORC") },
    { label: "Sabit gider ekle", icon: CalendarClock, tone: ENTRY_TYPE_TONE.GIDER, run: openFixedExpenseDialog },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <DashboardPageHeader
        title="Muhasebe"
        hint="Gelir, gider ve borç kayıtlarınızı takip edin."
        action={
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-9 w-full shrink-0 gap-1.5 sm:w-auto">
                <Plus className="size-4" />
                Kayıt ekle
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {addActions.map((action) => (
                <DropdownMenuItem key={action.label} onSelect={action.run} className="gap-2.5">
                  <ToneIcon tone={action.tone} icon={action.icon} size="sm" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:px-0">
        {stats.map((stat) => (
          <div key={stat.type} className="min-w-[13.5rem] flex-1 sm:min-w-0">
            <StatTile
              label={stat.label}
              value={formatAmount(stat.value ?? 0, summary?.currency)}
              icon={ENTRY_ICON[stat.type]}
              tone={ENTRY_TYPE_TONE[stat.type]}
              loading={listQuery.isPending}
              selected={filters.types.includes(stat.type)}
              onClick={() =>
                update({
                  types: filters.types.includes(stat.type)
                    ? filters.types.filter((type) => type !== stat.type)
                    : ACCOUNTING_TYPES.filter((type) => type === stat.type || filters.types.includes(type)),
                })
              }
            />
          </div>
        ))}
      </div>

      <ListCard label="Muhasebe kayıtları">
        <ListToolbar
          query={filters.query}
          onQueryChange={(query) => update({ query })}
          searchPlaceholder="Başlık veya not ara"
          searchLabel="Kayıt ara"
          searching={listQuery.isFetching && !listQuery.isPending}
          narrowed={narrowed}
          onClear={() => update(EMPTY_ACCOUNTING_FILTERS)}
          filters={
            <>
              <FilterMenu
                label="Tür"
                icon={ReceiptText}
                multiple
                values={filters.types}
                options={typeOptions}
                onValuesChange={(types) => update({ types })}
              />
              <DateFilterMenu
                value={filters.range}
                emptyRange={EMPTY_ACCOUNTING_FILTERS.range}
                onChange={(range) => update({ range })}
              />
            </>
          }
        />

        {listQuery.isPending ? (
          <ListSkeleton />
        ) : listQuery.isError ? (
          <ListMessage
            title="Kayıtlar alınamadı"
            action={{ label: "Tekrar dene", onClick: () => void listQuery.refetch() }}
          />
        ) : items.length === 0 ? (
          narrowed ? (
            <ListMessage
              title="Bu filtrelerle kayıt yok"
              description="Türü veya tarih aralığını değiştirerek tekrar bakın."
              action={{ label: "Filtreleri temizle", onClick: () => update(EMPTY_ACCOUNTING_FILTERS) }}
            />
          ) : (
            <ListMessage
              icon={ReceiptText}
              title="Henüz kayıt yok"
              description="Adisyon ve sipariş satışları kendiliğinden buraya düşer. Gider ve borcu siz eklersiniz."
              action={{ label: "İlk geliri ekle", onClick: () => openDialog("GELIR"), variant: "default" }}
            />
          )
        ) : (
          <>
            <ListHead
              columns={ROW_COLUMNS}
              labels={["Kayıt", "Tür", "Tarih", { label: "Menü", className: "hidden xl:block" }, { right: "Tutar" }, { srOnly: "İşlemler" }]}
            />
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <AccountingRow
                  key={item.id}
                  item={item}
                  onOpen={() => setDetailItem(item)}
                  onDelete={item.sourceType === "MANUAL" ? () => setDeleteTarget(item) : undefined}
                />
              ))}
            </ul>
            <ListPagination
              page={Math.min(filters.page, Math.max(totalPages, 1))}
              pageSize={ACCOUNTING_PAGE_SIZE}
              total={totalElements}
              unit="kayıt"
              onPage={(page) => update({ page })}
            />
          </>
        )}
      </ListCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "GIDER" && expenseMode === "FIXED"
                ? "Sabit gider ekle"
                : `${entryTypeLabel(dialogType)} ekle`}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "GELIR"
                ? "Gelir kaydı oluşturun. İsterseniz hangi menüden geldiğini seçebilirsiniz."
                : dialogType === "GIDER"
                  ? "Tek seferlik veya şube bazlı sabit gider kaydı oluşturun."
                  : `${entryTypeLabel(dialogType)} kaydı oluşturun.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {dialogType === "GIDER" ? (
              <FilterChips<ExpenseMode>
                label="Gider türü"
                value={expenseMode}
                onChange={setExpenseMode}
                options={[
                  { value: "ONE_TIME", label: "Tek seferlik" },
                  { value: "FIXED", label: "Sabit (düzenli)" },
                ]}
              />
            ) : null}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Başlık</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn. Kira ödemesi"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tutar (₺)</label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="0,00" />
            </div>
            {dialogType === "GIDER" && expenseMode === "FIXED" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Şube</label>
                  <BranchPicker
                    className="h-10 w-full justify-between px-3 text-sm font-normal"
                    branches={branches}
                    selectedBranchId={dialogBranchId ?? fixedExpenseBranchId}
                    onSelect={(branchId) => {
                      setDialogBranchId(branchId);
                      selectFixedExpenseBranch(branchId);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Periyot</label>
                  <SearchableSelect
                    value={expensePeriod}
                    onValueChange={(value) => setExpensePeriod(value as FixedExpensePeriod)}
                    options={[
                      { value: "DAILY", label: "Günlük" },
                      { value: "WEEKLY", label: "Haftalık" },
                      { value: "MONTHLY", label: "Aylık" },
                      { value: "YEARLY", label: "Yıllık" },
                    ]}
                    placeholder="Periyot seçin"
                    searchPlaceholder="Periyot ara..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">İşlem tarihi</label>
                <DateTimePicker value={occurredAt} onChange={setOccurredAt} />
              </div>
            )}
            {!(dialogType === "GIDER" && expenseMode === "FIXED") ? (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Not (opsiyonel)</label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            ) : null}
            {dialogType === "GELIR" && canUseDigitalMenu && menuQrs.length > 0 ? (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Menü (opsiyonel)</label>
                <DigitalMenuPicker
                  compact
                  menuQrs={menuQrs}
                  selectedQrId={
                    formMenuId != null
                      ? menuQrs.find((item) => item.menuId === formMenuId)?.id ?? null
                      : null
                  }
                  onSelectQrId={(qrId) => {
                    const menuQr = menuQrs.find((item) => item.id === qrId);
                    setFormMenuId(menuQr?.menuId ?? null);
                  }}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgeç
            </Button>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountingEntryDetailDialog
        item={detailItem}
        deleting={deleteMutation.isPending}
        onDelete={
          detailItem?.sourceType === "MANUAL" ? () => setDeleteTarget(detailItem) : undefined
        }
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kayıt silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.title}</span> kaydı silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountingRow({
  item,
  onOpen,
  onDelete,
}: {
  item: AccountingEntryApiItem;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const tone = ENTRY_TYPE_TONE[item.entryType] ?? "blue";
  const Icon = ENTRY_ICON[item.entryType] ?? Receipt;
  const amount = `${signedAmountPrefix(item.entryType)}${formatAmount(item.amount, item.currency)}`;

  return (
    <li className={cn(LIST_ROW, ROW_COLUMNS)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ToneIcon tone={tone} icon={Icon} size="lg" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className={cn("block max-w-full truncate text-left text-sm font-medium text-foreground", LIST_ROW_LINK)}>
            {item.title}
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {item.note || sourceTypeLabel(item.sourceType)}
            {item.menuName ? <span className="xl:hidden"> · {item.menuName}</span> : null}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground lg:hidden">
            <ToneBadge tone={tone}>{entryTypeLabel(item.entryType)}</ToneBadge>
            <span className="truncate">{formatDateTime(item.occurredAt)}</span>
          </div>
        </div>
        <p className={cn("shrink-0 text-sm font-semibold tabular-nums lg:hidden", AMOUNT_TEXT[item.entryType])}>{amount}</p>
      </div>

      <div className="hidden lg:block">
        <ToneBadge tone={tone}>{entryTypeLabel(item.entryType)}</ToneBadge>
      </div>
      <p className="hidden truncate text-sm text-muted-foreground lg:block">{formatDateTime(item.occurredAt)}</p>
      <p className="hidden truncate text-sm text-muted-foreground xl:block" title={item.menuName ?? undefined}>
        {item.menuName ?? "—"}
      </p>
      <p className={cn("hidden text-right text-sm font-semibold tabular-nums lg:block", AMOUNT_TEXT[item.entryType])}>{amount}</p>

      <div className="relative z-10 flex justify-end">
        {onDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-8", TONE_ACTION.delete)}
            onClick={onDelete}
            aria-label={`${item.title} kaydını sil`}
            title="Sil"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function DetailField({ label, value, tone }: { label: string; value: string; tone?: Tone | "muted" }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {tone ? (
        <ToneBadge tone={tone} className="mt-1">
          {value}
        </ToneBadge>
      ) : (
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      )}
    </div>
  );
}

function AccountingEntryDetailDialog({
  item,
  onOpenChange,
  onDelete,
  deleting,
}: {
  item: AccountingEntryApiItem | null;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  deleting: boolean;
}) {
  const loadLines = item ? canLoadEntryLines(item) : false;
  const detailQuery = useQuery({
    queryKey: ["accounting-entry-detail", item?.id],
    queryFn: () => getAccountingEntryDetailRequest(item!.id),
    enabled: item != null && loadLines,
  });
  const lines = detailQuery.data?.items ?? [];
  const currency = detailQuery.data?.currency ?? item?.currency ?? "TRY";

  return (
    <Dialog open={item != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border sm:max-w-lg">
        {item ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <DialogTitle>{item.title}</DialogTitle>
                <ToneBadge tone={ENTRY_TYPE_TONE[item.entryType] ?? "blue"}>{entryTypeLabel(item.entryType)}</ToneBadge>
              </div>
              <DialogDescription>
                {formatAmount(item.amount, item.currency)} · {formatDateTime(item.occurredAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 sm:grid-cols-2">
              <DetailField label="Kaynak" value={sourceTypeLabel(item.sourceType)} tone={ENTRY_SOURCE_TONE[item.sourceType as keyof typeof ENTRY_SOURCE_TONE]} />
              <DetailField label="Menü" value={item.menuName ?? "—"} />
              {item.sourceOrderId != null ? (
                <DetailField label="Sipariş" value={`#${item.sourceOrderId}`} />
              ) : null}
              {item.sourceBillId != null ? (
                <DetailField label="Adisyon" value={`#${item.sourceBillId}`} />
              ) : null}
              {item.note ? <DetailField label="Not" value={item.note} /> : null}
            </div>

            {loadLines ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Kalemler
                </p>
                {detailQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detay yükleniyor…
                  </div>
                ) : detailQuery.isError ? (
                  <p className="text-sm text-destructive">Detay yüklenemedi.</p>
                ) : lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu kayıt için sipariş/adisyon kalemi yok.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <div className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Ürün</span>
                      <span>Tutar</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {lines.map((line) => (
                        <li key={line.id} className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{line.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {line.quantity} × {formatAmount(line.unitPrice, currency)}
                              {line.sourceOrderId != null &&
                              detailQuery.data?.sourceOrderId == null
                                ? ` · Sipariş #${line.sourceOrderId}`
                                : ""}
                            </p>
                            {line.note ? (
                              <p className="text-xs text-muted-foreground">{line.note}</p>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {formatAmount(line.lineTotal, currency)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter>
              {onDelete ? (
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={onDelete}
                >
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sil
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Kapat
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}