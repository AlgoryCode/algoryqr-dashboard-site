"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONTROLLER_TYPES,
  DEVICE_TYPE_LABELS,
  formatClock,
  formatRemaining,
  formatStopwatch,
  formatTime,
  formatTl,
  livePlayedSeconds,
  remainingSeconds,
  type ConsoleSession,
  type DeviceType,
  type GameConsole,
} from "@/lib/console-api";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";

const TYPE_ICONS: Record<DeviceType, string> = {
  PLAYSTATION: "🎮",
  XBOX: "🎮",
  NINTENDO: "🕹️",
  PC: "🖥️",
  VR: "🥽",
  SIMULATOR: "🏎️",
  BILLIARDS: "🎱",
  OTHER: "⏱️",
};

/** Ticks once a second so running clocks move between server refreshes. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** A short two-tone beep; silent where audio is not allowed yet. */
function beep() {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [0, 0.25].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = index === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.23);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Audio is a nicety; the red card is the real warning.
  }
}

export type DeviceBoardHandlers = {
  onStart: (item: GameConsole) => void;
  onFinish: (session: ConsoleSession) => void;
  onPause: (session: ConsoleSession) => void;
  onResume: (session: ConsoleSession) => void;
  onExtend: (session: ConsoleSession, minutes: number) => void;
  onTransfer: (session: ConsoleSession) => void;
  onItems: (session: ConsoleSession) => void;
  onApproveExtension: (session: ConsoleSession) => void;
  onDismissExtension: (session: ConsoleSession) => void;
  onEdit?: (item: GameConsole) => void;
  onDelete?: (item: GameConsole) => void;
  onQr?: (item: GameConsole) => void;
  onMaintenanceStart?: (item: GameConsole) => void;
  onMaintenanceEnd?: (item: GameConsole) => void;
};

export function DeviceBoard({
  consoles,
  sessions,
  fetchedAt,
  busySessionId,
  typeFilter,
  handlers,
}: {
  consoles: GameConsole[];
  sessions: Map<number, ConsoleSession>;
  fetchedAt: number;
  busySessionId: number | null;
  typeFilter: DeviceType | "ALL";
  handlers: DeviceBoardHandlers;
}) {
  const now = useNow();
  const alerted = useRef(new Set<number>());

  // Beep once per session when its planned time runs out.
  useEffect(() => {
    for (const session of sessions.values()) {
      const left = remainingSeconds(session.plannedMinutes, livePlayedSeconds(session, fetchedAt, now));
      if (left != null && left <= 0 && !alerted.current.has(session.id)) {
        alerted.current.add(session.id);
        beep();
      }
      if (left != null && left > 0) {
        // Extended after the alarm: warn again when the new time runs out.
        alerted.current.delete(session.id);
      }
    }
  }, [sessions, fetchedAt, now]);

  const visible = consoles.filter((c) => typeFilter === "ALL" || c.deviceType === typeFilter);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map((item) => (
        <DeviceCard
          key={item.id}
          item={item}
          session={sessions.get(item.id) ?? null}
          fetchedAt={fetchedAt}
          now={now}
          working={busySessionId != null && sessions.get(item.id)?.id === busySessionId}
          handlers={handlers}
        />
      ))}
    </div>
  );
}

function DeviceCard({
  item,
  session,
  fetchedAt,
  now,
  working,
  handlers,
}: {
  item: GameConsole;
  session: ConsoleSession | null;
  fetchedAt: number;
  now: number;
  working: boolean;
  handlers: DeviceBoardHandlers;
}) {
  const noRate = item.effectiveHourlyRate == null;
  const inMaintenance = item.maintenance && !session;
  const extensionMinutes = session?.extensionRequestMinutes ?? null;
  const played = session ? livePlayedSeconds(session, fetchedAt, now) : 0;
  const left = session ? remainingSeconds(session.plannedMinutes, played) : null;
  const overdue = left != null && left <= 0;
  const soon = left != null && left > 0 && left <= 5 * 60;
  const ring = inMaintenance
    ? "bg-muted/60 opacity-80"
    : !session
    ? ""
    : overdue
      ? "ring-1 ring-red-500 bg-red-50/60 dark:bg-red-950/20"
      : session.paused
        ? "ring-1 ring-amber-400"
        : soon
          ? "ring-1 ring-amber-500"
          : "ring-1 ring-emerald-500/50";

  return (
    <div className={`${DASHBOARD_SURFACE} flex min-w-0 flex-col gap-3 p-4 ${ring}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            <span aria-hidden className="mr-1">
              {TYPE_ICONS[item.deviceType]}
            </span>
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {DEVICE_TYPE_LABELS[item.deviceType]} ·{" "}
            {noRate ? "Ücret tanımlı değil" : `${formatTl(session?.hourlyRate ?? item.effectiveHourlyRate)} / saat`}
            {session && session.controllerCount > 2 ? ` · ${session.controllerCount} kol` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            inMaintenance
              ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              : !session
              ? "bg-muted text-muted-foreground"
              : session.paused
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : overdue
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          }`}
        >
          {inMaintenance ? "Bakımda" : !session ? "Boş" : session.paused ? "Duraklatıldı" : overdue ? "Süre doldu" : "Kullanımda"}
        </span>
      </div>

      {extensionMinutes != null && session ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-violet-50 px-3 py-2 text-xs dark:bg-violet-950/30">
          <p className="min-w-0 font-medium text-violet-900 dark:text-violet-200">QR: +{extensionMinutes} dk istendi</p>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              className="h-7 px-2"
              disabled={working}
              onClick={() => handlers.onApproveExtension(session)}
            >
              Onayla
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              disabled={working}
              onClick={() => handlers.onDismissExtension(session)}
            >
              Reddet
            </Button>
          </div>
        </div>
      ) : null}

      {inMaintenance ? (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {item.maintenanceNote ? <p className="text-sm text-foreground">{item.maintenanceNote}</p> : null}
          {item.maintenanceSince ? <p>{formatClock(item.maintenanceSince)} beri</p> : null}
        </div>
      ) : session ? (
        <div className="space-y-1 text-sm">
          <p className="truncate text-xs text-muted-foreground">
            {session.customerName ? <span className="font-medium text-foreground">{session.customerName} · </span> : null}
            {formatTime(session.startedAt)}&apos;de başladı
          </p>
          {session.packageName || session.gameName ? (
            <p className="truncate text-xs text-muted-foreground">
              {[session.packageName ? `Paket: ${session.packageName}` : null, session.gameName]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-xl font-medium tabular-nums text-foreground">{formatStopwatch(played)}</span>
            <span className="text-xl font-semibold tabular-nums text-foreground">{formatTl(session.amount)}</span>
          </div>
          {left != null ? (
            <p className={`text-xs font-medium tabular-nums ${overdue ? "text-red-600" : soon ? "text-amber-600" : "text-muted-foreground"}`}>
              {formatRemaining(left)}
            </p>
          ) : null}
          {session.items.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {session.items.reduce((sum, i) => sum + i.quantity, 0)} ürün · {formatTl(session.itemsAmount)}
            </p>
          ) : null}
        </div>
      ) : item.nextReservation ? (
        <p className="text-xs text-muted-foreground">
          Rezervasyon {formatTime(item.nextReservation.startsAt)} · {item.nextReservation.customerName}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2">
        {session ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="flex-1"
              disabled={working}
              onClick={() => handlers.onFinish(session)}
            >
              Bitir
            </Button>
            {session.paused ? (
              <Button type="button" size="sm" className="flex-1" disabled={working} onClick={() => handlers.onResume(session)}>
                Devam
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={working}
                onClick={() => handlers.onPause(session)}
              >
                Duraklat
              </Button>
            )}
            <MoreMenu disabled={working}>
              <DropdownMenuItem onSelect={() => handlers.onItems(session)}>Ürün ekle</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handlers.onTransfer(session)}>
                {CONTROLLER_TYPES.has(item.deviceType) ? "Cihaz / kol değiştir" : "Cihaz değiştir"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Süre ekle</DropdownMenuLabel>
              {[15, 30, 60].map((minutes) => (
                <DropdownMenuItem key={minutes} onSelect={() => handlers.onExtend(session, minutes)}>
                  +{minutes} dk
                </DropdownMenuItem>
              ))}
            </MoreMenu>
          </>
        ) : inMaintenance ? (
          <>
            {handlers.onMaintenanceEnd ? (
              <Button type="button" size="sm" className="flex-1" onClick={() => handlers.onMaintenanceEnd?.(item)}>
                Bakımı bitir
              </Button>
            ) : null}
            {handlers.onEdit ? (
              <MoreMenu>
                <DropdownMenuItem onSelect={() => handlers.onEdit?.(item)}>Düzenle</DropdownMenuItem>
              </MoreMenu>
            ) : null}
          </>
        ) : (
          <>
            <Button type="button" size="sm" className="flex-1" disabled={noRate} onClick={() => handlers.onStart(item)}>
              Başlat
            </Button>
            {handlers.onQr || handlers.onMaintenanceStart || handlers.onEdit || handlers.onDelete ? (
              <MoreMenu>
                {handlers.onQr ? <DropdownMenuItem onSelect={() => handlers.onQr?.(item)}>QR kodu</DropdownMenuItem> : null}
                {handlers.onMaintenanceStart ? (
                  <DropdownMenuItem onSelect={() => handlers.onMaintenanceStart?.(item)}>Bakıma al</DropdownMenuItem>
                ) : null}
                {handlers.onEdit ? <DropdownMenuItem onSelect={() => handlers.onEdit?.(item)}>Düzenle</DropdownMenuItem> : null}
                {handlers.onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => handlers.onDelete?.(item)}
                    >
                      Sil
                    </DropdownMenuItem>
                  </>
                ) : null}
              </MoreMenu>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function MoreMenu({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="px-2" disabled={disabled} aria-label="Diğer işlemler">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
