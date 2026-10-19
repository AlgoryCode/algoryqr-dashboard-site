"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { AddProductsAsOptions } from "@/components/dashboard/menu/ProductOptionFields";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type MenuProductOptionGroupApiItem,
} from "@/lib/api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  OPTION_GROUP_KINDS,
  formatOptionGroupHeading,
  normalizeOptionKind,
  normalizeOptionUnit,
  optionKindLabel,
  type MenuProductOptionGroupKind,
} from "@/lib/product-options";

type ChoiceDraft = {
  name: string;
  priceDelta: string;
  available: boolean;
};

function GroupActions({
  onAssign,
  onEdit,
  onDelete,
}: {
  onAssign: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1">
          İşlemler
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onAssign}>
          <Link2 className="mr-2 h-3.5 w-3.5" />
          Ürüne dahil et
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Düzenle
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

export function CatalogOptionsPanel() {
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
  const groups = groupsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<number | null>(null);
  const [assignProductId, setAssignProductId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MenuProductOptionGroupApiItem | null>(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <>
      <DashboardPageHeader
        title="Opsiyonlar"
        hint="Opsiyonları tek başına oluşturun. İstediğiniz zaman bir ürüne dahil edin."
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setDraft(emptyDraft())}>
            <Plus className="h-3.5 w-3.5" />
            Opsiyon ekle
          </Button>
        }
      />

      {groupsQuery.isLoading ? (
        <div className={`${DASHBOARD_PANEL} flex items-center gap-2 text-sm text-muted-foreground`}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opsiyonlar yükleniyor…
        </div>
      ) : groupsQuery.isError ? (
        <p className="text-sm text-destructive">Opsiyonlar yüklenemedi.</p>
      ) : (
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Opsiyon veya seçenek ara"
            aria-label="Opsiyon ara"
          />
          {visibleGroups.length === 0 ? (
            <div className={DASHBOARD_PANEL}>
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? "Bu aramaya uygun opsiyon yok."
                  : "Henüz opsiyon yok. Opsiyon ekle ile başlayın."}
              </p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
              {visibleGroups.map((group) => {
                const assignedNames = (group.productIds ?? []).map(
                  (productId) => productNameById.get(productId) ?? `Ürün #${productId}`,
                );
                return (
                  <article key={group.groupId} className="space-y-3 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{formatOptionGroupHeading(group)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {optionKindLabel(group.kind)}
                          {assignedNames.length > 0 ? ` · ${assignedNames.join(", ")}` : ""}
                        </p>
                      </div>
                      <GroupActions
                        onAssign={() => {
                          setAssignProductId("");
                          setAssignGroupId(group.groupId);
                        }}
                        onEdit={() => openEdit(group)}
                        onDelete={() => setDeleteTarget(group)}
                      />
                    </div>
                    <ul className="space-y-2">
                      {group.options.length === 0 ? (
                        <li className="text-sm text-muted-foreground">Seçenek yok</li>
                      ) : (
                        group.options.map((option) => (
                          <li key={option.optionId} className="flex items-baseline justify-between gap-3 text-sm">
                            <span className={option.available ? "min-w-0 truncate" : "min-w-0 truncate text-muted-foreground line-through"}>
                              {option.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatPriceDelta(option.priceDelta) ?? "—"} · {option.available ? "Aktif" : "Kapalı"}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr>
                    {["Grup", "Tür", "Seçenek", "Fiyat farkı", "Durum", "Ürünler", "İşlem"].map((label) => (
                      <th
                        key={label}
                        className="border border-border bg-muted/50 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map((group) => {
                    const assignedNames = (group.productIds ?? []).map(
                      (productId) => productNameById.get(productId) ?? `Ürün #${productId}`,
                    );
                    const rows = group.options.length > 0 ? group.options : [null];
                    return rows.map((option, index) => (
                      <tr key={option ? option.optionId : `${group.groupId}-empty`} className="hover:bg-muted/30">
                        {index === 0 ? (
                          <>
                            <td rowSpan={rows.length} className="border border-border px-3 py-2.5 align-top font-medium">
                              {formatOptionGroupHeading(group)}
                            </td>
                            <td rowSpan={rows.length} className="border border-border px-3 py-2.5 align-top text-muted-foreground">
                              {optionKindLabel(group.kind)}
                            </td>
                          </>
                        ) : null}
                        <td
                          className={`border border-border px-3 py-2.5 ${
                            option && !option.available ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {option?.name || "—"}
                        </td>
                        <td className="border border-border px-3 py-2.5 tabular-nums text-muted-foreground">
                          {option ? formatPriceDelta(option.priceDelta) ?? "—" : "—"}
                        </td>
                        <td className="border border-border px-3 py-2.5 text-muted-foreground">
                          {option ? (option.available ? "Aktif" : "Kapalı") : "—"}
                        </td>
                        {index === 0 ? (
                          <>
                            <td rowSpan={rows.length} className="border border-border px-3 py-2.5 align-top text-muted-foreground">
                              {assignedNames.length > 0 ? assignedNames.join(", ") : "—"}
                            </td>
                            <td rowSpan={rows.length} className="border border-border px-2 py-2 text-right align-top">
                              <GroupActions
                                onAssign={() => {
                                  setAssignProductId("");
                                  setAssignGroupId(group.groupId);
                                }}
                                onEdit={() => openEdit(group)}
                                onDelete={() => setDeleteTarget(group)}
                              />
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

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
                      className="h-8 w-8 text-destructive"
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
}
