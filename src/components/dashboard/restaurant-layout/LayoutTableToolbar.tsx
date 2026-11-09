"use client";

import { Pencil, Trash2 } from "lucide-react";

import { LayoutCapacitySelect } from "@/components/dashboard/restaurant-layout/LayoutCapacitySelect";
import { Button } from "@/components/ui/button";
import type { RestaurantTable } from "@/lib/ordering-api";
import { parseLayoutShape, resolveTableCapacity, tableLayoutSize } from "@/lib/restaurant-layout";
import { cn } from "@/lib/utils";
import { TONE_ACTION } from "@/components/dashboard/tone";

type LayoutTableToolbarProps = {
  tables: RestaurantTable[];
  isEditing: boolean;
  editName: string;
  editTableNumber: string;
  updatePending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onCapacityChange: (table: RestaurantTable, capacity: number) => void;
  onEditNameChange: (value: string) => void;
  onEditTableNumberChange: (value: string) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
};

export function LayoutTableToolbar({
  tables,
  isEditing,
  editName,
  editTableNumber,
  updatePending,
  onEdit,
  onDelete,
  onToggleActive,
  onCapacityChange,
  onEditNameChange,
  onEditTableNumberChange,
  onSaveEditing,
  onCancelEditing,
}: LayoutTableToolbarProps) {
  const table = tables[0];
  if (!table) return null;
  const many = tables.length > 1;
  const allActive = tables.every((item) => item.active);
  const size = tableLayoutSize(parseLayoutShape(table.layoutShape), table.capacity);
  const x = tables.reduce((sum, item) => sum + (item.layoutX ?? 50), 0) / tables.length;
  const topY = Math.min(
    ...tables.map((item) => {
      const itemSize = tableLayoutSize(parseLayoutShape(item.layoutShape), item.capacity);
      return (item.layoutY ?? 50) - itemSize.height / 2;
    }),
  );
  const showBelow = topY < 18;

  return (
    <div
      className="pointer-events-none absolute z-30 flex max-w-[min(100%,20rem)] flex-col items-center gap-1"
      style={
        many
          ? { left: "50%", top: 0, transform: "translate(-50%, 8px)" }
          : {
              left: `${x}%`,
              top: showBelow ? `${topY + size.height}%` : `${topY}%`,
              transform: showBelow ? "translate(-50%, 8px)" : "translate(-50%, calc(-100% - 8px))",
            }
      }
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border border-border bg-background/95 p-0.5 shadow-md backdrop-blur-sm">
        {many ? (
          <span className="px-1.5 text-[10px] font-medium text-muted-foreground">
            {tables.length} masa
          </span>
        ) : null}
        <button
          type="button"
          role="switch"
          aria-checked={allActive}
          aria-label={
            many
              ? allActive
                ? "Seçili masaları pasifleştir"
                : "Seçili masaları aktifleştir"
              : table.active
                ? `${table.name} pasifleştir`
                : `${table.name} aktifleştir`
          }
          disabled={updatePending}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!updatePending) onToggleActive();
          }}
          className={cn(
            "flex h-7 items-center gap-1 rounded px-1.5 text-[10px] font-medium",
            allActive ? "text-emerald-700" : "text-muted-foreground",
            updatePending ? "opacity-50" : "hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "relative h-3.5 w-6 rounded-full transition-colors",
              allActive ? "bg-emerald-500" : "bg-muted-foreground/35",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all",
                allActive ? "left-3" : "left-0.5",
              )}
            />
          </span>
          {allActive ? "Aktif" : "Pasif"}
        </button>
        {many ? null : (
          <LayoutCapacitySelect
            value={resolveTableCapacity(table.capacity)}
            disabled={updatePending}
            aria-label={`${table.name} kişi sayısı`}
            className="h-7 w-[4.75rem] px-1 py-0 text-[10px]"
            onChange={(capacity) => onCapacityChange(table, capacity)}
          />
        )}
        {many ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${TONE_ACTION.edit}`}
            aria-label={`${table.name} düzenle`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${TONE_ACTION.delete}`}
          aria-label={many ? "Seçili masaları sil" : `${table.name} sil`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {isEditing && !many ? (
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-border bg-background/95 p-1 shadow-md">
          <input
            value={editName}
            onChange={(event) => onEditNameChange(event.target.value)}
            aria-label="Masa adı"
            className="h-7 w-24 rounded-md border border-border bg-background px-1.5 text-xs"
          />
          <input
            value={editTableNumber}
            onChange={(event) => onEditTableNumberChange(event.target.value)}
            type="number"
            aria-label="Masa numarası"
            className="h-7 w-12 rounded-md border border-border bg-background px-1.5 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={updatePending || !editName.trim()}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!updatePending && editName.trim()) onSaveEditing();
            }}
          >
            Kaydet
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={updatePending}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCancelEditing();
            }}
          >
            Vazgeç
          </Button>
        </div>
      ) : null}
    </div>
  );
}
