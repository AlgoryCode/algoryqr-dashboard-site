"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { AddButton } from "@/components/dashboard/AddButton";
import {
  EXPLORER_DANGER_ICON_BUTTON,
  EXPLORER_QUIET_BUTTON,
  EXPLORER_ROW_SELECTED,
  ExplorerDetailHeader,
  ExplorerEmpty,
  ExplorerListLoading,
  type ExplorerParts,
} from "@/components/dashboard/menu/ExplorerLayout";
import { ToneBadge } from "@/components/dashboard/ToneBadge";
import { AddProductsAsOptions } from "@/components/dashboard/menu/ProductOptionFields";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, parseMoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import {
  assignCatalogOptionGroupRequest,
  createCatalogOptionGroupRequest,
  deleteCatalogOptionGroupRequest,
  listCatalogOptionGroupsRequest,
  listCatalogProductsRequest,
  updateCatalogOptionGroupRequest,
  type CatalogOptionGroupWriteBody,
  type MenuProductApiItem,
  type MenuProductOptionGroupApiItem,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";
import {
  OPTION_GROUP_KINDS,
  formatOptionGroupHeading,
  normalizeOptionKind,
  normalizeOptionUnit,
  optionKindLabel,
  type MenuProductOptionGroupKind,
} from "@/lib/product-options";
import { TONE_ACTION } from "@/components/dashboard/tone";

type ChoiceDraft = {
  name: string;
  priceDelta: string;
  available: boolean;
};

type GroupDraft = {
  mode: "create" | "edit";
  groupId: number | null;
  kind: MenuProductOptionGroupKind;
  name: string;
  choices: ChoiceDraft[];
};

function kindDefaults(kind: MenuProductOptionGroupKind) {
  return OPTION_GROUP_KINDS.find((item) => item.value === kind) ?? OPTION_GROUP_KINDS[0]!;
}

function emptyChoice(): ChoiceDraft {
  return { name: "", priceDelta: "0", available: true };
}

function emptyDraft(): GroupDraft {
  const defaults = kindDefaults("EXTRA");
  return {
    mode: "create",
    groupId: null,
    kind: defaults.value,
    name: defaults.defaultName,
    choices: [emptyChoice()],
  };
}

function formatPriceDelta(value: number | string | undefined) {
  const amount = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount === 0) return null;
  try {
    const formatted = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount > 0 ? `+${formatted}` : `−${formatted}`;
  } catch {
    return amount > 0 ? `+${amount}` : `${amount}`;
  }
}

function toWriteBody(draft: GroupDraft): CatalogOptionGroupWriteBody {
  const defaults = kindDefaults(draft.kind);
  return {
    name: draft.name.trim() || defaults.defaultName,
    kind: draft.kind,
    unit: normalizeOptionUnit(defaults.unit, draft.kind),
    minSelect: Number(defaults.minSelect),
    maxSelect: Number(defaults.maxSelect),
    options: draft.choices
      .map((choice, index) => ({
        name: choice.name.trim(),
        priceDelta: parseMoneyInput(choice.priceDelta) || 0,
        available: choice.available,
        sortOrder: index,
      }))
      .filter((choice) => choice.name.length > 0),
  };
}

type OptionExplorerProps = {
  groups: MenuProductOptionGroupApiItem[];
  visibleGroups: MenuProductOptionGroupApiItem[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  products: MenuProductApiItem[];
  selectedId: number | null;
  onSelect: (groupId: number | null) => void;
  onCreate: () => void;
  onEdit: (group: MenuProductOptionGroupApiItem) => void;
  onAssign: (group: MenuProductOptionGroupApiItem) => void;
  onDelete: (group: MenuProductOptionGroupApiItem) => void;
  dialogs: React.ReactNode;
};

function ProductThumb({ imageUrl }: { imageUrl?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary hosts
        <img src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-3.5 text-muted-foreground/60" aria-hidden />
      )}
    </span>
  );
}

function optionExplorerParts(props: OptionExplorerProps): ExplorerParts {
  const { groups, visibleGroups, products, selectedId } = props;
  const selected = groups.find((group) => group.groupId === selectedId) ?? null;
  const productById = new Map(products.map((product) => [product.productId, product]));

  const sidebar = (
    <>
      <div className="border-b border-border px-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Opsiyon veya seçenek ara"
            aria-label="Opsiyon ara"
            className="h-10 rounded-xl pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          Opsiyonlar{groups.length > 0 ? ` · ${groups.length}` : ""}
        </p>
        <AddButton className="h-8 px-2 text-xs" onClick={props.onCreate}>
          Opsiyon ekle
        </AddButton>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
        {props.loading ? (
          <ExplorerListLoading label="Opsiyonlar yükleniyor…" />
        ) : props.failed ? (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
            <p className="text-sm text-destructive">Opsiyonlar alınamadı.</p>
            <Button type="button" variant="ghost" size="sm" onClick={props.onRetry}>
              Tekrar dene
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Henüz opsiyon yok.</p>
            <AddButton onClick={props.onCreate}>İlk opsiyonu ekle</AddButton>
          </div>
        ) : visibleGroups.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Bu aramayla opsiyon bulunamadı.</p>
        ) : (
          <ul className="space-y-0.5">
            {visibleGroups.map((group) => {
              const current = group.groupId === selectedId;
              const productCount = group.productIds?.length ?? 0;
              return (
                <li key={group.groupId}>
                  <button
                    type="button"
                    onClick={() => props.onSelect(group.groupId)}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      current ? EXPLORER_ROW_SELECTED : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <SlidersHorizontal className="size-3.5 text-muted-foreground/70" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{formatOptionGroupHeading(group)}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {optionKindLabel(group.kind)} · {group.options.length} seçenek
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                      title={`${productCount} ürüne dahil`}
                    >
                      {productCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </>
  );

  let detail: React.ReactNode;
  if (!selected) {
    detail = (
      <ExplorerEmpty
        icon={<SlidersHorizontal className="size-5" />}
        title="Bir opsiyon seçin"
        text="Soldaki listeden bir opsiyon seçin; seçenekleri ve dahil olduğu ürünler burada görünür."
      />
    );
  } else {
    const heading = formatOptionGroupHeading(selected);
    const assigned = (selected.productIds ?? []).map((productId) => ({
      productId,
      product: productById.get(productId) ?? null,
    }));
    detail = (
      <>
        <ExplorerDetailHeader
          title={heading}
          badge={<ToneBadge tone="muted">{optionKindLabel(selected.kind)}</ToneBadge>}
          subtitle={`${selected.options.length} seçenek · ${assigned.length} ürüne dahil`}
          icon={
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <SlidersHorizontal className="size-4 text-muted-foreground/70" aria-hidden />
            </span>
          }
          onBack={() => props.onSelect(null)}
          backLabel="Opsiyonlara dön"
          actions={
            <>
              <button
                type="button"
                className={cn(EXPLORER_QUIET_BUTTON, "w-9 px-0 sm:w-auto sm:px-2.5")}
                onClick={() => props.onEdit(selected)}
                aria-label="Opsiyonu düzenle"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Düzenle</span>
              </button>
              <button
                type="button"
                className={EXPLORER_DANGER_ICON_BUTTON}
                onClick={() => props.onDelete(selected)}
                aria-label="Opsiyonu sil"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          }
        />

        <div className="border-b border-border">
          <h3 className="px-4 pb-1 pt-3 text-xs font-medium text-muted-foreground">Seçenekler</h3>
          {selected.options.length === 0 ? (
            <p className="px-4 pb-4 pt-1 text-sm text-muted-foreground">Seçenek yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {selected.options.map((option) => (
                <li key={option.optionId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn("min-w-0 flex-1 truncate text-sm", !option.available && "text-muted-foreground line-through")}>
                    {option.name}
                  </span>
                  {!option.available ? <ToneBadge tone="muted">Kapalı</ToneBadge> : null}
                  <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {formatPriceDelta(option.priceDelta) ?? "Ücretsiz"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-2">
            <h3 className="text-xs font-medium text-muted-foreground">Dahil olduğu ürünler</h3>
            <AddButton className="h-8 px-2 text-xs" onClick={() => props.onAssign(selected)}>
              Ürüne dahil et
            </AddButton>
          </div>
          {assigned.length === 0 ? (
            <p className="px-4 pb-4 pt-1 text-sm text-muted-foreground">Bu opsiyon henüz bir ürüne dahil değil.</p>
          ) : (
            <ul className="divide-y divide-border">
              {assigned.map(({ productId, product }) => (
                <li key={productId}>
                  {product ? (
                    <Link
                      href={productHref(product)}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <ProductThumb imageUrl={product.imageUrl} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{product.name}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground">
                      <ProductThumb />
                      Ürün #{productId}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  return { sidebar, detail, hasSelection: selected != null, dialogs: props.dialogs };
}

function productHref(product: MenuProductApiItem): string {
  return product.menuId != null
    ? DASHBOARD_ROUTES.digitalMenuProductDetailForMenu(product.productId, product.menuId)
    : `${DASHBOARD_ROUTES.digitalMenuProducts}/${product.productId}`;
}

/** The Opsiyonlar side of the Ürünler explorer: option groups in the second sidebar, the picked one on the right. */
export function useOptionExplorer(): ExplorerParts {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const groupsQuery = useQuery({
    queryKey: ["catalog-option-groups"],
    queryFn: listCatalogOptionGroupsRequest,
  });
  const productsQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: listCatalogProductsRequest,
  });
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<number | null>(null);
  const [assignProductId, setAssignProductId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MenuProductOptionGroupApiItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const productNameById = useMemo(() => {
    const names = new Map<number, string>();
    for (const product of products) names.set(product.productId, product.name);
    return names;
  }, [products]);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr");
    if (!needle) return groups;
    return groups.filter((group) => {
      const productNames = (group.productIds ?? []).map(
        (productId) => productNameById.get(productId) ?? "",
      );
      return [group.name, optionKindLabel(group.kind), ...group.options.map((option) => option.name), ...productNames]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(needle);
    });
  }, [groups, productNameById, query]);

  const assignGroup = groups.find((group) => group.groupId === assignGroupId) ?? null;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalog-option-groups"] }),
      queryClient.invalidateQueries({ queryKey: ["catalog-products"] }),
    ]);
  };

  const applyKind = (kind: MenuProductOptionGroupKind) => {
    if (!draft) return;
    const defaults = kindDefaults(kind);
    const nameBlankOrPreset =
      draft.name.trim() === "" || OPTION_GROUP_KINDS.some((item) => item.defaultName === draft.name.trim());
    setDraft({
      ...draft,
      kind,
      name: nameBlankOrPreset ? defaults.defaultName : draft.name,
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    const payload = toWriteBody(draft);
    if (payload.options.length === 0) {
      notify("warning", "En az bir seçenek adı girin.");
      return;
    }
    setSaving(true);
    try {
      if (draft.mode === "edit" && draft.groupId != null) {
        await updateCatalogOptionGroupRequest(draft.groupId, payload);
        notify("info", "Opsiyon güncellendi.");
      } else {
        await createCatalogOptionGroupRequest(payload);
        notify("info", "Opsiyon eklendi.");
      }
      await refresh();
      setDraft(null);
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Opsiyon kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCatalogOptionGroupRequest(deleteTarget.groupId);
      await refresh();
      notify("info", "Opsiyon silindi.");
      setDeleteTarget(null);
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Opsiyon silinemedi.");
    } finally {
      setSaving(false);
    }
  };

  const assignToProduct = async () => {
    if (!assignGroup) return;
    const productId = Number(assignProductId);
    if (!Number.isFinite(productId) || productId <= 0) {
      notify("warning", "Dahil edilecek ürünü seçin.");
      return;
    }
    if ((assignGroup.productIds ?? []).includes(productId)) {
      notify("info", "Bu opsiyon seçilen üründe zaten var.");
      return;
    }
    setSaving(true);
    try {
      await assignCatalogOptionGroupRequest(assignGroup.groupId, [productId]);
      await refresh();
      const productName = productNameById.get(productId) ?? "ürün";
      notify("info", `Opsiyon ${productName} ürününe dahil edildi.`);
      setAssignGroupId(null);
      setAssignProductId("");
    } catch (error) {
      notify("danger", error instanceof Error ? error.message : "Opsiyon ürüne dahil edilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (group: MenuProductOptionGroupApiItem) => {
    setDraft({
      mode: "edit",
      groupId: group.groupId,
      kind: normalizeOptionKind(group.kind),
      name: group.name,
      choices: group.options.length
        ? group.options.map((option) => ({
            name: option.name,
            priceDelta: String(option.priceDelta ?? 0),
            available: option.available,
          }))
        : [emptyChoice()],
    });
  };

  const openAssign = (group: MenuProductOptionGroupApiItem) => {
    setAssignProductId("");
    setAssignGroupId(group.groupId);
  };

  const dialogs = (
    <>
      <Dialog open={draft != null} onOpenChange={(open) => !open && !saving && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.mode === "edit" ? "Opsiyonu düzenle" : "Opsiyon ekle"}</DialogTitle>
            <DialogDescription>
              Opsiyon kendi başına kaydedilir. Ürüne dahil etmek için listeden ayrıca seçebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tür</Label>
                <Select value={draft.kind} disabled={saving} onValueChange={(value) => applyKind(normalizeOptionKind(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tür seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTION_GROUP_KINDS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="option-group-name">Grup adı</Label>
                <Input
                  id="option-group-name"
                  value={draft.name}
                  disabled={saving}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Seçenekler</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={saving}
                    onClick={() => setDraft({ ...draft, choices: [...draft.choices, emptyChoice()] })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Seçenek
                  </Button>
                </div>
                <AddProductsAsOptions
                  products={products}
                  existingNames={draft.choices.map((choice) => choice.name)}
                  disabled={saving}
                  onAdd={(added) =>
                    setDraft({
                      ...draft,
                      choices: [
                        ...draft.choices,
                        ...added.map((choice) => ({
                          name: choice.name,
                          priceDelta: choice.priceDelta,
                          available: true,
                        })),
                      ],
                    })
                  }
                />
                {draft.choices.map((choice, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_auto_auto] items-center gap-2">
                    <Input
                      value={choice.name}
                      disabled={saving}
                      placeholder="Küçük, ekstra peynir..."
                      aria-label={`Seçenek ${index + 1} adı`}
                      onChange={(event) => {
                        const choices = draft.choices.slice();
                        choices[index] = { ...choice, name: event.target.value };
                        setDraft({ ...draft, choices });
                      }}
                    />
                    <MoneyInput
                      value={choice.priceDelta}
                      disabled={saving}
                      aria-label={`Seçenek ${index + 1} fiyat farkı`}
                      onChange={(priceDelta) => {
                        const choices = draft.choices.slice();
                        choices[index] = { ...choice, priceDelta };
                        setDraft({ ...draft, choices });
                      }}
                      placeholder="+0"
                    />
                    <Switch
                      checked={choice.available}
                      disabled={saving}
                      aria-label={`Seçenek ${index + 1} aktif`}
                      onCheckedChange={(available) => {
                        const choices = draft.choices.slice();
                        choices[index] = { ...choice, available };
                        setDraft({ ...draft, choices });
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 ${TONE_ACTION.delete}`}
                      aria-label={`Seçenek ${index + 1} sil`}
                      disabled={saving || draft.choices.length === 1}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          choices: draft.choices.filter((_, choiceIndex) => choiceIndex !== index),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setDraft(null)}>
              Vazgeç
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveDraft()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignGroup != null}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setAssignGroupId(null);
            setAssignProductId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ürüne dahil et</DialogTitle>
            <DialogDescription>
              {assignGroup
                ? `"${assignGroup.name}" seçilen ürünün sipariş seçeneklerine kopyalanır.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {products.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Dahil etmek için önce bir ürün oluşturun.</p>
              <Button size="sm" asChild>
                <Link href={DASHBOARD_ROUTES.digitalMenuProductCreate}>Ürün oluştur</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Ürün</Label>
              <SearchableSelect
                value={assignProductId}
                onValueChange={setAssignProductId}
                options={products.map((product) => ({
                  value: String(product.productId),
                  label: product.name,
                }))}
                placeholder="Ürün seçin"
                searchPlaceholder="Ürün ara..."
                emptyText="Ürün yok."
                disabled={saving}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setAssignGroupId(null);
                setAssignProductId("");
              }}
            >
              Vazgeç
            </Button>
            <Button type="button" disabled={saving || products.length === 0} onClick={() => void assignToProduct()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dahil et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && !saving && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opsiyonu sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" listeden silinir. Daha önce bir ürüne dahil edilen kopya o üründe kalır.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return optionExplorerParts({
    groups,
    visibleGroups,
    loading: groupsQuery.isLoading,
    failed: groupsQuery.isError,
    onRetry: () => void groupsQuery.refetch(),
    query,
    onQueryChange: setQuery,
    products,
    selectedId,
    onSelect: setSelectedId,
    onCreate: () => setDraft(emptyDraft()),
    onEdit: openEdit,
    onAssign: openAssign,
    onDelete: setDeleteTarget,
    dialogs,
  });
}
