"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, ChevronRight, Layers } from "lucide-react";

import { FilterMenu } from "@/components/dashboard/FilterMenu";
import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import { ListCard, ListMessage, ListSkeleton } from "@/components/dashboard/ListLayout";
import { ListToolbar } from "@/components/dashboard/ListToolbar";
import { ToneBadge } from "@/components/dashboard/ToneBadge";
import { ToneIcon } from "@/components/dashboard/tone";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/use-branches";
import { catalogCategoriesQueryKey, menuCategoriesQueryKey } from "@/hooks/use-menu-categories";
import { getMenuCategoriesRequest, getMyMenusRequest, listCatalogCategoriesRequest, type MainCategoryApiItem } from "@/lib/api";
import {
  categoryMenuOptions,
  EMPTY_CATEGORY_FILTERS,
  groupCategoriesByMenu,
  CATEGORY_PREVIEW_COUNT,
  isCategoryListNarrowed,
  matchesCategoryQuery,
  parseCategoryFilters,
  serializeCategoryFilters,
  showsAllCategories,
  visibleCategories,
  type CategoryFilters,
} from "@/lib/category-overview";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

export const LIBRARY_CATEGORIES_HREF = `${DASHBOARD_ROUTES.digitalMenuCategories}?kutuphane=1`;

function menuEditorHref(qrId: number | null): string {
  return qrId != null ? `${DASHBOARD_ROUTES.digitalMenuCategories}?qr=${qrId}` : DASHBOARD_ROUTES.digitalMenuCategories;
}

/** Cover photo, or the category icon when there is none or it fails to load. */
function CategoryThumb({ imageUrl }: { imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center">
        <ToneIcon tone="orange" icon={Layers} size="lg" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- cover images come from arbitrary hosts
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-11 shrink-0 rounded-[10px] bg-muted object-cover"
    />
  );
}

/** Two lines per category: name, then its sub categories. The whole tile opens the editor. */
function CategoryTile({ category, href }: { category: MainCategoryApiItem; href: string }) {
  const subs = category.subs ?? [];
  const subText =
    subs.length === 0
      ? "Alt kategori yok"
      : subs.length <= 2
        ? subs.map((sub) => sub.name).join(", ")
        : `${subs
            .slice(0, 2)
            .map((sub) => sub.name)
            .join(", ")} +${subs.length - 2}`;
  return (
    <li className="min-w-0">
      <Link
        href={href}
        title={subs.length > 2 ? subs.map((sub) => sub.name).join(", ") : undefined}
        className="group flex h-full items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:border-foreground/15 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategoryThumb key={category.imageUrl ?? "none"} imageUrl={category.imageUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{category.name}</span>
          <span className={cn("block truncate text-xs", subs.length === 0 ? "text-muted-foreground/70" : "text-muted-foreground")}>
            {subText}
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/** Tiles flow into one to three columns, so a long menu stays short. */
const TILE_GRID = "grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 lg:p-4";

function GroupHeader({
  title,
  subtitle,
  badge,
  action,
  icon,
  tone,
  closed,
  onToggle,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  action: { label: string; href: string };
  icon: Parameters<typeof ToneIcon>[0]["icon"];
  tone: Parameters<typeof ToneIcon>[0]["tone"];
  /** True while the group's rows are folded away. */
  closed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-3 lg:px-4", !closed && "border-b border-border")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!closed}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ToneIcon tone={tone} icon={icon} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            {badge ? <ToneBadge tone="muted">{badge}</ToneBadge> : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", closed && "-rotate-90")}
          aria-hidden
        />
      </button>
      <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </div>
  );
}

/** "Tümünü göster" under a cut list, "Daha az göster" under an expanded one. */
function ListMore({ hidden, expanded, onToggle }: { hidden: number; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-center gap-1.5 border-t border-border px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {expanded ? "Daha az göster" : `Tümünü göster (${hidden} kategori daha)`}
      <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
    </button>
  );
}

/**
 * Every category of every menu on one page, grouped by menu, plus the categories that belong to no menu.
 * Editing happens in the menu's own editor, one click away from each group.
 */
export function CategoryOverview() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseCategoryFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const update = (patch: Partial<CategoryFilters>) => {
    const current = parseCategoryFilters(new URLSearchParams(window.location.search));
    const query = serializeCategoryFilters({ ...current, ...patch }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const clearAll = () => update(EMPTY_CATEGORY_FILTERS);

  // Per group: expanded past the preview, or folded away completely.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const toggle = (setter: typeof setExpanded, key: string) => setter((current) => ({ ...current, [key]: !current[key] }));

  const menusQuery = useQuery({ queryKey: ["myMenus"], queryFn: getMyMenusRequest });
  const branchesQuery = useBranches();
  const libraryQuery = useQuery({ queryKey: catalogCategoriesQueryKey, queryFn: () => listCatalogCategoriesRequest(), staleTime: 30_000 });
  const menus = useMemo(() => menusQuery.data ?? [], [menusQuery.data]);

  const categoryQueries = useQueries({
    queries: menus.map((menu) => ({
      queryKey: menuCategoriesQueryKey(menu.menuId),
      queryFn: () => getMenuCategoriesRequest(menu.menuId),
      staleTime: 30_000,
      retry: 1,
    })),
  });

  const categoriesByMenu = useMemo(() => {
    const map = new Map<number, MainCategoryApiItem[] | null>();
    menus.forEach((menu, index) => {
      const query = categoryQueries[index];
      if (query?.isError) map.set(menu.menuId, null);
      else if (query?.data) map.set(menu.menuId, query.data);
    });
    return map;
  }, [menus, categoryQueries]);

  const branchNameById = useMemo(
    () => new Map((branchesQuery.data?.content ?? []).map((branch) => [branch.id, branch.name])),
    [branchesQuery.data],
  );

  const groups = useMemo(
    () => groupCategoriesByMenu(menus, categoriesByMenu, branchNameById, filters),
    [menus, categoriesByMenu, branchNameById, filters],
  );
  const library = useMemo(
    () => (libraryQuery.data ?? []).filter((category) => matchesCategoryQuery(category, filters.query)),
    [libraryQuery.data, filters.query],
  );
  const showLibrary = filters.menus.length === 0 && (filters.query.trim() === "" || library.length > 0);

  const loading = menusQuery.isPending || categoryQueries.some((query) => query.isPending);
  const narrowed = isCategoryListNarrowed(filters);
  const nothingFound = !loading && groups.length === 0 && !showLibrary;

  if (menusQuery.isError) {
    return (
      <ListCard label="Kategoriler">
        <ListMessage title="Menüler alınamadı" action={{ label: "Tekrar dene", onClick: () => void menusQuery.refetch() }} />
      </ListCard>
    );
  }

  return (
    <div className="space-y-4">
      <ListCard label="Kategori filtresi" className="[&>div]:border-b-0">
        <ListToolbar
          query={filters.query}
          onQueryChange={(query) => update({ query })}
          searchPlaceholder="Kategori veya alt kategori ara"
          searchLabel="Kategori ara"
          narrowed={narrowed}
          onClear={clearAll}
          filters={
            menus.length > 1 ? (
              <FilterMenu
                label="Menü"
                icon={BookOpen}
                tone="orange"
                multiple
                values={filters.menus}
                options={categoryMenuOptions(menus, categoriesByMenu)}
                onValuesChange={(selected) => update({ menus: selected })}
              />
            ) : null
          }
        />
      </ListCard>

      {loading ? (
        <ListCard label="Yükleniyor">
          <ListSkeleton rows={5} />
        </ListCard>
      ) : menus.length === 0 && (libraryQuery.data ?? []).length === 0 ? (
        <ListCard label="Kategoriler">
          <ListMessage
            icon={Layers}
            title="Henüz menünüz yok"
            description="Kategoriler menülerin içinde oluşturulur. Önce bir menü ekleyin."
            action={{ label: "Menülere git", onClick: () => router.push(DASHBOARD_ROUTES.digitalMenuMenus), variant: "default" }}
          />
        </ListCard>
      ) : nothingFound ? (
        <ListCard label="Sonuç yok">
          <ListMessage title="Bu aramayla kategori bulunamadı" action={{ label: "Filtreleri temizle", onClick: clearAll }} />
        </ListCard>
      ) : (
        <>
          {groups.map((group) => {
            const href = menuEditorHref(group.qrId);
            const key = `menu-${group.menuId}`;
            const counted = isCategoryListNarrowed({ ...filters, menus: [] })
              ? `${group.categories.length} / ${group.total} kategori`
              : `${group.total} kategori`;
            const showAll = showsAllCategories(filters, expanded[key] === true);
            const rows = visibleCategories(group.categories, showAll);
            const hidden = group.categories.length - rows.length;
            const canCollapse = !showsAllCategories(filters, false) && group.categories.length > CATEGORY_PREVIEW_COUNT + 1;
            return (
              <ListCard key={group.menuId} label={`${group.name} kategorileri`}>
                <GroupHeader
                  title={group.name}
                  subtitle={[group.branchName, counted].filter(Boolean).join(" · ")}
                  badge={group.active ? undefined : "Pasif"}
                  action={{ label: group.total === 0 ? "Kategori ekle" : "Menüde düzenle", href }}
                  icon={DASHBOARD_NAV_ICONS.myMenus}
                  tone="orange"
                  closed={closed[key] === true}
                  onToggle={() => toggle(setClosed, key)}
                />
                {closed[key] ? null : group.failed ? (
                  <ListMessage title="Bu menünün kategorileri alınamadı" />
                ) : group.total === 0 ? (
                  <ListMessage
                    title="Bu menüde kategori yok"
                    description="Kategori ekleyip ürünleri bu kategorilere bağlayabilirsiniz."
                    action={{ label: "Kategori ekle", onClick: () => router.push(href) }}
                  />
                ) : (
                  <>
                    <ul className={TILE_GRID}>
                      {rows.map((category) => (
                        <CategoryTile key={category.id} category={category} href={href} />
                      ))}
                    </ul>
                    {hidden > 0 ? (
                      <ListMore hidden={hidden} expanded={false} onToggle={() => toggle(setExpanded, key)} />
                    ) : expanded[key] && canCollapse ? (
                      <ListMore hidden={0} expanded onToggle={() => toggle(setExpanded, key)} />
                    ) : null}
                  </>
                )}
              </ListCard>
            );
          })}

          {showLibrary
            ? (() => {
                const key = "library";
                const showAll = showsAllCategories(filters, expanded[key] === true);
                const rows = visibleCategories(library, showAll);
                const hidden = library.length - rows.length;
                const canCollapse = !showsAllCategories(filters, false) && library.length > CATEGORY_PREVIEW_COUNT + 1;
                return (
                  <ListCard label="Menüsüz kategoriler">
                    <GroupHeader
                      title="Menüsüz kategoriler"
                      subtitle={`Henüz bir menüye bağlı değil · ${(libraryQuery.data ?? []).length} kategori`}
                      action={{ label: library.length === 0 ? "Kategori ekle" : "Yönet", href: LIBRARY_CATEGORIES_HREF }}
                      icon={Layers}
                      tone="violet"
                      closed={closed[key] === true}
                      onToggle={() => toggle(setClosed, key)}
                    />
                    {closed[key] ? null : library.length === 0 ? (
                      <ListMessage
                        title="Menüsüz kategori yok"
                        description="Kategorileri doğrudan menünün içinde de oluşturabilirsiniz."
                        action={{ label: "Menüsüz kategori ekle", onClick: () => router.push(LIBRARY_CATEGORIES_HREF) }}
                      />
                    ) : (
                      <>
                        <ul className={TILE_GRID}>
                          {rows.map((category) => (
                            <CategoryTile key={category.id} category={category} href={LIBRARY_CATEGORIES_HREF} />
                          ))}
                        </ul>
                        {hidden > 0 ? (
                          <ListMore hidden={hidden} expanded={false} onToggle={() => toggle(setExpanded, key)} />
                        ) : expanded[key] && canCollapse ? (
                          <ListMore hidden={0} expanded onToggle={() => toggle(setExpanded, key)} />
                        ) : null}
                      </>
                    )}
                  </ListCard>
                );
              })()
            : null}
        </>
      )}
    </div>
  );
}
