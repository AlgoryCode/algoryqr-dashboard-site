"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useBranchSelection } from "@/components/dashboard/BranchPicker";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  CancelSessionDialog,
  ConsoleEditorDialog,
  FinishSessionDialog,
  ItemsDialog,
  StartSessionDialog,
  TransferDialog,
} from "@/components/dashboard/console/ConsoleDialogs";
import { CustomersPanel } from "@/components/dashboard/console/CustomersPanel";
import { DeviceBoard } from "@/components/dashboard/console/DeviceBoard";
import {
  DeviceQrDialog,
  MaintenanceEndDialog,
  MaintenanceLogSection,
  MaintenanceStartDialog,
} from "@/components/dashboard/console/DeviceDialogs";
import { GamesPackagesPanel } from "@/components/dashboard/console/GamesPackagesPanel";
import { ProgramPanel } from "@/components/dashboard/console/ProgramPanel";
import { ReportPanel } from "@/components/dashboard/console/ReportPanel";
import { ReservationsPanel } from "@/components/dashboard/console/ReservationsPanel";
import { SettingsPanel } from "@/components/dashboard/console/SettingsPanel";
import { SessionDetailDialog } from "@/components/dashboard/console/SessionDetailDialog";
import { SessionHistoryList } from "@/components/dashboard/console/SessionHistoryList";
import { ShiftPanel } from "@/components/dashboard/console/ShiftPanel";
import {
  CONSOLE_TABS,
  ConsoleWorkspaceHeader,
  type ConsoleLiveStats,
  type ConsoleTab,
} from "@/components/dashboard/console/ConsoleWorkspaceHeader";
import { TournamentsPanel } from "@/components/dashboard/console/TournamentsPanel";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { ApiError } from "@/lib/api/errors";
import {
  DEVICE_TYPE_LABELS,
  addSessionItem,
  approveExtensionRequest,
  createConsole,
  deleteConsole,
  dismissExtensionRequest,
  endMaintenance,
  extendSession,
  cancelSession,
  finishSession,
  formatDuration,
  getRate,
  listActiveSessions,
  listConsoles,
  listSessionHistory,
  pauseSession,
  removeSessionItem,
  resumeSession,
  setConsoleGames,
  startMaintenance,
  startSession,
  transferSession,
  updateConsole,
  type AddItemPayload,
  type ConsolePayload,
  type ConsoleSession,
  type DeviceType,
  type FinishPayload,
  type GameConsole,
  type MaintenanceKind,
  type StartSessionPayload,
} from "@/lib/console-api";

/** Amounts come from the server; the clocks tick locally in between. */
const ACTIVE_REFRESH_MS = 30_000;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

type SessionAction =
  | { kind: "pause" | "resume"; session: ConsoleSession }
  | { kind: "extend"; session: ConsoleSession; minutes: number }
  | { kind: "transfer"; session: ConsoleSession; consoleId?: number; controllerCount?: number }
  | { kind: "addItem"; session: ConsoleSession; payload: AddItemPayload }
  | { kind: "removeItem"; session: ConsoleSession; itemId: number }
  | { kind: "approveExtension" | "dismissExtension"; session: ConsoleSession };

function runAction(action: SessionAction): Promise<ConsoleSession> {
  switch (action.kind) {
    case "pause":
      return pauseSession(action.session.id);
    case "resume":
      return resumeSession(action.session.id);
    case "extend":
      return extendSession(action.session.id, action.minutes);
    case "transfer":
      return transferSession(action.session.id, {
        consoleId: action.consoleId,
        controllerCount: action.controllerCount,
      });
    case "addItem":
      return addSessionItem(action.session.id, action.payload);
    case "removeItem":
      return removeSessionItem(action.session.id, action.itemId);
    case "approveExtension":
      return approveExtensionRequest(action.session.id);
    case "dismissExtension":
      return dismissExtensionRequest(action.session.id);
  }
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

  const [tab, setTab] = useState<ConsoleTab>(() => {
    const fromUrl = searchParams.get("tab");
    return (CONSOLE_TABS as readonly string[]).includes(fromUrl ?? "") ? (fromUrl as ConsoleTab) : "devices";
  });
  /** Keeps the section in the address, so a refresh or a shared link opens the same one. */
  const changeTab = (next: string) => {
    if (!(CONSOLE_TABS as readonly string[]).includes(next)) return;
    setTab(next as ConsoleTab);
    const url = new URL(window.location.href);
    if (next === "devices") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };
  const [typeFilter, setTypeFilter] = useState<DeviceType | "ALL">("ALL");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GameConsole | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GameConsole | null>(null);
  const [starting, setStarting] = useState<GameConsole | null>(null);
  const [finishing, setFinishing] = useState<ConsoleSession | null>(null);
  const [finished, setFinished] = useState<ConsoleSession | null>(null);
  const [cancelling, setCancelling] = useState<ConsoleSession | null>(null);
  const [transferring, setTransferring] = useState<ConsoleSession | null>(null);
  const [itemsFor, setItemsFor] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [settingsTab, setSettingsTab] = useState("rates");
  const [qrFor, setQrFor] = useState<GameConsole | null>(null);
  const [maintenanceStartFor, setMaintenanceStartFor] = useState<GameConsole | null>(null);
  const [maintenanceEndFor, setMaintenanceEndFor] = useState<GameConsole | null>(null);

  const consoles = useQuery({
    queryKey: ["console-list", branchId],
    queryFn: () => listConsoles(branchId as number),
    enabled: branchId != null,
    refetchInterval: ACTIVE_REFRESH_MS,
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
    enabled: branchId != null && tab === "history",
  });

  const activeByConsole = useMemo(() => {
    const map = new Map<number, ConsoleSession>();
    for (const session of active.data ?? []) map.set(session.consoleId, session);
    return map;
  }, [active.data]);
  const busyIds = useMemo(() => new Set(activeByConsole.keys()), [activeByConsole]);
  const itemsSession = itemsFor != null ? ((active.data ?? []).find((s) => s.id === itemsFor) ?? null) : null;
  const liveStats = useMemo<ConsoleLiveStats | null>(() => {
    if (!consoles.data) return null;
    const sessions = active.data ?? [];
    return {
      devices: consoles.data.length,
      busy: sessions.length,
      late: sessions.filter((s) => s.plannedMinutes != null && s.playedSeconds > s.plannedMinutes * 60).length,
      accrued: sessions.reduce((sum, s) => sum + Number(s.amount ?? 0), 0),
    };
  }, [consoles.data, active.data]);
  const typesInUse = useMemo(
    () => Array.from(new Set((consoles.data ?? []).map((c) => c.deviceType))),
    [consoles.data],
  );

  function invalidateAll() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["console-list"] }),
      queryClient.invalidateQueries({ queryKey: ["console-active"] }),
      queryClient.invalidateQueries({ queryKey: ["console-history"] }),
      queryClient.invalidateQueries({ queryKey: ["console-rate"] }),
      queryClient.invalidateQueries({ queryKey: ["console-report"] }),
      queryClient.invalidateQueries({ queryKey: ["device-customers"] }),
      queryClient.invalidateQueries({ queryKey: ["console-games"] }),
      queryClient.invalidateQueries({ queryKey: ["console-profitability"] }),
      queryClient.invalidateQueries({ queryKey: ["console-shift"] }),
    ]);
  }

  const saveConsole = useMutation({
    mutationFn: async ({ payload, gameIds }: { payload: ConsolePayload; gameIds: number[] }) => {
      const saved = editing ? await updateConsole(editing.id, payload) : await createConsole(branchId as number, payload);
      const before = (editing?.games ?? []).map((g) => g.id).sort((a, b) => a - b);
      const after = [...gameIds].sort((a, b) => a - b);
      if (before.join(",") !== after.join(",")) {
        return setConsoleGames(saved.id, after);
      }
      return saved;
    },
    onSuccess: async () => {
      const wasEditing = editing != null;
      setEditorOpen(false);
      setEditing(null);
      await invalidateAll();
      notify("info", wasEditing ? "Cihaz güncellendi" : "Cihaz eklendi");
    },
    onError: (error) => notify("danger", errorMessage(error, "Cihaz kaydedilemedi")),
  });
  const removeConsole = useMutation({
    mutationFn: (consoleId: number) => deleteConsole(consoleId),
    onSuccess: async () => {
      setPendingDelete(null);
      await invalidateAll();
      notify("info", "Cihaz silindi");
    },
    onError: (error) => {
      setPendingDelete(null);
      notify("danger", errorMessage(error, "Cihaz silinemedi"));
    },
  });
  const start = useMutation({
    mutationFn: ({ consoleId, payload }: { consoleId: number; payload: StartSessionPayload }) =>
      startSession(consoleId, payload),
    onSuccess: async (session) => {
      setStarting(null);
      await invalidateAll();
      notify("info", `${session.consoleName ?? "Cihaz"} oturumu başladı`);
    },
    onError: (error) => notify("danger", errorMessage(error, "Oturum başlatılamadı")),
  });
  const finish = useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: number; payload: FinishPayload }) =>
      finishSession(sessionId, payload),
    onSuccess: async (session) => {
      setFinishing(null);
      setFinished(session);
      await invalidateAll();
    },
    onError: (error) => notify("danger", errorMessage(error, "Oturum bitirilemedi")),
  });
  const cancel = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: number; reason?: string }) => cancelSession(sessionId, reason),
    onSuccess: async (session) => {
      setCancelling(null);
      await invalidateAll();
      notify("info", `${session.consoleName ?? "Cihaz"} oturumu iptal edildi`);
    },
    onError: (error) => notify("danger", errorMessage(error, "Oturum iptal edilemedi")),
  });
  const maintenance = useMutation({
    mutationFn: (
      input:
        | { kind: "start"; consoleId: number; payload: { kind: MaintenanceKind; note?: string } }
        | { kind: "end"; consoleId: number; payload: { cost?: string; note?: string } },
    ) => (input.kind === "start" ? startMaintenance(input.consoleId, input.payload) : endMaintenance(input.consoleId, input.payload)),
    onSuccess: async (device, input) => {
      setMaintenanceStartFor(null);
      setMaintenanceEndFor(null);
      await invalidateAll();
      notify("info", input.kind === "start" ? `${device.name} bakıma alındı` : `${device.name} tekrar kullanımda`);
    },
    onError: (error) => notify("danger", errorMessage(error, "Bakım durumu değiştirilemedi")),
  });
  const act = useMutation({
    mutationFn: runAction,
    onSuccess: async (_, action) => {
      if (action.kind === "transfer") setTransferring(null);
      await invalidateAll();
      if (action.kind === "extend") notify("info", `+${action.minutes} dk eklendi`);
      if (action.kind === "approveExtension") notify("info", "Uzatma isteği onaylandı");
      if (action.kind === "dismissExtension") notify("info", "Uzatma isteği reddedildi");
    },
    onError: (error) => notify("danger", errorMessage(error, "İşlem yapılamadı")),
  });

  const loyaltyText =
    rate.data?.loyaltyEveryMinutes != null && rate.data.loyaltyRewardMinutes != null
      ? `${formatDuration(rate.data.loyaltyEveryMinutes)} ücretli oyuna ${rate.data.loyaltyRewardMinutes} dk ücretsiz`
      : null;

  return (
    <div className="space-y-4">
      {branch.empty ? (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Oyun &amp; cihaz takip</h1>
          <EmptyState title="Şube yok" description="Cihaz takibi için önce bir şube oluşturun." />
        </>
      ) : branchId == null || branch.loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
          <ConsoleWorkspaceHeader
            branches={branch.branches}
            branchId={branchId}
            onBranch={(next) => {
              setHistoryPage(0);
              branch.select(next);
            }}
            stats={liveStats}
            tab={tab}
            onAddDevice={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          />

          <TabsContent value="devices" className="space-y-3">
            {typesInUse.length > 1 ? (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                <Button size="sm" className="shrink-0 rounded-full" variant={typeFilter === "ALL" ? "default" : "outline"} onClick={() => setTypeFilter("ALL")}>
                  Tümü
                </Button>
                {typesInUse.map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    className="shrink-0 rounded-full"
                    variant={typeFilter === type ? "default" : "outline"}
                    onClick={() => setTypeFilter(type)}
                  >
                    {DEVICE_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            ) : null}
            {consoles.isLoading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor…</p>
            ) : (consoles.data ?? []).length === 0 ? (
              <EmptyState
                title="Cihaz yok"
                description="Kiraladığınız konsol, PC, VR veya masaları ekleyin; ücretleri Ücret ve kurallar sekmesinden yönetin."
              />
            ) : (
              <DeviceBoard
                consoles={consoles.data ?? []}
                sessions={activeByConsole}
                fetchedAt={active.dataUpdatedAt}
                busySessionId={act.isPending ? act.variables.session.id : null}
                typeFilter={typeFilter}
                handlers={{
                  onStart: setStarting,
                  onFinish: setFinishing,
                  onPause: (session) => act.mutate({ kind: "pause", session }),
                  onResume: (session) => act.mutate({ kind: "resume", session }),
                  onExtend: (session, minutes) => act.mutate({ kind: "extend", session, minutes }),
                  onTransfer: setTransferring,
                  onItems: (session) => setItemsFor(session.id),
                  onApproveExtension: (session) => act.mutate({ kind: "approveExtension", session }),
                  onDismissExtension: (session) => act.mutate({ kind: "dismissExtension", session }),
                  onCancel: setCancelling,
                  onEdit: (item) => {
                    setEditing(item);
                    setEditorOpen(true);
                  },
                  onDelete: setPendingDelete,
                  onQr: setQrFor,
                  onMaintenanceStart: setMaintenanceStartFor,
                  onMaintenanceEnd: setMaintenanceEndFor,
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="reservations">
            <ReservationsPanel branchId={branchId} consoles={consoles.data ?? []} onChanged={invalidateAll} />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersPanel branchId={branchId} loyaltyText={loyaltyText} />
          </TabsContent>

          <TabsContent value="tournaments">
            <TournamentsPanel branchId={branchId} />
          </TabsContent>

          <TabsContent value="shift">
            <ShiftPanel branchId={branchId} />
          </TabsContent>

          <TabsContent value="history">
            <SessionHistoryList
              rows={history.data?.content ?? []}
              loading={history.isLoading}
              page={history.data?.page ?? 0}
              hasNext={history.data?.hasNext ?? false}
              onPage={setHistoryPage}
              onOpen={setFinished}
            />
          </TabsContent>

          <TabsContent value="report">
            <ReportPanel branchId={branchId} />
          </TabsContent>

          <TabsContent value="settings">
            <Tabs value={settingsTab} onValueChange={setSettingsTab}>
              <div className="no-scrollbar -mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
                <TabsList className="h-9 w-max rounded-full p-1">
                <TabsTrigger value="rates" className="rounded-full px-3 text-xs">Ücret ve kurallar</TabsTrigger>
                <TabsTrigger value="library" className="rounded-full px-3 text-xs">Oyunlar ve paketler</TabsTrigger>
                <TabsTrigger value="program" className="rounded-full px-3 text-xs">Sadakat programı</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="rates">
                <SettingsPanel branchId={branchId} onChanged={invalidateAll} />
              </TabsContent>
              <TabsContent value="library">
                <GamesPackagesPanel branchId={branchId} onChanged={invalidateAll} />
              </TabsContent>
              <TabsContent value="program">
                <ProgramPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}

      <ConsoleEditorDialog
        open={editorOpen}
        branchId={branchId ?? 0}
        console={editing}
        pending={saveConsole.isPending}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={(payload, gameIds) => saveConsole.mutate({ payload, gameIds })}
        extra={editing ? <MaintenanceLogSection device={editing} onChanged={invalidateAll} /> : null}
      />
      <DeviceQrDialog device={qrFor} onOpenChange={(open) => !open && setQrFor(null)} onRotated={invalidateAll} />
      <MaintenanceStartDialog
        device={maintenanceStartFor}
        pending={maintenance.isPending}
        onOpenChange={(open) => !open && setMaintenanceStartFor(null)}
        onSubmit={(payload) =>
          maintenanceStartFor && maintenance.mutate({ kind: "start", consoleId: maintenanceStartFor.id, payload })
        }
      />
      <MaintenanceEndDialog
        device={maintenanceEndFor}
        pending={maintenance.isPending}
        onOpenChange={(open) => !open && setMaintenanceEndFor(null)}
        onSubmit={(payload) =>
          maintenanceEndFor && maintenance.mutate({ kind: "end", consoleId: maintenanceEndFor.id, payload })
        }
      />
      <StartSessionDialog
        console={starting}
        pending={start.isPending}
        onOpenChange={(open) => !open && setStarting(null)}
        onSubmit={(payload) => starting && start.mutate({ consoleId: starting.id, payload })}
      />
      <FinishSessionDialog
        session={finishing}
        pending={finish.isPending}
        onOpenChange={(open) => !open && setFinishing(null)}
        onSubmit={(payload) => finishing && finish.mutate({ sessionId: finishing.id, payload })}
      />
      <CancelSessionDialog
        session={cancelling}
        pending={cancel.isPending}
        onOpenChange={(open) => !open && setCancelling(null)}
        onSubmit={(reason) => cancelling && cancel.mutate({ sessionId: cancelling.id, reason })}
      />
      <SessionDetailDialog
        session={finished}
        branchId={branchId}
        onOpenChange={(open) => !open && setFinished(null)}
        onChanged={setFinished}
      />
      <TransferDialog
        key={transferring?.id ?? "none"}
        session={transferring}
        consoles={consoles.data ?? []}
        busyIds={busyIds}
        pending={act.isPending}
        onOpenChange={(open) => !open && setTransferring(null)}
        onSubmit={(payload) => transferring && act.mutate({ kind: "transfer", session: transferring, ...payload })}
      />
      <ItemsDialog
        session={itemsSession}
        branchId={branchId}
        pending={act.isPending}
        onOpenChange={(open) => !open && setItemsFor(null)}
        onAdd={(payload) => itemsSession && act.mutate({ kind: "addItem", session: itemsSession, payload })}
        onRemove={(itemId) => itemsSession && act.mutate({ kind: "removeItem", session: itemsSession, itemId })}
      />
      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cihaz silinsin mi?</AlertDialogTitle>
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
