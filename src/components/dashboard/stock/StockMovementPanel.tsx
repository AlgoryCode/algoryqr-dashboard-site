"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  MANUAL_MOVEMENT_KINDS,
  MOVEMENT_KIND_LABELS,
  formatQuantity,
  listMovements,
  recordMovement,
  type ManualMovementKind,
  type StockIngredient,
} from "@/lib/stock-api";

export function StockMovementPanel({ ingredient }: { ingredient: StockIngredient }) {
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const [kind, setKind] = useState<ManualMovementKind>("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const movements = useQuery({
    queryKey: ["stock-movements", ingredient.id],
    queryFn: () => listMovements(ingredient.id),
  });
  const mutation = useMutation({
    mutationFn: () => recordMovement(ingredient.id, { kind, quantity, note: note.trim() || undefined }),
    onSuccess: async () => {
      setQuantity("");
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-movements", ingredient.id] }),
        queryClient.invalidateQueries({ queryKey: ["stock-ingredients"] }),
      ]);
      notify("info", "Stok hareketi kaydedildi");
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "Hareket kaydedilemedi"),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">{ingredient.name} hareketleri</h2>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-[8rem_8rem_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label>Tür</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={kind}
            onChange={(event) => setKind(event.target.value as ManualMovementKind)}
          >
            {MANUAL_MOVEMENT_KINDS.map((item) => (
              <option key={item} value={item}>
                {MOVEMENT_KIND_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{kind === "ADJUST" ? "Yeni bakiye" : "Miktar"}</Label>
          <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" required />
        </div>
        <div className="space-y-1.5">
          <Label>Not</Label>
          <Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
        </div>
        <Button type="submit" disabled={mutation.isPending || quantity.trim() === ""}>
          Kaydet
        </Button>
      </form>
      <ul className="mt-4 space-y-2">
        {(movements.data?.content ?? []).map((movement) => (
          <li key={movement.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">
              {MOVEMENT_KIND_LABELS[movement.kind] ?? movement.kind}
              {movement.note ? <span className="text-muted-foreground"> · {movement.note}</span> : null}
            </span>
            <span className="shrink-0 tabular-nums text-foreground">
              {formatQuantity(movement.quantityDelta)} → {formatQuantity(movement.balanceAfter)}
            </span>
          </li>
        ))}
        {movements.data && movements.data.content.length === 0 ? (
          <li className="text-sm text-muted-foreground">Hareket yok.</li>
        ) : null}
      </ul>
    </section>
  );
}
