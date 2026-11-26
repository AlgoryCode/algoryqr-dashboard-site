"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, BellRing, PauseCircle, TimerOff } from "lucide-react";

import { CONSOLE_DIALOG } from "@/components/dashboard/console/console-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboardBanners } from "@/contexts/dashboard-banners";
import { useAccessProfile } from "@/hooks/use-access-profile";
import { ApiError } from "@/lib/api/errors";
import { hasScope } from "@/lib/auth-user";
import {
  extendSession,
  formatClock,
  formatDuration,
  formatTl,
  listOverdueSessions,
  resumeSession,
  type OverdueSession,
} from "@/lib/console-api";
import { DASHBOARD_ROUTES } from "@/lib/dashboard-routes";

/** The backend job flags late sessions every 2 minutes; the panel asks every minute, on focus and on each page. */
const POLL_MS = 60_000;
/** "Later" hides the warning this long; a newly late session brings it back at once. */
const SNOOZE_MS = 10 * 60_000;
const SNOOZE_KEY = "console-overdue-snooze";

type Snooze = { until: number; ids: number[] };

function readSnooze(): Snooze | null {
  try {
    const raw = window.sessionStorage.getItem(SNOOZE_KEY);
    return raw ? (JSON.parse(raw) as Snooze) : null;
  } catch {
    return null;
  }
}

function writeSnooze(snooze: Snooze) {
  try {
    window.sessionStorage.setItem(SNOOZE_KEY, JSON.stringify(snooze));
  } catch {
    // Private mode: the snooze then lasts only while the page stays open.
  }
}

function reasonText(row: OverdueSession): string {
  switch (row.reason) {
    case "PLANNED_EXCEEDED":
      return `Planlanan ${formatDuration(row.plannedMinutes ?? 0)} ${formatDuration(row.overMinutes)} aşıldı`;
    case "OPEN_TOO_LONG":
      return `Süresiz oturum ${formatDuration(Math.floor(row.playedSeconds / 60))}dir açık`;
    case "PAUSED_TOO_LONG":
      return `${formatDuration(row.overMinutes)}dir duraklatılmış`;
  }
}

function ReasonIcon({ reason }: { reason: OverdueSession["reason"] }) {
  const Icon = reason === "PAUSED_TOO_LONG" ? PauseCircle : reason === "OPEN_TOO_LONG" ? AlarmClock : TimerOff;
  return <Icon className="h-5 w-5" aria-hidden />;
}

/**
 * Keeps warning the owner, on every panel page, about device sessions that ran past their time or were left
 * paused, until each is finished, cancelled, extended or resumed. Also raises a desktop notification for a newly
 * late session when the tab is in the background and notifications are allowed.
 */
export function OverdueSessionsAlert() {
  const { data: profile } = useAccessProfile();
  const enabled = hasScope(profile, "CONSOLE_RENTAL_OWNER");
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { notify } = useDashboardBanners();

  const overdue = useQuery({
    queryKey: ["console-overdue"],
    queryFn: listOverdueSessions,
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Every page change asks again, so the warning is there as soon as the owner opens any screen.
  useEffect(() => {
    if (enabled) void queryClient.invalidateQueries({ queryKey: ["console-overdue"] });
  }, [pathname, enabled, queryClient]);

  const rows = useMemo(() => overdue.data ?? [], [overdue.data]);
  const ids = useMemo(() => rows.map((row) => row.sessionId), [rows]);

  // Read lazily: nothing here is rendered before the first answer arrives, so the server render never differs.
  const [snooze, setSnooze] = useState<Snooze | null>(() => (typeof window === "undefined" ? null : readSnooze()));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const snoozed = snooze != null && snooze.until > now && ids.every((id) => snooze.ids.includes(id));
  const open = rows.length > 0 && !snoozed;

  // Desktop notification for sessions not seen before, when the panel is in a background tab.
  const seen = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!overdue.isSuccess) return;
    const fresh = rows.filter((row) => seen.current != null && !seen.current.has(row.sessionId));
    seen.current = new Set(ids);
    if (fresh.length === 0 || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted" || !document.hidden) return;
    try {
      const first = fresh[0];
      new Notification("Süresi aşılan cihaz oturumu", {
        body:
          fresh.length === 1
            ? `${first.consoleName ?? "Cihaz"}${first.branchName ? ` · ${first.branchName}` : ""}: ${reasonText(first)}`
            : `${fresh.length} oturum süresini aştı`,
        tag: "console-overdue",
      });
    } catch {
      // Some browsers only allow notifications from a service worker; the popup still shows.
    }
  }, [overdue.isSuccess, rows, ids]);

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const act = useMutation({
    mutationFn: (input: { row: OverdueSession; kind: "extend" | "resume" }) =>
      input.kind === "extend" ? extendSession(input.row.sessionId, 30) : resumeSession(input.row.sessionId),
    onSuccess: (_session, input) => {
      notify("info", input.kind === "extend" ? `${input.row.consoleName ?? "Cihaz"}: 30 dk eklendi` : "Oturum devam ediyor");
      void queryClient.invalidateQueries({ queryKey: ["console-overdue"] });
      void queryClient.invalidateQueries({ queryKey: ["console-active"] });
    },
    onError: (error) => notify("danger", error instanceof ApiError ? error.message : "İşlem yapılamadı"),
  });

  const later = () => {
    const next = { until: Date.now() + SNOOZE_MS, ids };
    writeSnooze(next);
    setSnooze(next);
    setNow(Date.now());
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && later()}>
      <DialogContent className={`${CONSOLE_DIALOG} sm:max-w-lg`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <BellRing className="h-5 w-5" aria-hidden />
            </span>
            {rows.length === 1 ? "Süresi aşılan oturum var" : `${rows.length} oturum süresini aştı`}
          </DialogTitle>
          <DialogDescription>
            Açık unutulan oturum ücret biriktirmeye devam eder. Bitirin, iptal edin ya da süre ekleyin; uyarı o zamana
            kadar her sayfada tekrar çıkar.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {rows.map((row) => {
            const href = `${DASHBOARD_ROUTES.consoleRental}?branch=${row.branchId}`;
            return (
              <li key={row.sessionId} className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-destructive">
                    <ReasonIcon reason={row.reason} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {row.consoleName ?? `Cihaz #${row.consoleId}`}
                      {row.branchName ? <span className="font-normal text-muted-foreground"> · {row.branchName}</span> : null}
                    </p>
                    <p className="text-sm font-medium text-destructive">{reasonText(row)}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.customerName ? `${row.customerName} · ` : ""}
                      {formatClock(row.startedAt)} başladı · şu an {formatTl(row.currentAmount)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {row.reason === "PAUSED_TOO_LONG" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ row, kind: "resume" })}
                    >
                      Devam ettir
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ row, kind: "extend" })}
                    >
                      +30 dk ekle
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link href={href} onClick={later}>
                      Bitir / iptal et
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="gap-2 sm:justify-between">
          {permission === "default" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void Notification.requestPermission().then(setPermission);
              }}
            >
              Masaüstü bildirimlerini aç
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" onClick={later}>
            10 dk sonra hatırlat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
