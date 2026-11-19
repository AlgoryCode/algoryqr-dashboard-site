"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BranchPicker, useBranchSelection } from "@/components/dashboard/BranchPicker";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  ConsoleEditorDialog,
  FinishedSessionDialog,
  StartSessionDialog,
} from "@/components/dashboard/console/ConsoleDialogs";
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
import { Input } from "@/components/ui/input";
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
import {
  createConsole,
  deleteConsole,
  finishSession,
  formatClock,
  formatDuration,
  formatTl,
  getRate,
  listActiveSessions,
  listConsoles,
  listSessionHistory,
  parseRateInput,
  startSession,
  updateConsole,
  updateRate,
  type ConsolePayload,
  type ConsoleSession,
  type GameConsole,
  type StartSessionPayload,
} from "@/lib/console-api";
import { DASHBOARD_PANEL, DASHBOARD_SURFACE } from "@/lib/dashboard-surface";

/** Running totals come from the server; refresh them often enough that the minute counter feels live. */
const ACTIVE_REFRESH_MS = 30_000;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function ConsoleRentalView() {
  const searchParams = useSearchParams();
  const initialBranchId = useMemo(() => {
    const raw = Number(searchParams.get("branch"));
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }, [searchParams]);
  const branch = useBranchSelection(initialBranchId);
  const branchId = branch.branchId;
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GameConsole | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GameConsole | null>(null);
  const [starting, setStarting] = useState<GameConsole | null>(null);
  const [finished, setFinished] = useState<ConsoleSession | null>(null);
  const [historyPage, setHistoryPage] = useState(0);

  const consoles = useQuery({
    queryKey: ["console-list", branchId],
    queryFn: () => listConsoles(branchId as number),
    enabled: branchId != null,
  });
  const rate = useQuery({
    queryKey: ["console-rate", branchId],
    queryFn: () => getRate(branchId as number),
    enabled: branchId != null,
  });
  const active = useQuery({
    queryKey: ["console-active", branchId],
    queryFn: () => listActiveSessions(branchId as number),
    enabled: branchId != null,
    refetchInterval: ACTIVE_REFRESH_MS,
  });
  const history = useQuery({
    queryKey: ["console-history", branchId, historyPage],
    queryFn: () => listSessionHistory(branchId as number, historyPage),
    enabled: branchId != null,
  });

  const activeByConsole = useMemo(() => {
    const map = new Map<number, ConsoleSession>();
    for (const session of active.data ?? []) map.set(session.consoleId, session);
    return map;
  }, [active.data]);

  function invalidateAll() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["console-list"] }),
      queryClient.invalidateQueries({ queryKey: ["console-active"] }),
      queryClient.invalidateQueries({ queryKey: ["console-history"] }),
      queryClient.invalidateQueries({ queryKey: ["console-rate"] }),
    ]);
  }

  const saveConsole = useMutation({
    mutationFn: (payload: ConsolePayload) =>
      editing ? updateConsole(editing.id, payload) : createConsole(branchId as number, payload),
    onSuccess: async () => {
      const wasEditing = editing != null;
      setEditorOpen(false);
      setEditing(null);
      await invalidateAll();
      notify("info", wasEditing ? "Konsol güncellendi" : "Konsol eklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Konsol kaydedilemedi")),
  });
  const removeConsole = useMutation({
    mutationFn: (consoleId: number) => deleteConsole(consoleId),
    onSuccess: async () => {
      setPendingDelete(null);
      await invalidateAll();
      notify("info", "Konsol silindi");
    },
    onError: (error) => {
      setPendingDelete(null);
      notify("danger", errorMessage(error, "Konsol silinemedi"));
    },
  });
  const saveRate = useMutation({
    mutationFn: (value: string | null) => updateRate(branchId as number, value),
    onSuccess: async () => {
      await invalidateAll();
      notify("info", "Şube saatlik ücreti kaydedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Ücret kaydedilemedi")),
  });
  const start = useMutation({
    mutationFn: ({ consoleId, payload }: { consoleId: number; payload: StartSessionPayload }) =>
      startSession(consoleId, payload),
    onSuccess: async (session) => {
      setStarting(null);
      await invalidateAll();
      notify("info", `${session.consoleName ?? "Konsol"} oturumu başladı`);
    },
    onError: (error) => notify("danger", errorMessage(error, "Oturum başlatılamadı")),
  });
  const finish = useMutation({
    mutationFn: (sessionId: number) => finishSession(sessionId),
    onSuccess: async (session) => {
      setFinished(session);
      await invalidateAll();
    },
    onError: (error) => notify("danger", errorMessage(error, "Oturum bitirilemedi")),
  });

  return (
    <div className="space-y-4">
      <DashboardPageHeader
        title="Konsol takip"
        hint="Saatlik konsol kiralama: oturum başlat, bitir, tutarı gör."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            disabled={branchId == null}
          >
            Konsol ekle
          </Button>
        }
      />
      <div className={`${DASHBOARD_PANEL} flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
        <BranchPicker
          branches={branch.branches}
          selectedBranchId={branchId}
          onSelect={(next) => {
            setHistoryPage(0);
            branch.select(next);
          }}
        />
        {branchId != null ? (
          <BranchRateForm
            key={`${branchId}-${rate.data?.defaultHourlyRate ?? ""}`}
            initial={rate.data?.defaultHourlyRate ?? null}
            pending={saveRate.isPending}
            onSave={(value) => saveRate.mutate(value)}
          />
        ) : null}
      </div>

      {branch.empty ? (
        <EmptyState title="Şube yok" description="Konsol takibi için önce bir şube oluşturun." />
      ) : consoles.isLoading || branch.loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : (consoles.data ?? []).length === 0 ? (
        <EmptyState
          title="Konsol yok"
          description="Kiraladığınız konsolları veya masaları ekleyin; her birine ayrı saatlik ücret verebilirsiniz."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(consoles.data ?? []).map((item) => (
            <ConsoleCard
              key={item.id}
              item={item}
              session={activeByConsole.get(item.id) ?? null}
              finishing={finish.isPending && finish.variables === activeByConsole.get(item.id)?.id}
              onStart={() => setStarting(item)}
              onFinish={(sessionId) => finish.mutate(sessionId)}
              onEdit={() => {
                setEditing(item);
                setEditorOpen(true);
              }}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      )}

      {branchId != null ? (
        <HistoryTable
          rows={history.data?.content ?? []}
          loading={history.isLoading}
          page={history.data?.page ?? 0}
          hasNext={history.data?.hasNext ?? false}
          onPage={setHistoryPage}
        />
      ) : null}

      <ConsoleEditorDialog
        open={editorOpen}
        console={editing}
        pending={saveConsole.isPending}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={(payload) => saveConsole.mutate(payload)}
      />
      <StartSessionDialog
        console={starting}
        pending={start.isPending}
        onOpenChange={(open) => !open && setStarting(null)}
        onSubmit={(payload) => starting && start.mutate({ consoleId: starting.id, payload })}
      />
      <FinishedSessionDialog session={finished} onOpenChange={(open) => !open && setFinished(null)} />
      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konsol silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} listeden kalkar. Geçmiş oturumlar raporda kalır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && removeConsole.mutate(pendingDelete.id)}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BranchRateForm({
  initial,
  pending,
  onSave,
}: {
  initial: number | string | null;
  pending: boolean;
  onSave: (value: string | null) => void;
}) {
  const [value, setValue] = useState(initial != null ? String(initial).replace(".", ",") : "");
  const parsed = parseRateInput(value);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parsed === undefined) return;
    onSave(parsed);
  }

  return (
    <form className="flex items-end gap-2" onSubmit={submit}>
      <label className="space-y-1 text-sm">
        <span className="block text-muted-foreground">Şube saatlik ücreti (₺)</span>
        <Input
          className="w-36"
          inputMode="decimal"
          value={value}
          placeholder="Ör. 120"
          aria-invalid={parsed === undefined}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <Button type="submit" variant="outline" disabled={pending || parsed === undefined}>
        Kaydet
      </Button>
    </form>
  );
}

function ConsoleCard({
  item,
  session,
  finishing,
  onStart,
  onFinish,
  onEdit,
  onDelete,
}: {
  item: GameConsole;
  session: ConsoleSession | null;
  finishing: boolean;
  onStart: () => void;
  onFinish: (sessionId: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const noRate = item.effectiveHourlyRate == null;
  return (
    <div
      className={`${DASHBOARD_SURFACE} flex flex-col gap-3 p-4 ${session ? "ring-2 ring-emerald-500/60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {noRate
              ? "Ücret tanımlı değil"
              : `${formatTl(item.effectiveHourlyRate)} / saat${item.hourlyRate == null ? " (şube)" : ""}`}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            session
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {session ? "Kullanımda" : "Boş"}
        </span>
      </div>

      {session ? (
        <div className="space-y-1 text-sm">
          {session.customerName ? <p className="text-foreground">{session.customerName}</p> : null}
          <p className="text-muted-foreground">Başlangıç: {formatClock(session.startedAt)}</p>
          <div className="flex items-baseline justify-between">
            <span className="tabular-nums text-foreground">{formatDuration(session.durationMinutes)}</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{formatTl(session.amount)}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        {session ? (
          <Button type="button" variant="destructive" disabled={finishing} onClick={() => onFinish(session.id)}>
            {finishing ? "Bitiriliyor…" : "Bitir"}
          </Button>
        ) : (
          <Button type="button" disabled={noRate} onClick={onStart}>
            Başlat
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Düzenle
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={session != null} onClick={onDelete}>
          Sil
        </Button>
      </div>
    </div>
  );
}

function HistoryTable({
  rows,
  loading,
  page,
  hasNext,
  onPage,
}: {
  rows: ConsoleSession[];
  loading: boolean;
  page: number;
  hasNext: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className={DASHBOARD_PANEL}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">Geçmiş oturumlar</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz biten oturum yok.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Konsol</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Bitiş</TableHead>
                <TableHead className="text-right">Süre</TableHead>
                <TableHead className="text-right">Ücret / saat</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.consoleName ?? `#${row.consoleId}`}</TableCell>
                  <TableCell>{row.customerName ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{formatClock(row.startedAt)}</TableCell>
                  <TableCell className="tabular-nums">{formatClock(row.endedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDuration(row.durationMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatTl(row.hourlyRate)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatTl(row.amount)}</TableCell>
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
        </>
      )}
    </div>
  );
}
