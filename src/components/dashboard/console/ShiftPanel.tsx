"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Field } from "@/components/dashboard/console/ConsoleDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  PAYMENT_LABELS,
  cashDifference,
  closeShift,
  formatClock,
  formatTl,
  getCurrentShift,
  listShifts,
  openShift,
  parseRateInput,
  toNumber,
  type PaymentTotal,
  type Shift,
} from "@/lib/console-api";
import { DASHBOARD_PANEL } from "@/lib/dashboard-surface";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function differenceClass(value: number) {
  if (value === 0) return "text-foreground";
  return value > 0 ? "text-emerald-600" : "text-red-600";
}

function signedTl(value: number) {
  return `${value > 0 ? "+" : ""}${formatTl(value)}`;
}

export function ShiftPanel({ branchId }: { branchId: number }) {
  const [page, setPage] = useState(0);
  const current = useQuery({
    queryKey: ["console-shift", "current", branchId],
    queryFn: () => getCurrentShift(branchId),
    refetchInterval: 60_000,
  });
  const history = useQuery({
    queryKey: ["console-shift", "list", branchId, page],
    queryFn: () => listShifts(branchId, page),
  });

  return (
    <div className="space-y-4">
      {current.isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : current.data ? (
        <OpenShift key={current.data.id} shift={current.data} />
      ) : (
        <OpenShiftForm branchId={branchId} />
      )}

      <div className={DASHBOARD_PANEL}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Vardiya geçmişi (tüm personel)</h3>
        {(history.data?.content ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{history.isLoading ? "Yükleniyor…" : "Vardiya yok."}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kişi</TableHead>
                  <TableHead>Açılış</TableHead>
                  <TableHead className="hidden md:table-cell">Kapanış</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Oturum</TableHead>
                  <TableHead className="text-right">Tahsilat</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Beklenen nakit</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Sayılan</TableHead>
                  <TableHead className="text-right">Fark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history.data?.content ?? []).map((shift) => {
                  const diff = shift.difference != null ? toNumber(shift.difference) : null;
                  return (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.staffName ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{formatClock(shift.openedAt)}</TableCell>
                      <TableCell className="hidden md:table-cell tabular-nums">{shift.closedAt ? formatClock(shift.closedAt) : "Açık"}</TableCell>
                      <TableCell className="hidden md:table-cell text-right tabular-nums">{shift.sessions}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatTl(totalTaken(shift))}</TableCell>
                      <TableCell className="hidden md:table-cell text-right tabular-nums">{formatTl(shift.expectedCash)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right tabular-nums">
                        {shift.countedCash != null ? formatTl(shift.countedCash) : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-medium tabular-nums ${diff != null ? differenceClass(diff) : ""}`}>
                        {diff != null ? signedTl(diff) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage(page - 1)}>
                Önceki
              </Button>
              <Button size="sm" variant="outline" disabled={!history.data?.hasNext} onClick={() => setPage(page + 1)}>
                Sonraki
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function totalTaken(shift: Shift): number {
  return [...shift.sessionPayments, ...shift.topUps, ...shift.memberships, ...shift.tournamentFees]
    .filter((row) => row.paymentMethod !== "BALANCE")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
}

function useShiftRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["console-shift"] });
}

function OpenShiftForm({ branchId }: { branchId: number }) {
  const { notify } = useDashboardBanners();
  const refresh = useShiftRefresh();
  const [cash, setCash] = useState("");
  const parsed = parseRateInput(cash);
  const open = useMutation({
    mutationFn: () => openShift(branchId, parsed ?? null),
    onSuccess: async () => {
      setCash("");
      await refresh();
      notify("info", "Vardiya açıldı");
    },
    onError: (error) => notify("danger", errorMessage(error, "Vardiya açılamadı")),
  });

  return (
    <div className={`${DASHBOARD_PANEL} space-y-3`}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Vardiyanız kapalı</h3>
        <p className="text-xs text-muted-foreground">
          Vardiya açınca bu şubede sizin aldığınız ödemeler (oturum, bakiye yükleme, üyelik, turnuva) sayılır;
          kapatırken kasadaki nakdi sayıp farkı görürsünüz.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed === undefined) return;
          open.mutate();
        }}
      >
        <Field label="Açılış nakdi (₺)" htmlFor="shift-opening">
          <Input
            id="shift-opening"
            className="w-36"
            inputMode="decimal"
            placeholder="0"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={open.isPending || parsed === undefined}>
          Vardiya aç
        </Button>
      </form>
    </div>
  );
}

function TotalsList({ title, rows }: { title: string; rows: PaymentTotal[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-0.5 text-sm">
        {rows.map((row, index) => (
          <li key={`${row.paymentMethod ?? "none"}-${index}`} className="flex justify-between">
            <span>
              {row.paymentMethod ? PAYMENT_LABELS[row.paymentMethod] : "—"}{" "}
              <span className="text-xs text-muted-foreground">({row.count})</span>
            </span>
            <span className="tabular-nums">{formatTl(row.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OpenShift({ shift }: { shift: Shift }) {
  const { notify } = useDashboardBanners();
  const refresh = useShiftRefresh();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const parsed = parseRateInput(counted);
  const diff = cashDifference(shift.expectedCash, counted);
  const close = useMutation({
    mutationFn: () => closeShift(shift.id, { countedCash: parsed as string, note: note.trim() || undefined }),
    onSuccess: async (closed) => {
      setCounted("");
      setNote("");
      await refresh();
      const difference = toNumber(closed.difference);
      notify(
        difference === 0 ? "info" : "warning",
        difference === 0 ? "Vardiya kapandı, kasa tuttu" : `Vardiya kapandı, fark ${signedTl(difference)}`,
      );
    },
    onError: (error) => notify("danger", errorMessage(error, "Vardiya kapatılamadı")),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className={`${DASHBOARD_PANEL} space-y-4`}>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Açık vardiya</h3>
          <p className="text-xs text-muted-foreground">
            {formatClock(shift.openedAt)} açıldı · açılış nakdi {formatTl(shift.openingCash ?? 0)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Oturum</p>
            <p className="text-lg font-semibold tabular-nums">{shift.sessions}</p>
            <p className="text-xs text-muted-foreground">{formatTl(shift.sessionsTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kasaya giren nakit</p>
            <p className="text-lg font-semibold tabular-nums">{formatTl(shift.cashIn)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Beklenen nakit</p>
            <p className="text-lg font-semibold tabular-nums">{formatTl(shift.expectedCash)}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TotalsList title="Oturumlar" rows={shift.sessionPayments} />
          <TotalsList title="Bakiye yükleme" rows={shift.topUps} />
          <TotalsList title="Üyelik satışı" rows={shift.memberships} />
          <TotalsList title="Turnuva katılımı" rows={shift.tournamentFees} />
        </div>
        <p className="text-xs text-muted-foreground">Rakamlar şu ana kadardır ve dakikada bir yenilenir.</p>
      </div>

      <form
        className={`${DASHBOARD_PANEL} space-y-3`}
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed == null) return;
          close.mutate();
        }}
      >
        <h3 className="text-sm font-semibold text-foreground">Vardiyayı kapat</h3>
        <Field label="Sayılan nakit (₺)" htmlFor="shift-counted">
          <Input id="shift-counted" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} />
        </Field>
        <dl className="grid grid-cols-2 gap-1 text-sm">
          <dt className="text-muted-foreground">Beklenen</dt>
          <dd className="text-right tabular-nums">{formatTl(shift.expectedCash)}</dd>
          <dt className="text-muted-foreground">Fark</dt>
          <dd className={`text-right font-semibold tabular-nums ${diff != null ? differenceClass(diff) : ""}`}>
            {diff != null ? signedTl(diff) : "—"}
          </dd>
        </dl>
        <Field label="Not (isteğe bağlı)" htmlFor="shift-note">
          <Input id="shift-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="submit" variant="destructive" disabled={close.isPending || parsed == null}>
          Vardiyayı kapat
        </Button>
      </form>
    </div>
  );
}
