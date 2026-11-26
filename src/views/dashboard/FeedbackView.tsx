"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  MessageSquareText,
  Monitor,
  Search,
  Smartphone,
  Star,
  UtensilsCrossed,
} from "lucide-react";

import {
  DigitalMenuPicker,
  useDigitalMenuAccess,
  useDigitalMenuSelection,
} from "@/components/dashboard/menu/DigitalMenuPicker";
import {
  EXPLORER_QUIET_BUTTON,
  EXPLORER_ROW_SELECTED,
  ExplorerFrame,
  ExplorerListLoading,
} from "@/components/dashboard/menu/ExplorerLayout";
import { AccessLoadError } from "@/components/dashboard/AccessLoadError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMenuProducts } from "@/hooks/use-menu-products";
import {
  getMenuFeedbackRequest,
  getMenuFeedbackSummaryRequest,
  type FeedbackItemApi,
  type MenuProductApiItem,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
/** Product reviews are fetched in full for the product view (the API filters by type, not by product). */
const PRODUCT_FETCH_SIZE = 100;
const PRODUCT_FETCH_MAX_PAGES = 10;

type Selection = { kind: "all" } | { kind: "menu" } | { kind: "product"; productId: number };
type Histogram = { score: number; count: number }[];

const SCORE_FILTERS: { value: number | null; label: string }[] = [
  { value: null, label: "Hepsi" },
  { value: 5, label: "5" },
  { value: 4, label: "4+" },
  { value: 3, label: "3+" },
  { value: 2, label: "2+" },
];

function parseSelection(raw: string | null): Selection | null {
  if (raw === "tum") return { kind: "all" };
  if (raw === "menu") return { kind: "menu" };
  const match = raw?.match(/^urun-(\d+)$/);
  return match ? { kind: "product", productId: Number(match[1]) } : null;
}

function serializeSelection(selection: Selection | null): string | null {
  if (!selection) return null;
  return selection.kind === "all" ? "tum" : selection.kind === "menu" ? "menu" : `urun-${selection.productId}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toNumber(value?: number | string | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAvg(value: number): string {
  return value > 0 ? value.toFixed(1) : "–";
}

/** Score → count, always five rows from 5 down to 1. */
function histogramOf(rows: Histogram): Histogram {
  const counts = new Map<number, number>();
  for (const row of rows) counts.set(row.score, (counts.get(row.score) ?? 0) + row.count);
  return [5, 4, 3, 2, 1].map((score) => ({ score, count: counts.get(score) ?? 0 }));
}

function Stars({ score, className }: { score: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${score.toFixed(1)} yıldız`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "size-3.5",
            value <= Math.round(score) ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/35",
            className,
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ScorePill({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
      <Star className={cn("size-3", count > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden />
      {formatAvg(avg)}
      <span className="text-muted-foreground/70">· {count}</span>
    </span>
  );
}

function ProductImage({ imageUrl, className, iconClassName }: { imageUrl?: string | null; className: string; iconClassName: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-muted", className)}>
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary hosts
        <img src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <ImageIcon className={cn("text-muted-foreground/60", iconClassName)} aria-hidden />
      )}
    </span>
  );
}

/**
 * Yorumlar as a two-pane explorer like Ürünler: the menu picker and what was rated on the left (all reviews,
 * the menu itself, each rated product with its average), and on the right the score breakdown and the reviews.
 */
export default function FeedbackView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qrFromQuery = Number(searchParams.get("qr"));
  const initialQrId = Number.isFinite(qrFromQuery) && qrFromQuery > 0 ? qrFromQuery : null;

  const { accessLoading, accessError, retryAccess, canUseDigitalMenu } = useDigitalMenuAccess();
  const { menuQrs, selection: menuSelection, loading, error, selectQrId } = useDigitalMenuSelection(
    initialQrId,
    canUseDigitalMenu && !accessLoading,
  );
  const menuId = menuSelection?.menu.menuId ?? null;

  // The address holds what is open (?secim=tum|menu|urun-12), so the back button returns to the list.
  const selection = parseSelection(searchParams.get("secim"));
  const shown: Selection = selection ?? { kind: "all" };
  const [minScore, setMinScore] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const writeAddress = (next: Selection | null, mode: "push" | "replace", qrId = menuSelection?.qr.id ?? null) => {
    const params = new URLSearchParams(searchParams.toString());
    const value = serializeSelection(next);
    if (value) params.set("secim", value);
    else params.delete("secim");
    if (qrId != null) params.set("qr", String(qrId));
    params.delete("type");
    params.delete("minScore");
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (url === `${pathname}${window.location.search}`) return;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };
  const open = (next: Selection) => {
    setMinScore(null);
    setPage(0);
    // Switching between items replaces, so "back" always leads to the list rather than through every pick.
    writeAddress(next, selection ? "replace" : "push");
  };
  const [openedHere, setOpenedHere] = useState(false);
  const backToList = () => {
    if (openedHere) window.history.back();
    else writeAddress(null, "replace");
  };

  const summaryQuery = useQuery({
    queryKey: ["menu-feedback-summary", menuId],
    enabled: menuId != null,
    queryFn: () => getMenuFeedbackSummaryRequest(menuId!),
  });
  const productsQuery = useMenuProducts(menuId);

  const pagedType = shown.kind === "menu" ? "menu" : "all";
  const listQuery = useQuery({
    queryKey: ["menu-feedback", menuId, pagedType, minScore, page],
    enabled: menuId != null && shown.kind !== "product",
    queryFn: () =>
      getMenuFeedbackRequest(menuId!, { type: pagedType, minScore: minScore ?? undefined, page, size: PAGE_SIZE }),
  });

  // Every product review of the menu, fetched once for the product view (its score breakdown and paging).
  const productReviewsQuery = useQuery({
    queryKey: ["menu-feedback-all-products", menuId],
    enabled: menuId != null && shown.kind === "product",
    staleTime: 60_000,
    queryFn: async () => {
      const all: FeedbackItemApi[] = [];
      for (let index = 0; index < PRODUCT_FETCH_MAX_PAGES; index += 1) {
        const result = await getMenuFeedbackRequest(menuId!, { type: "product", page: index, size: PRODUCT_FETCH_SIZE });
        all.push(...result.content);
        if (!result.hasNext) break;
      }
      return all;
    },
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const productById = useMemo(() => new Map(products.map((product) => [product.productId, product])), [products]);
  const ratedProducts = useMemo(
    () =>
      products
        .filter((product) => toNumber(product.ratingCount) > 0)
        .sort((a, b) => toNumber(b.ratingCount) - toNumber(a.ratingCount) || a.name.localeCompare(b.name, "tr-TR")),
    [products],
  );
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return term ? ratedProducts.filter((product) => product.name.toLocaleLowerCase("tr-TR").includes(term)) : ratedProducts;
  }, [ratedProducts, search]);

  if (accessError) return <AccessLoadError onRetry={() => void retryAccess()} />;

  if (!accessLoading && !canUseDigitalMenu) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <Button variant="outline" asChild>
          <Link href={DASHBOARD_ROUTES.digitalMenu}>Dijital Menüye Dön</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Yorumları görmek için dijital menü erişimi gerekir.</p>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const menuAvg = toNumber(summary?.menu.ratingAvg);
  const menuCount = summary?.menu.ratingCount ?? 0;
  const productAvg = toNumber(summary?.products.ratingAvg);
  const productCount = summary?.products.ratingCount ?? 0;
  const totalCount = menuCount + productCount;
  const totalAvg = totalCount > 0 ? (menuAvg * menuCount + productAvg * productCount) / totalCount : 0;

  /* ───────────────────────── Sidebar ───────────────────────── */

  const pick = (next: Selection) => {
    if (!selection) setOpenedHere(true);
    open(next);
  };
  const isShown = (next: Selection) =>
    serializeSelection(next) === serializeSelection(shown);
  const row = (props: { target: Selection; icon: React.ReactNode; label: string; avg: number; count: number }) => {
    const selected = isShown(props.target);
    return (
      <li key={serializeSelection(props.target)}>
        <button
          type="button"
          onClick={() => pick(props.target)}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            // On desktop "Tüm yorumlar" is open before anything is picked; on phones nothing is marked yet.
            selected
              ? selection
                ? EXPLORER_ROW_SELECTED
                : "text-foreground hover:bg-muted lg:bg-[#FFF0F3] lg:text-[#F03245] lg:dark:bg-[#F03245]/15 lg:dark:text-[#FB7185]"
              : "text-foreground hover:bg-muted",
          )}
        >
          {props.icon}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{props.label}</span>
          <ScorePill avg={props.avg} count={props.count} />
        </button>
      </li>
    );
  };
  const iconBox = (icon: React.ReactNode) => (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
  );

  const sidebar =
    accessLoading || loading ? (
      <ExplorerListLoading label="Menüler yükleniyor…" />
    ) : menuQrs.length === 0 ? (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz menünüz yok.</p>
    ) : (
      <nav className="min-h-0 flex-1 overflow-y-auto border-t border-border px-2 pb-3 [scrollbar-width:thin]">
        <p className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">Genel</p>
        <ul className="space-y-0.5">
          {row({
            target: { kind: "all" },
            icon: iconBox(<MessageSquareText className="size-3.5" aria-hidden />),
            label: "Tüm yorumlar",
            avg: totalAvg,
            count: totalCount,
          })}
          {row({
            target: { kind: "menu" },
            icon: iconBox(<UtensilsCrossed className="size-3.5" aria-hidden />),
            label: "Menü puanı",
            avg: menuAvg,
            count: menuCount,
          })}
        </ul>

        <p className="px-2 pb-1 pt-4 text-xs font-medium text-muted-foreground">
          Puanlanan ürünler{productsQuery.data ? ` · ${ratedProducts.length}` : ""}
        </p>
        {ratedProducts.length > 6 ? (
          <div className="relative pb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-[1.125rem] size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün ara"
              aria-label="Ürün ara"
              className="h-9 rounded-xl pl-8 text-sm"
            />
          </div>
        ) : null}
        {productsQuery.isPending && menuId != null ? (
          <ExplorerListLoading label="Ürünler yükleniyor…" />
        ) : ratedProducts.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">Henüz puan alan ürün yok.</p>
        ) : visibleProducts.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">Aramaya uyan ürün yok.</p>
        ) : (
          <ul className="space-y-0.5">
            {visibleProducts.map((product) =>
              row({
                target: { kind: "product", productId: product.productId },
                icon: (
                  <ProductImage
                    key={product.imageUrl ?? "none"}
                    imageUrl={product.imageUrl}
                    className="size-7 rounded-lg"
                    iconClassName="size-3.5"
                  />
                ),
                label: product.name,
                avg: toNumber(product.ratingAvg),
                count: toNumber(product.ratingCount),
              }),
            )}
          </ul>
        )}
      </nav>
    );

  /* ───────────────────────── Detail ───────────────────────── */

  const product: MenuProductApiItem | undefined =
    shown.kind === "product" ? productById.get(shown.productId) : undefined;
  const bigIcon = (icon: React.ReactNode) => (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15">
      {icon}
    </span>
  );

  // What the right pane shows for the open item: its reviews and the numbers above them.
  let reviews: FeedbackItemApi[];
  let totalPages: number;
  let pending: boolean;
  let failed: boolean;
  let head: { title: string; subtitle: string; icon: React.ReactNode; avg: number; count: number; histogram: Histogram };
  if (shown.kind === "product") {
    const all = (productReviewsQuery.data ?? []).filter((item) => item.productId === shown.productId);
    const filtered = minScore != null ? all.filter((item) => item.score >= minScore) : all;
    totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    reviews = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    pending = productReviewsQuery.isPending;
    failed = productReviewsQuery.isError;
    head = {
      title: product?.name ?? "Ürün",
      subtitle: [product?.mainCategoryName, product?.subCategoryName].filter(Boolean).join(" › ") || "Ürün yorumları",
      icon: (
        <ProductImage
          key={product?.imageUrl ?? "none"}
          imageUrl={product?.imageUrl}
          className="size-11 rounded-xl"
          iconClassName="size-4"
        />
      ),
      avg: all.length > 0 ? all.reduce((sum, item) => sum + item.score, 0) / all.length : toNumber(product?.ratingAvg),
      count: all.length || toNumber(product?.ratingCount),
      histogram: histogramOf(all.map((item) => ({ score: item.score, count: 1 }))),
    };
  } else {
    reviews = listQuery.data?.content ?? [];
    totalPages = listQuery.data?.totalPages ?? 0;
    pending = listQuery.isPending;
    failed = listQuery.isError;
    head =
      shown.kind === "menu"
        ? {
            title: "Menü puanı",
            subtitle: "Müşterilerin menünün geneline verdiği puanlar",
            icon: bigIcon(<UtensilsCrossed className="size-5" aria-hidden />),
            avg: menuAvg,
            count: menuCount,
            histogram: histogramOf(summary?.menu.scoreHistogram ?? []),
          }
        : {
            title: "Tüm yorumlar",
            subtitle: `Menüye ${menuCount}, ürünlere ${productCount} puan`,
            icon: bigIcon(<MessageSquareText className="size-5" aria-hidden />),
            avg: totalAvg,
            count: totalCount,
            histogram: histogramOf([...(summary?.menu.scoreHistogram ?? []), ...(summary?.products.scoreHistogram ?? [])]),
          };
  }
  const maxBar = Math.max(1, ...head.histogram.map((bar) => bar.count));

  const detail =
    menuId == null ? (
      <div className="hidden px-6 py-20 text-center text-sm text-muted-foreground lg:block">
        {error ?? (loading || accessLoading ? "Yükleniyor…" : "Yorumları görmek için bir menü seçin.")}
      </div>
    ) : (
      <>
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-3 sm:p-4">
          <button
            type="button"
            onClick={backToList}
            className={cn(EXPLORER_QUIET_BUTTON, "w-9 px-0 lg:hidden")}
            aria-label="Listeye dön"
          >
            <ArrowLeft className="size-4" />
          </button>
          {head.icon}
          <div className="min-w-[11rem] flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{head.title}</h2>
              {shown.kind === "product" ? (
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Ürün
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{head.subtitle}</p>
          </div>
          {product ? (
            <Link
              href={DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(product.productId, menuId)}
              className={cn(EXPLORER_QUIET_BUTTON, "ml-auto")}
            >
              Ürüne git
            </Link>
          ) : null}
        </header>

        {/* The average and how the scores split. */}
        <div className="grid gap-4 border-b border-border p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:p-5">
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1">
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">{formatAvg(head.avg)}</p>
            <div className="space-y-0.5">
              <Stars score={head.avg} className="size-4" />
              <p className="text-xs text-muted-foreground">{head.count} puan</p>
            </div>
          </div>
          <ul className="space-y-1.5" aria-label="Puan dağılımı">
            {head.histogram.map((bar) => (
              <li key={bar.score} className="flex items-center gap-2 text-xs">
                <span className="flex w-7 shrink-0 items-center gap-0.5 tabular-nums text-muted-foreground">
                  {bar.score}
                  <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-amber-400 transition-[width] duration-300"
                    style={{ width: `${(bar.count / maxBar) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{bar.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5 sm:px-5">
          <span className="mr-1 text-xs text-muted-foreground">Puan</span>
          {SCORE_FILTERS.map((filter) => {
            const active = filter.value === minScore;
            return (
              <button
                key={filter.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setMinScore(filter.value);
                  setPage(0);
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "border-[#F03245]/30 bg-[#FFF0F3] text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {filter.value != null ? <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden /> : null}
                {filter.label}
              </button>
            );
          })}
        </div>

        {pending ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Yorumlar yükleniyor…
          </div>
        ) : failed ? (
          <p className="px-5 py-10 text-sm text-destructive">Yorumlar alınamadı.</p>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <MessageSquareText className="size-5 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {minScore != null ? "Bu puana uyan yorum yok" : "Henüz yorum yok"}
            </p>
            {minScore != null ? (
              <button
                type="button"
                onClick={() => setMinScore(null)}
                className="text-xs font-medium text-[#F03245] hover:underline"
              >
                Filtreyi temizle
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">Müşteriler puan verdiğinde burada görünür.</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((item) => {
              const reviewed = item.productId != null ? productById.get(item.productId) : undefined;
              const mobile = item.deviceType ? /mobile|phone|android|ios/i.test(item.deviceType) : false;
              return (
                <li key={`${item.type}-${item.id}`} className="space-y-1.5 px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Stars score={item.score} />
                    {shown.kind === "all" ? (
                      item.type === "product" ? (
                        <button
                          type="button"
                          onClick={() => item.productId != null && open({ kind: "product", productId: item.productId })}
                          disabled={item.productId == null}
                          className="min-w-0 max-w-full truncate rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground/80 hover:text-[#F03245] disabled:hover:text-foreground/80"
                        >
                          {reviewed?.name ?? item.productName ?? "Ürün"}
                        </button>
                      ) : (
                        <span className="rounded-md bg-[#FFF0F3] px-1.5 py-0.5 text-xs font-medium text-[#F03245] dark:bg-[#F03245]/15 dark:text-[#FB7185]">
                          Menü
                        </span>
                      )
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                  </div>
                  {item.comment ? (
                    <p className="text-sm leading-relaxed text-foreground">{item.comment}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Yorum yazılmamış</p>
                  )}
                  {item.deviceType ? (
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {mobile ? <Smartphone className="size-3" aria-hidden /> : <Monitor className="size-3" aria-hidden />}
                      {item.deviceType}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
            <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Önceki
            </Button>
            <p className="text-xs text-muted-foreground">
              Sayfa {page + 1} / {totalPages}
            </p>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Sonraki
            </Button>
          </div>
        ) : null}
      </>
    );

  return (
    <ExplorerFrame
      header={
        <div className="space-y-2">
          <h1 className="px-1 text-base font-semibold tracking-tight text-foreground">Yorumlar</h1>
          <div className="[&>div]:max-w-none">
            <DigitalMenuPicker
              compact
              menuQrs={menuQrs}
              selectedQrId={menuSelection?.qr.id ?? null}
              onSelectQrId={(qrId) => {
                setMinScore(null);
                setPage(0);
                setSearch("");
                writeAddress(null, "replace", qrId);
                void selectQrId(qrId);
              }}
            />
          </div>
        </div>
      }
      sidebar={sidebar}
      detail={detail}
      hasSelection={selection != null}
      sidebarLabel="Puanlananlar"
      detailLabel="Yorumlar"
    />
  );
}
