"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  ExternalLink,
  LayoutGrid,
  Link2,
  Loader2,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { copyTextToClipboard } from "@/components/dashboard/qr/qr-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { invalidateBranches, useBranches } from "@/hooks/use-branches";
import { useListQueryState } from "@/hooks/use-list-query-state";
import {
  ApiError,
  assignMenuBranchRequest,
  getMyMenusRequest,
  updateMenuRequest,
  type ActiveMenuSummaryApiItem,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { ACCOUNT_CARD } from "@/lib/dashboard-surface";
import { resolvePublicMenuHref } from "@/lib/public-menu-href";
import {
  DEFAULT_MENU_DIRECTORY_FILTERS,
  filterMenuDirectory,
  sortMenuDirectoryByMenuName,
  withUnassignedMenus,
  type DigitalMenuDirectoryItem,
  type MenuDirectoryStatusFilter,
} from "@/lib/digital-menu-directory";
import { cn } from "@/lib/utils";

const MY_MENUS_KEY = ["myMenus"] as const;
const NO_BRANCH = "none";
const ALL_BRANCHES = "all";

/** Labeled action buttons in a menu card's footer: icon over label on phones, inline from sm. */
const CARD_ACTION =
  "relative z-10 inline-flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-foreground/75 transition-colors hover:bg-[#FFF0F3] hover:text-[#F03245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-[#FFF0F3] data-[state=open]:text-[#F03245] sm:h-9 sm:min-h-0 sm:flex-none sm:flex-row sm:gap-1.5 sm:px-3 sm:text-xs dark:hover:bg-[#F03245]/15 dark:hover:text-[#FB7185]";

const STATUS_OPTIONS: Array<{ value: MenuDirectoryStatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Yayında" },
  { value: "inactive", label: "Pasif" },
];

type MenuLink = { key: string; label: string; icon: ComponentType<{ className?: string }>; href: (qrId: number) => string };

/** The everyday pages, shown as labeled buttons on every card. */
const MAIN_LINKS: MenuLink[] = [
  { key: "products", label: "Ürünler", icon: Package, href: (id) => DASHBOARD_ROUTES.digitalMenuProductsForQr(id) },
  { key: "settings", label: "Ayarlar", icon: Settings2, href: (id) => DASHBOARD_ROUTES.digitalMenuSettings(id) },
];

/** Less frequent pages, behind "Diğer". */
const MORE_LINKS: MenuLink[] = [
  { key: "analytics", label: "Raporlar", icon: BarChart3, href: (id) => DASHBOARD_ROUTES.digitalMenuAnalytics(id) },
  { key: "feedback", label: "Geri bildirimler", icon: MessageSquareText, href: (id) => DASHBOARD_ROUTES.feedbackForQr(id) },
  { key: "layout", label: "Masa planı", icon: LayoutGrid, href: (id) => DASHBOARD_ROUTES.restaurantLayoutForQr(id) },
];

function displayHost(href: string): string {
  return href.replace(/^https?:\/\//, "");
}

/** Optimistically patches one menu in the cached "my menus" list; returns the previous list for rollback. */
function patchCachedMenu(
  queryClient: ReturnType<typeof useQueryClient>,
  menuId: number,
  patch: Partial<ActiveMenuSummaryApiItem>,
) {
  const previous = queryClient.getQueryData<ActiveMenuSummaryApiItem[]>(MY_MENUS_KEY);
  queryClient.setQueryData<ActiveMenuSummaryApiItem[]>(MY_MENUS_KEY, (menus) =>
    menus?.map((menu) => (menu.menuId === menuId ? { ...menu, ...patch } : menu)),
  );
  return previous;
}

type BranchOption = { id: number; name: string };

function MenuRow({ menu, branches }: { menu: DigitalMenuDirectoryItem; branches: BranchOption[] }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [copied, setCopied] = useState(false);
  const publicMenuHref = resolvePublicMenuHref({ publicId: menu.publicId });
  const editHref = DASHBOARD_ROUTES.digitalMenuEdit(menu.qrId);
  const initial = menu.businessName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "M";

  const failed = (error: unknown, fallback: string, previous?: ActiveMenuSummaryApiItem[]) => {
    if (previous) queryClient.setQueryData(MY_MENUS_KEY, previous);
    notify("danger", error instanceof ApiError ? error.message : fallback);
  };

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => updateMenuRequest(menu.menuId, { active }),
    onMutate: (active) => ({ previous: patchCachedMenu(queryClient, menu.menuId, { active }) }),
    onError: (error, _active, context) => failed(error, "Yayın durumu değiştirilemedi.", context?.previous),
    onSuccess: (_data, active) =>
      notify("info", `"${menu.businessName}" ${active ? "yayına alındı" : "yayından kaldırıldı"}.`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: MY_MENUS_KEY }),
  });

  const branchMutation = useMutation({
    mutationFn: (branchId: number | null) => assignMenuBranchRequest(menu.menuId, branchId),
    onMutate: (branchId) => ({ previous: patchCachedMenu(queryClient, menu.menuId, { branchId }) }),
    onError: (error, _branchId, context) => failed(error, "Şube ataması yapılamadı.", context?.previous),
    onSuccess: (_data, branchId) =>
      notify(
        "info",
        branchId == null
          ? `"${menu.businessName}" şubeden ayrıldı.`
          : `"${menu.businessName}" ${branches.find((branch) => branch.id === branchId)?.name ?? "şubeye"} şubesine atandı.`,
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: MY_MENUS_KEY });
      await invalidateBranches(queryClient);
    },
  });

  const copyLink = async () => {
    if (!publicMenuHref) return;
    const ok = await copyTextToClipboard(publicMenuHref).catch(() => false);
    if (!ok) {
      notify("warning", "Link kopyalanamadı.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const branchLabel =
    menu.branchId != null ? branches.find((branch) => branch.id === menu.branchId)?.name ?? menu.branchName : "Şubesiz";

  return (
    <article
      className={cn(
        ACCOUNT_CARD,
        "group relative overflow-hidden transition-shadow hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]",
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-semibold transition-colors sm:size-12",
            menu.active
              ? "bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]"
              : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {initial}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Stretched link: the card body opens the menu page. */}
          <Link
            href={editHref}
            className="block text-[15px] font-semibold leading-snug text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none sm:text-base"
          >
            <span className="line-clamp-2 break-words">{menu.businessName}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Branch: a quiet chip that opens the branch picker. */}
            <Select
              value={menu.branchId != null ? String(menu.branchId) : NO_BRANCH}
              onValueChange={(value) => branchMutation.mutate(value === NO_BRANCH ? null : Number(value))}
              disabled={branchMutation.isPending}
            >
              <SelectTrigger
                className="relative z-10 h-7 w-auto max-w-[13rem] gap-1 rounded-full border-border bg-card px-2.5 text-xs font-medium shadow-none hover:border-[#F03245]/30 hover:text-[#F03245] [&>svg:last-child]:size-3.5"
                aria-label={`${menu.businessName} şubesi: ${branchLabel}`}
              >
                <MapPin className="size-3.5 shrink-0" />
                <span className={cn("min-w-0 truncate", menu.branchId == null && "text-muted-foreground")}>
                  {branchLabel}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BRANCH}>Şubesiz</SelectItem>
                {branches.length > 0 ? <SelectSeparator /> : null}
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Public link with a one-tap copy. */}
            {publicMenuHref ? (
              <button
                type="button"
                onClick={copyLink}
                className="relative z-10 inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-[#F03245]/30 hover:text-[#F03245]"
                aria-label="Menü linkini kopyala"
              >
                {copied ? <Check className="size-3.5 shrink-0 text-[#F03245]" /> : <Link2 className="size-3.5 shrink-0" />}
                <span className="truncate">{copied ? "Link kopyalandı" : displayHost(publicMenuHref)}</span>
              </button>
            ) : (
              <span className="inline-flex h-7 items-center rounded-full bg-muted/60 px-2.5 text-xs text-muted-foreground">
                Yayın linki yok
              </span>
            )}
          </div>
        </div>

        {/* Publish toggle with a visible state label. */}
        <label className="relative z-10 flex shrink-0 cursor-pointer flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span
            className={cn(
              "order-last text-[11px] font-medium sm:order-first sm:text-xs",
              menu.active ? "text-[#F03245] dark:text-[#FB7185]" : "text-muted-foreground",
            )}
          >
            {menu.active ? "Yayında" : "Pasif"}
          </span>
          <Switch
            checked={menu.active}
            onCheckedChange={(checked) => statusMutation.mutate(checked)}
            disabled={statusMutation.isPending}
            className="data-[state=checked]:bg-[#F03245]"
            aria-label={`${menu.businessName} yayında`}
          />
        </label>
      </div>

      <div className="flex items-stretch gap-1 border-t border-[#ececea] bg-muted/20 p-1.5 dark:border-border sm:items-center sm:px-3">
        {MAIN_LINKS.map((link) => {
          const LinkIcon = link.icon;
          return (
            <Link key={link.key} href={link.href(menu.qrId)} className={CARD_ACTION}>
              <LinkIcon className="size-[18px] sm:size-4" />
              {link.label}
            </Link>
          );
        })}
        {publicMenuHref ? (
          <a href={publicMenuHref} target="_blank" rel="noopener noreferrer" className={CARD_ACTION}>
            <ExternalLink className="size-[18px] sm:size-4" />
            <span>
              <span className="sm:hidden">Aç</span>
              <span className="hidden sm:inline">Menüyü aç</span>
            </span>
          </a>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(CARD_ACTION, "sm:ml-auto")} aria-label={`${menu.businessName} için diğer sayfalar`}>
              <MoreHorizontal className="size-[18px] sm:size-4" />
              Diğer
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">
              {menu.businessName}
            </DropdownMenuLabel>
            {MORE_LINKS.map((link) => {
              const LinkIcon = link.icon;
              return (
                <DropdownMenuItem key={link.key} asChild>
                  <Link href={link.href(menu.qrId)} className="gap-2">
                    <LinkIcon className="size-4 text-muted-foreground" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

export function resolveCreateMenuHref(): string {
  return DASHBOARD_ROUTES.digitalMenuCreate;
}

type DigitalMenuFlatListProps = {
  toolbarEnd?: ReactNode;
  listHeading?: ReactNode;
};

export function DigitalMenuFlatList({ toolbarEnd, listHeading }: DigitalMenuFlatListProps) {
  const router = useRouter();
  const { searchParams, setQuery: setListQuery } = useListQueryState();
  const branchesQuery = useBranches(true);
  const menusQuery = useQuery({ queryKey: MY_MENUS_KEY, queryFn: getMyMenusRequest });
  const branches = useMemo(() => branchesQuery.data?.content ?? [], [branchesQuery.data]);
  const allMenus = useMemo(() => {
    const myMenus = menusQuery.data ?? [];
    // "/menu/my" is the source of truth for status and branch (and is what inline edits patch);
    // the branch payload only fills in menus it doesn't list.
    const ownById = new Map(myMenus.map((menu) => [menu.menuId, menu]));
    const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));
    const merged = withUnassignedMenus(branches, myMenus).map((menu) => {
      const own = ownById.get(menu.menuId);
      if (!own) return menu;
      const ownBranchId = own.branchId ?? null;
      return {
        ...menu,
        active: own.active,
        branchId: ownBranchId,
        branchName: ownBranchId != null ? branchNameById.get(ownBranchId) ?? "Şube" : "Şube atanmadı",
      };
    });
    return sortMenuDirectoryByMenuName(merged);
  }, [menusQuery.data, branches]);
  const branchOptions = useMemo(
    () =>
      [...branches]
        .map((branch) => ({ id: branch.id, name: branch.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "tr-TR")),
    [branches],
  );

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<MenuDirectoryStatusFilter>(
    () => (searchParams.get("status") as MenuDirectoryStatusFilter) || DEFAULT_MENU_DIRECTORY_FILTERS.status,
  );
  const [branchId, setBranchId] = useState<number | "all">(() => {
    const raw = searchParams.get("branch");
    const parsed = raw != null ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : "all";
  });

  const statusCounts = useMemo(() => {
    const active = allMenus.filter((menu) => menu.active).length;
    return { all: allMenus.length, active, inactive: allMenus.length - active };
  }, [allMenus]);

  const filteredMenus = useMemo(
    () => filterMenuDirectory(allMenus, { query, status, branchId }),
    [allMenus, branchId, query, status],
  );

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setBranchId("all");
    setListQuery({ q: null, status: null, branch: null });
  };

  const createHref = resolveCreateMenuHref();
  const loading = branchesQuery.isLoading || menusQuery.isLoading;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Menüler yükleniyor…
      </div>
    );
  }

  if (allMenus.length === 0) {
    return (
      <EmptyState
        title="Henüz menü yok"
        description="İlk dijital menünüzü oluşturarak başlayın. Şubeye daha sonra atayabilirsiniz."
        action={
          <Button onClick={() => router.push(createHref)}>
            <Plus className="mr-2 h-4 w-4" />
            Menü oluştur
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setListQuery({ q: next.trim() || null });
            }}
            placeholder="Menü ara"
            className="h-10 pl-9"
            aria-label="Menü ara"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="group" aria-label="Yayın durumu" className="grid grid-cols-3 rounded-xl bg-muted p-1 sm:flex">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatus(option.value);
                  setListQuery({ status: option.value === "all" ? null : option.value });
                }}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                  status === option.value
                    ? "bg-card text-[#F03245] shadow-sm dark:text-[#FB7185]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={status === option.value}
              >
                {option.label}
                <span className="tabular-nums text-[10px] font-semibold opacity-60">{statusCounts[option.value]}</span>
              </button>
            ))}
          </div>
          {branchOptions.length > 0 ? (
            <Select
              value={branchId === "all" ? ALL_BRANCHES : String(branchId)}
              onValueChange={(value) => {
                const next = value === ALL_BRANCHES ? "all" : Number(value);
                setBranchId(next);
                setListQuery({ branch: next === "all" ? null : String(next) });
              }}
            >
              <SelectTrigger className="h-10 w-full gap-1.5 rounded-xl text-xs sm:w-44" aria-label="Şubeye göre filtrele">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-left">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_BRANCHES}>Tüm şubeler</SelectItem>
                <SelectSeparator />
                {branchOptions.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {toolbarEnd}
        </div>
      </div>

      {listHeading}

      {filteredMenus.length === 0 ? (
        <EmptyState
          title="Sonuç yok"
          description="Arama veya filtreyi değiştirip tekrar deneyin."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Temizle
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredMenus.map((menu) => (
            <MenuRow key={menu.menuId} menu={menu} branches={branchOptions} />
          ))}
        </div>
      )}
    </div>
  );
}
