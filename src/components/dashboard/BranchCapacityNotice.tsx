"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";
import { invalidateAccessProfile } from "@/hooks/use-access-profile";

type CapacityBranch = { id: number; name: string; locked: boolean };

/** qr-service `/capacity/branches`: branches over the plan's limit. `limit` is null when unlimited. */
export type BranchCapacity = {
  overLimit: boolean;
  limit: number | null;
  active: number;
  total: number;
  deadline: string | null;
  branches: CapacityBranch[];
};

const QUERY_KEY = ["branch-capacity"];

function formatDeadline(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

/**
 * Shown when the plan now allows fewer branches than the member has (a downgrade, a lapsed
 * add-on). Nothing is locked during the grace period; the member picks which branches stay active,
 * otherwise the oldest ones are kept when it ends. Also lets them change the pick later.
 */
export function BranchCapacityNotice() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get<BranchCapacity>("/capacity/branches")).data,
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!data || data.limit == null) return null;
  const lockedCount = data.branches.filter((branch) => branch.locked).length;
  if (!data.overLimit && lockedCount === 0) return null;

  const deadline = formatDeadline(data.deadline);
  const message = data.overLimit
    ? `Paketiniz ${data.limit} şubeye izin veriyor, ${data.active} aktif şubeniz var. ${
        deadline ? `${deadline} tarihine kadar` : "Hemen"
      } hangi şubelerin açık kalacağını seçin; seçmezseniz en eski şubeler açık kalır, diğerleri salt okunur olur.`
    : `${lockedCount} şubeniz paket limitiniz nedeniyle salt okunur. Menüleri yayında kalır, düzenlenemez.`;

  return (
    <>
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 sm:px-6 dark:text-amber-200"
      >
        <Store className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">{message}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
        >
          {data.overLimit ? "Şubeleri seç" : "Seçimi değiştir"}
        </button>
        <Link href={DASHBOARD_ROUTES.accountPackages} className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline">
          Paketi yükselt
        </Link>
      </div>
      {open ? <BranchKeepDialog capacity={data} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function BranchKeepDialog({ capacity, onClose }: { capacity: BranchCapacity; onClose: () => void }) {
  const queryClient = useQueryClient();
  const limit = capacity.limit ?? capacity.total;
  const [selected, setSelected] = useState<number[]>(() =>
    capacity.branches.filter((branch) => !branch.locked).map((branch) => branch.id).slice(0, limit),
  );
  const keep = useMutation({
    mutationFn: async () => (await api.post<BranchCapacity>("/capacity/branches/keep", { branchIds: selected })).data,
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next);
      void queryClient.invalidateQueries({ queryKey: ["branches"] });
      void invalidateAccessProfile();
      onClose();
    },
  });
  const toggle = (id: number, checked: boolean) =>
    setSelected((current) =>
      checked ? (current.length < limit ? [...current, id] : current) : current.filter((value) => value !== id),
    );

  return (
    <Dialog open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Açık kalacak şubeleri seçin</DialogTitle>
          <DialogDescription>
            En çok {limit} şube seçebilirsiniz. Seçmedikleriniz salt okunur olur: menüleri yayında kalır, siparişler
            gelmeye devam eder, yalnızca düzenleme kapanır. Seçiminizi istediğiniz zaman değiştirebilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {capacity.branches.map((branch) => {
            const checked = selected.includes(branch.id);
            const disabled = !checked && selected.length >= limit;
            return (
              <li key={branch.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(value) => toggle(branch.id, value === true)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{branch.name}</span>
                  {branch.locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Salt okunur" /> : null}
                </label>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          {selected.length} / {limit} seçildi
        </p>
        {keep.isError ? (
          <p className="text-sm text-destructive">{keep.error instanceof Error && keep.error.message ? keep.error.message : "Seçim kaydedilemedi."}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={() => keep.mutate()} disabled={keep.isPending || selected.length === 0}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
