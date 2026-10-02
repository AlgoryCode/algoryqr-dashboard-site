"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SearchableMultiSelect } from "@/components/dashboard/menu/SearchableMultiSelect";
import { SearchableSelect } from "@/components/dashboard/menu/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMenuCategories } from "@/hooks/use-menu-categories";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { flattenMenuCategories, type MainCategoryApiItem } from "@/lib/api";
import type { ChefChatSettings, ChefQuickOption, ChefQuickOptionTarget } from "@/lib/chef/chef-quick-option";

type ChefQuickOptionsEditorProps = {
  menuId: number;
  value: ChefChatSettings;
  onChange: (value: ChefChatSettings) => void;
};

const TARGET_KIND_OPTIONS = [
  { value: "chefRecommended", label: "Şefin önerisi" },
  { value: "popular", label: "En popüler" },
  { value: "tag", label: "Etiket" },
  { value: "mainCategory", label: "Ana kategori" },
  { value: "subCategory", label: "Alt kategori" },
  { value: "products", label: "Belirli ürünler" },
] as const;

function newOptionId() {
  return `quick_${Math.random().toString(36).slice(2, 9)}`;
}

function emptyOption(): ChefQuickOption {
  return {
    id: newOptionId(),
    label: "Hızlı seçenek",
    target: { kind: "chefRecommended" },
  };
}

function mainCategoryOptions(categories: MainCategoryApiItem[]) {
  return categories.map((main) => ({ value: String(main.id), label: main.name }));
}

export function ChefQuickOptionsEditor({ menuId, value, onChange }: ChefQuickOptionsEditorProps) {
  const productsQuery = useMenuProducts(menuId);
  const categoriesQuery = useMenuCategories(menuId);
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const subCategories = flattenMenuCategories(categories);

  const updateOption = useCallback(
    (id: string, patch: Partial<ChefQuickOption>) => {
      onChange({
        ...value,
        quickOptions: value.quickOptions.map((option) =>
          option.id === id ? { ...option, ...patch } : option,
        ),
      });
    },
    [onChange, value],
  );

  const updateTarget = useCallback(
    (id: string, target: ChefQuickOptionTarget) => {
      updateOption(id, { target });
    },
    [updateOption],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Karşılama mesajı</Label>
        <Textarea
          value={value.welcomeMessage}
          onChange={(event) => onChange({ ...value, welcomeMessage: event.target.value })}
          rows={3}
          className="bg-background text-sm"
          placeholder="Merhaba! Size nasıl yardımcı olabilirim?"
        />
        <p className="text-xs text-muted-foreground">
          Misafir şef sohbetini açtığında el sallama ile bu metin gösterilir.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Hızlı seçenekler</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() =>
              onChange({
                ...value,
                quickOptions: [...value.quickOptions, emptyOption()].slice(0, 12),
              })
            }
            disabled={value.quickOptions.length >= 12}
          >
            <Plus className="h-3.5 w-3.5" />
            Ekle
          </Button>
        </div>

        {value.quickOptions.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
            Henüz hızlı seçenek yok. Boş bırakırsanız chat içinde hızlı seçenek gösterilmez.
          </p>
        ) : null}

        {value.quickOptions.map((option, index) => {
          const kind = option.target.kind;
          return (
            <div
              key={option.id}
              className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-foreground">Seçenek {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() =>
                    onChange({
                      ...value,
                      quickOptions: value.quickOptions.filter((entry) => entry.id !== option.id),
                    })
                  }
                  aria-label="Seçeneği sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Buton metni</Label>
                <Input
                  value={option.label}
                  onChange={(event) => updateOption(option.id, { label: event.target.value })}
                  className="bg-background"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ne getirilsin?</Label>
                <SearchableSelect
                  value={kind}
                  onValueChange={(next) => {
                    const kindValue = next as ChefQuickOptionTarget["kind"];
                    if (kindValue === "chefRecommended") updateTarget(option.id, { kind: "chefRecommended" });
                    else if (kindValue === "popular") updateTarget(option.id, { kind: "popular" });
                    else if (kindValue === "tag") updateTarget(option.id, { kind: "tag", slug: "" });
                    else if (kindValue === "mainCategory")
                      updateTarget(option.id, { kind: "mainCategory", mainCategoryId: 0 });
                    else if (kindValue === "subCategory")
                      updateTarget(option.id, { kind: "subCategory", subCategoryId: 0 });
                    else updateTarget(option.id, { kind: "products", productIds: [] });
                  }}
                  options={TARGET_KIND_OPTIONS.map((entry) => ({
                    value: entry.value,
                    label: entry.label,
                  }))}
                  placeholder="Hedef seçin"
                />
              </div>
              {kind === "tag" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Etiket slug</Label>
                  <Input
                    value={option.target.kind === "tag" ? option.target.slug : ""}
                    onChange={(event) =>
                      updateTarget(option.id, { kind: "tag", slug: event.target.value.trim() })
                    }
                    className="bg-background"
                    placeholder="ornek-etiket"
                  />
                </div>
              ) : null}
              {kind === "mainCategory" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Ana kategori</Label>
                  <SearchableSelect
                    value={
                      option.target.kind === "mainCategory" && option.target.mainCategoryId
                        ? String(option.target.mainCategoryId)
                        : ""
                    }
                    onValueChange={(next) =>
                      updateTarget(option.id, {
                        kind: "mainCategory",
                        mainCategoryId: Number(next),
                      })
                    }
                    options={mainCategoryOptions(categories)}
                    placeholder="Kategori seçin"
                  />
                </div>
              ) : null}
              {kind === "subCategory" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Alt kategori</Label>
                  <SearchableSelect
                    value={
                      option.target.kind === "subCategory" && option.target.subCategoryId
                        ? String(option.target.subCategoryId)
                        : ""
                    }
                    onValueChange={(next) =>
                      updateTarget(option.id, {
                        kind: "subCategory",
                        subCategoryId: Number(next),
                      })
                    }
                    options={subCategories.map((sub) => ({
                      value: String(sub.id),
                      label: sub.label,
                    }))}
                    placeholder="Alt kategori seçin"
                  />
                </div>
              ) : null}
              {kind === "products" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Ürünler</Label>
                  <SearchableMultiSelect
                    values={
                      option.target.kind === "products"
                        ? option.target.productIds.map(String)
                        : []
                    }
                    onValuesChange={(values) =>
                      updateTarget(option.id, {
                        kind: "products",
                        productIds: values.map((entry) => Number(entry)).filter((id) => id > 0),
                      })
                    }
                    options={products.map((product) => ({
                      value: String(product.productId),
                      label: product.name,
                    }))}
                    placeholder="Ürün seçin"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useChefChatSettings(menuId: number | null) {
  const [settings, setSettings] = useState<ChefChatSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (menuId == null) return;
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/menu/${menuId}/chef-chat-settings`)
      .then((res) => res.json())
      .then((data: ChefChatSettings) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        if (!cancelled) setSettings(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  return { settings, setSettings, loading };
}
