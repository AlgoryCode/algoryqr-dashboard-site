"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CONTROLLER_TYPES,
  DEVICE_TYPE_LABELS,
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
  onEdit?: (item: GameConsole) => void;
  onDelete?: (item: GameConsole) => void;
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
  const played = session ? livePlayedSeconds(session, fetchedAt, now) : 0;
  const left = session ? remainingSeconds(session.plannedMinutes, played) : null;
  const overdue = left != null && left <= 0;
  const soon = left != null && left > 0 && left <= 5 * 60;
  const ring = !session
    ? ""
    : overdue
      ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30"
      : session.paused
        ? "ring-2 ring-amber-400/70"
        : soon
          ? "ring-2 ring-amber-500"
          : "ring-2 ring-emerald-500/60";

  return (
    <div className={`${DASHBOARD_SURFACE} flex flex-col gap-3 p-4 ${ring}`}>
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
            !session
              ? "bg-muted text-muted-foreground"
              : session.paused
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : overdue
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          }`}
        >
          {!session ? "Boş" : session.paused ? "Duraklatıldı" : overdue ? "Süre doldu" : "Kullanımda"}
        </span>
      </div>

      {session ? (
        <div className="space-y-1 text-sm">
          {session.customerName ? <p className="font-medium text-foreground">{session.customerName}</p> : null}
          <p className="text-xs text-muted-foreground">Başlangıç {formatTime(session.startedAt)}</p>
          <div className="flex items-baseline justify-between">
            <span className="text-lg tabular-nums text-foreground">{formatStopwatch(played)}</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{formatTl(session.amount)}</span>
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

      <div className="mt-auto flex flex-wrap gap-2">
        {session ? (
          <>
            <Button type="button" size="sm" variant="destructive" disabled={working} onClick={() => handlers.onFinish(session)}>
              Bitir
            </Button>
            {session.paused ? (
              <Button type="button" size="sm" disabled={working} onClick={() => handlers.onResume(session)}>
                Devam
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => handlers.onPause(session)}>
                Duraklat
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => handlers.onItems(session)}>
              Ürün
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => handlers.onTransfer(session)}>
              {CONTROLLER_TYPES.has(item.deviceType) ? "Cihaz / kol" : "Cihaz değiştir"}
            </Button>
            {[15, 30, 60].map((minutes) => (
              <Button
                key={minutes}
                type="button"
                size="sm"
                variant="ghost"
                disabled={working}
                onClick={() => handlers.onExtend(session, minutes)}
              >
                +{minutes} dk
              </Button>
            ))}
          </>
        ) : (
          <>
            <Button type="button" size="sm" disabled={noRate} onClick={() => handlers.onStart(item)}>
              Başlat
            </Button>
            {handlers.onEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={() => handlers.onEdit?.(item)}>
                Düzenle
              </Button>
            ) : null}
            {handlers.onDelete ? (
              <Button type="button" size="sm" variant="outline" onClick={() => handlers.onDelete?.(item)}>
                Sil
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
