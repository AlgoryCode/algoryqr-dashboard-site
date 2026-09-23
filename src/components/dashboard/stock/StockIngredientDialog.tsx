"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STOCK_UNITS,
  STOCK_UNIT_LABELS,
  type IngredientPayload,
  type IngredientUpdatePayload,
  type StockIngredient,
  type StockUnit,
} from "@/lib/stock-api";

type StockIngredientDialogProps = {
  open: boolean;
  ingredient: StockIngredient | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: IngredientPayload) => void;
  onUpdate: (payload: IngredientUpdatePayload) => void;
};

export function StockIngredientDialog({
  open,
  ingredient,
  pending,
  onOpenChange,
  onCreate,
  onUpdate,
}: StockIngredientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ingredient ? "Hammadde düzenle" : "Hammadde ekle"}</DialogTitle>
        </DialogHeader>
        <IngredientForm
          key={ingredient?.id ?? "new"}
          ingredient={ingredient}
          pending={pending}
          onCreate={onCreate}
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>
  );
}

function IngredientForm({
  ingredient,
  pending,
  onCreate,
  onUpdate,
}: {
  ingredient: StockIngredient | null;
  pending: boolean;
  onCreate: (payload: IngredientPayload) => void;
  onUpdate: (payload: IngredientUpdatePayload) => void;
}) {
  const [name, setName] = useState(ingredient?.name ?? "");
  const [unit, setUnit] = useState<StockUnit>(ingredient?.unit ?? "ADET");
  const [quantity, setQuantity] = useState(ingredient ? String(ingredient.quantity) : "0");
  const [minQuantity, setMinQuantity] = useState(ingredient ? String(ingredient.minQuantity) : "0");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ingredient) {
      onUpdate({ name: name.trim(), unit, minQuantity });
      return;
    }
    onCreate({ name: name.trim(), unit, quantity, minQuantity });
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <Field label="Ad">
        <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} />
      </Field>
      <Field label="Birim">
        <UnitSelect unit={unit} onChange={setUnit} />
      </Field>
      {ingredient ? null : (
        <Field label="Açılış miktarı">
          <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" required />
        </Field>
      )}
      <Field label="Minimum stok">
        <Input value={minQuantity} onChange={(event) => setMinQuantity(event.target.value)} inputMode="decimal" required />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || name.trim() === ""}>
          Kaydet
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function UnitSelect({ unit, onChange }: { unit: StockUnit; onChange: (unit: StockUnit) => void }) {
  return (
    <select
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={unit}
      onChange={(event) => onChange(event.target.value as StockUnit)}
    >
      {STOCK_UNITS.map((item) => (
        <option key={item} value={item}>
          {STOCK_UNIT_LABELS[item]}
        </option>
      ))}
    </select>
  );
}
