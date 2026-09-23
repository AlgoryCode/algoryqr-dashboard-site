"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import { STOCK_UNIT_LABELS, getRecipe, listIngredients, replaceRecipe } from "@/lib/stock-api";

type DraftLine = { key: string; ingredientId: string; quantityPerSale: string };

export function ProductRecipePanel({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const recipe = useQuery({
    queryKey: ["stock-recipe", productId],
    queryFn: () => getRecipe(productId),
  });
  const branchId = recipe.data?.branchId ?? null;
  const ingredients = useQuery({
    queryKey: ["stock-ingredients", branchId, "recipe-options"],
    queryFn: () => listIngredients(branchId as number, { page: 0, size: 100 }),
    enabled: branchId != null,
  });
  const [draft, setDraft] = useState<DraftLine[] | null>(null);
  const lines =
    draft ??
    (recipe.data?.lines.map((line) => ({
      key: String(line.id),
      ingredientId: String(line.ingredientId),
      quantityPerSale: String(line.quantityPerSale),
    })) ?? []);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setDraft(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  const save = useMutation({
    mutationFn: () =>
      replaceRecipe(
        productId,
        lines
          .filter((line) => line.ingredientId !== "" && line.quantityPerSale.trim() !== "")
          .map((line) => ({
            ingredientId: Number(line.ingredientId),
            quantityPerSale: line.quantityPerSale,
          })),
      ),
    onSuccess: async () => {
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["stock-recipe", productId] });
      notify("info", "Reçete kaydedildi");
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "Reçete kaydedilemedi"),
  });

  return (
    <section className="border-t border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-foreground">Reçete</p>
          <p className="text-xs text-muted-foreground">Bir porsiyon için düşülecek hammadde.</p>
        </div>
        <Button type="button" size="sm" disabled={branchId == null || save.isPending} onClick={() => save.mutate()}>
          Kaydet
        </Button>
      </div>
      {recipe.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Yükleniyor…</p> : null}
      {recipe.data && branchId == null ? (
        <p className="mt-3 text-sm text-muted-foreground">Reçete için menüyü bir şubeye bağlayın.</p>
      ) : null}
      {branchId != null ? (
        <div className="mt-3 space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-[1fr_7rem_auto] gap-2">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={line.ingredientId}
                onChange={(event) => updateLine(line.key, { ingredientId: event.target.value })}
              >
                <option value="">Hammadde</option>
                {(ingredients.data?.content ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({STOCK_UNIT_LABELS[item.unit]})
                  </option>
                ))}
              </select>
              <Input
                value={line.quantityPerSale}
                inputMode="decimal"
                onChange={(event) => updateLine(line.key, { quantityPerSale: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(lines.filter((item) => item.key !== line.key))}
              >
                Sil
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft([...lines, { key: `new-${Date.now()}`, ingredientId: "", quantityPerSale: "" }])
            }
          >
            Satır ekle
          </Button>
        </div>
      ) : null}
    </section>
  );
}
