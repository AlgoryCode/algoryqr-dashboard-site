"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { LayoutCapacitySelect } from "@/components/dashboard/restaurant-layout/LayoutCapacitySelect";
import { getQrDataUrl } from "@/components/dashboard/qr/qr-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { RestaurantTable } from "@/lib/ordering-api";
import { resolveTableCapacity } from "@/lib/restaurant-layout";

export type LayoutTableRowAction = {
  key: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
};

type LayoutTableListProps = {
  tables: RestaurantTable[];
  selectedIds: number[];
  isEditing: boolean;
  editName: string;
  editTableNumber: string;
  editCapacity: string;
  updatePending: boolean;
  emptyLabel: string;
  onSelect: (table: RestaurantTable) => void;
  onToggleActive: (table: RestaurantTable) => void;
  onEditNameChange: (value: string) => void;
  onEditTableNumberChange: (value: string) => void;
  onEditCapacityChange: (value: string) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  getRowActions: (table: RestaurantTable) => LayoutTableRowAction[];
};

export function LayoutTableList({
  tables,
  selectedIds,
  isEditing,
  editName,
  editTableNumber,
  editCapacity,
  updatePending,
  emptyLabel,
  onSelect,
  onToggleActive,
  onEditNameChange,
  onEditTableNumberChange,
  onEditCapacityChange,
  onSaveEditing,
  onCancelEditing,
  getRowActions,
}: LayoutTableListProps) {
  if (tables.length === 0) {
    return <p className="px-1 py-2 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {tables.map((table) => {
          const active = selectedIds.includes(table.id);
          const editing = isEditing && active;
          return (
            <div
              key={table.id}
              className={`rounded-lg border bg-white p-3 ${
                active ? "border-gray-300" : "border-gray-200"
              }`}
              onClick={() => {
                if (!editing) onSelect(table);
              }}
            >
              <div className="flex items-start gap-3">
                <TableQrThumb table={table} size="mobile" />
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editName}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        required
                        aria-label="Masa adı"
                        className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      />
                      <input
                        value={editTableNumber}
                        onChange={(e) => onEditTableNumberChange(e.target.value)}
                        type="number"
                        placeholder="No"
                        aria-label="Masa numarası"
                        className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      />
                      <LayoutCapacitySelect
                        value={Number(editCapacity) || resolveTableCapacity(table.capacity)}
                        disabled={updatePending}
                        aria-label="Kişi sayısı"
                        className="h-8 py-1"
                        onChange={(capacity) => onEditCapacityChange(String(capacity))}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="font-medium">{table.name}</span>
                      {table.tableNumber != null ? (
                        <span className="text-sm text-gray-500">#{table.tableNumber}</span>
                      ) : null}
                      <span className="text-sm text-gray-500">
                        {resolveTableCapacity(table.capacity)} kişi
                      </span>
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={table.active}
                      disabled={updatePending}
                      onCheckedChange={() => onToggleActive(table)}
                      aria-label={table.active ? `${table.name} pasifleştir` : `${table.name} aktifleştir`}
                    />
                    <span className="text-xs text-gray-500">{table.active ? "Aktif" : "Pasif"}</span>
                  </div>
                </div>
              </div>
              <div
                className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {editing ? (
                  <EditActions
                    pending={updatePending}
                    canSave={!!editName.trim()}
                    onSave={onSaveEditing}
                    onCancel={onCancelEditing}
                    compact={false}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-between">
                    {getRowActions(table).map((action) => (
                      <Button
                        key={action.key}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 ${
                          action.destructive ? "text-destructive hover:text-destructive" : ""
                        }`}
                        aria-label={action.label}
                        disabled={action.disabled}
                        onClick={action.onClick}
                      >
                        {action.icon}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full min-w-[820px] border-collapse bg-white text-sm">
          <thead className="border-b border-gray-200 bg-white text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="border border-gray-200 px-3 py-2 font-medium">QR</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Masa</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">No</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Kişi</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Durum</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-center">İndir</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-center">Yazdır</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-center">Yenile</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-center">Düzenle</th>
              <th className="border border-gray-200 px-3 py-2 font-medium text-center">Sil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {tables.map((table) => {
              const active = selectedIds.includes(table.id);
              const editing = isEditing && active;
              return (
                <tr
                  key={table.id}
                  className={active ? "bg-gray-50" : "bg-white hover:bg-gray-50/60"}
                  onClick={() => {
                    if (!editing) onSelect(table);
                  }}
                >
                  <td className="border border-gray-200 px-3 py-2">
                    <TableQrThumb table={table} size="desktop" />
                  </td>
                  <td className="border border-gray-200 px-3 py-2">
                    {editing ? (
                      <input
                        value={editName}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        required
                        aria-label="Masa adı"
                        className="w-full min-w-[120px] rounded-md border border-border bg-background px-2 py-1 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-medium">{table.name}</span>
                    )}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">
                    {editing ? (
                      <input
                        value={editTableNumber}
                        onChange={(e) => onEditTableNumberChange(e.target.value)}
                        type="number"
                        aria-label="Masa numarası"
                        className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      table.tableNumber ?? "—"
                    )}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">
                    {editing ? (
                      <LayoutCapacitySelect
                        value={Number(editCapacity) || resolveTableCapacity(table.capacity)}
                        disabled={updatePending}
                        aria-label="Kişi sayısı"
                        className="h-8 py-1"
                        onChange={(capacity) => onEditCapacityChange(String(capacity))}
                      />
                    ) : (
                      `${resolveTableCapacity(table.capacity)} kişi`
                    )}
                  </td>
                  <td className="border border-gray-200 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={table.active}
                        disabled={updatePending}
                        onCheckedChange={() => onToggleActive(table)}
                        aria-label={
                          table.active ? `${table.name} pasifleştir` : `${table.name} aktifleştir`
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {table.active ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                  </td>
                  {editing ? (
                    <td
                      colSpan={5}
                      className="border border-gray-200 px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditActions
                        pending={updatePending}
                        canSave={!!editName.trim()}
                        onSave={onSaveEditing}
                        onCancel={onCancelEditing}
                        compact
                      />
                    </td>
                  ) : (
                    getRowActions(table).map((action) => (
                      <td
                        key={action.key}
                        className="border border-gray-200 px-3 py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${
                            action.destructive ? "text-destructive hover:text-destructive" : ""
                          }`}
                          aria-label={action.label}
                          disabled={action.disabled}
                          onClick={action.onClick}
                        >
                          {action.icon}
                        </Button>
                      </td>
                    ))
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TableQrThumb({
  table,
  size,
}: {
  table: RestaurantTable;
  size: "mobile" | "desktop";
}) {
  const box = size === "mobile" ? "h-12 w-12" : "h-8 w-8";
  if (table.qrImageBase64) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getQrDataUrl(table.qrImageBase64) ?? undefined}
        alt=""
        className={`${box} shrink-0 rounded border border-gray-200 bg-white p-0.5`}
      />
    );
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded border border-dashed border-gray-200 text-[10px] text-gray-400`}
    >
      —
    </span>
  );
}

function EditActions({
  pending,
  canSave,
  onSave,
  onCancel,
  compact,
}: {
  pending: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  compact: boolean;
}) {
  return (
    <div className={compact ? "flex justify-center gap-1" : "flex flex-1 gap-1"}>
      <Button
        type="button"
        size="sm"
        className={compact ? "h-7" : "h-9 flex-1"}
        disabled={pending || !canSave}
        onClick={onSave}
      >
        {pending ? <Loader2 className={compact ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4 animate-spin"} /> : "Kaydet"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={compact ? "h-7" : "h-9 flex-1"}
        disabled={pending}
        onClick={onCancel}
      >
        Vazgeç
      </Button>
    </div>
  );
}
