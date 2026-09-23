"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BranchPicker, useBranchSelection } from "@/components/dashboard/BranchPicker";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StockIngredientDialog } from "@/components/dashboard/stock/StockIngredientDialog";
import { StockMovementPanel } from "@/components/dashboard/stock/StockMovementPanel";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";
import {
  STOCK_UNIT_LABELS,
  createIngredient,
  deleteIngredient,
  formatQuantity,
  listIngredients,
  updateIngredient,
  type IngredientPayload,
  type IngredientUpdatePayload,
  type StockIngredient,
} from "@/lib/stock-api";

export default function StockView() {
  const searchParams = useSearchParams();
  const initialBranchId = useMemo(() => {
    const raw = Number(searchParams.get("branch"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const branch = useBranchSelection(initialBranchId);
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StockIngredient | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StockIngredient | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();
  const ingredients = useQuery({
    queryKey: ["stock-ingredients", branch.branchId, lowOnly, page],
    queryFn: () => listIngredients(branch.branchId as number, { lowOnly, page, size: 20 }),
    enabled: branch.branchId != null,
  });
  const selected = ingredients.data?.content.find((item) => item.id === selectedId) ?? null;

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["stock-ingredients"] });
  }

  const createMutation = useMutation({
    mutationFn: (payload: IngredientPayload) => createIngredient(branch.branchId as number, payload),
    onSuccess: async () => {
      setEditorOpen(false);
      await invalidate();
      notify("info", "Hammadde eklendi");
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "Hammadde eklenemedi"),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: IngredientUpdatePayload) => updateIngredient(editing?.id as number, payload),
    onSuccess: async () => {
      setEditorOpen(false);
      setEditing(null);
      await invalidate();
      notify("info", "Hammadde güncellendi");
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "Hammadde güncellenemedi"),
  });
  const deleteMutation = useMutation({
    mutationFn: (ingredientId: number) => deleteIngredient(ingredientId),
    onSuccess: async () => {
      setPendingDelete(null);
      setSelectedId(null);
      await invalidate();
      notify("info", "Hammadde silindi");
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "Hammadde silinemedi"),
  });

  return (
    <div className="space-y-4">
      <DashboardPageHeader
        title="Stok"
        hint="Şube hammaddeleri, minimum stok ve hareketler."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            disabled={branch.branchId == null}
          >
            Hammadde ekle
          </Button>
        }
      />
      <div className={`${DASHBOARD_PANEL} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <BranchPicker
          branches={branch.branches}
          selectedBranchId={branch.branchId}
          onSelect={(next) => {
            setPage(0);
            setSelectedId(null);
            branch.select(next);
          }}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch
            checked={lowOnly}
            onCheckedChange={(checked) => {
              setLowOnly(checked);
              setPage(0);
            }}
          />
          Düşük stok
        </label>
      </div>
      {branch.empty ? (
        <EmptyState title="Şube yok" description="Stok takibi için önce bir şube oluşturun." />
      ) : (
        <IngredientTable
          rows={ingredients.data?.content ?? []}
          loading={ingredients.isLoading || branch.loading}
          page={ingredients.data?.page ?? 0}
          hasNext={ingredients.data?.hasNext ?? false}
          onPage={setPage}
          onSelect={setSelectedId}
          onEdit={(item) => {
            setEditing(item);
            setEditorOpen(true);
          }}
          onDelete={setPendingDelete}
        />
      )}
      {selected ? <StockMovementPanel key={selected.id} ingredient={selected} /> : null}
      <StockIngredientDialog
        open={editorOpen}
        ingredient={editing}
        pending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={setEditorOpen}
        onCreate={(payload) => createMutation.mutate(payload)}
        onUpdate={(payload) => updateMutation.mutate(payload)}
      />
      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hammadde silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} reçetelerden de kalkar. Hareket geçmişi durur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IngredientTable({
  rows,
  loading,
  page,
  hasNext,
  onPage,
  onSelect,
  onEdit,
  onDelete,
}: {
  rows: StockIngredient[];
  loading: boolean;
  page: number;
  hasNext: boolean;
  onPage: (page: number) => void;
  onSelect: (ingredientId: number) => void;
  onEdit: (ingredient: StockIngredient) => void;
  onDelete: (ingredient: StockIngredient) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }
  if (rows.length === 0) {
    return <EmptyState title="Hammadde yok" description="Bu şube için hammadde ekleyin veya filtreyi kapatın." />;
  }
  return (
    <div className={DASHBOARD_PANEL}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad</TableHead>
            <TableHead>Birim</TableHead>
            <TableHead className="text-right">Bakiye</TableHead>
            <TableHead className="text-right">Minimum</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <TableRow key={item.id} className={item.lowStock ? "bg-destructive/5" : undefined}>
              <TableCell>
                <button type="button" className="font-medium text-foreground" onClick={() => onSelect(item.id)}>
                  {item.name}
                </button>
              </TableCell>
              <TableCell>{STOCK_UNIT_LABELS[item.unit]}</TableCell>
              <TableCell className="text-right tabular-nums">{formatQuantity(item.quantity)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatQuantity(item.minQuantity)}</TableCell>
              <TableCell className="space-x-2 text-right">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>
                  Düzenle
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onDelete(item)}>
                  Sil
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          Önceki
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={() => onPage(page + 1)}>
          Sonraki
        </Button>
      </div>
    </div>
  );
}
