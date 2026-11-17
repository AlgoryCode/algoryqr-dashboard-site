"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Announcement = {
  id: number;
  title: string;
  body: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: "INFO" | "SUCCESS" | "WARNING";
  dismissible: boolean;
  updatedAt: string;
};

const DISMISS_KEY = "algory-dismissed-announcements";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Dismissal is per announcement version, so an edited announcement shows again. */
function dismissKey(a: Announcement) {
  return `${a.id}:${a.updatedAt}`;
}

function readDismissed(): string {
  try {
    return localStorage.getItem(DISMISS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function dismiss(a: Announcement) {
  try {
    const list: string[] = JSON.parse(readDismissed());
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...list, dismissKey(a)].slice(-50)));
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
}

const TONE = {
  INFO: { icon: Info, className: "border-sky-500/20 bg-sky-500/10 text-sky-900 dark:text-sky-200" },
  SUCCESS: { icon: Sparkles, className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" },
  WARNING: { icon: AlertTriangle, className: "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200" },
} as const;

/** Banners published from the admin panel ("İçerik → Duyurular"). */
export function PlatformAnnouncements() {
  const { data } = useQuery({
    queryKey: ["platform-announcements"],
    queryFn: async (): Promise<Announcement[]> => {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      if (!res.ok) return [];
      const body = await res.json();
      return Array.isArray(body) ? body : [];
    },
    staleTime: 5 * 60_000,
  });
  const dismissedRaw = useSyncExternalStore(subscribe, readDismissed, () => "[]");

  let dismissed: string[] = [];
  try {
    dismissed = JSON.parse(dismissedRaw);
  } catch {
    dismissed = [];
  }
  const visible = (data ?? []).filter((a) => !a.dismissible || !dismissed.includes(dismissKey(a)));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((a) => {
        const tone = TONE[a.tone] ?? TONE.INFO;
        const Icon = tone.icon;
        const external = a.linkUrl?.startsWith("https://");
        return (
          <div
            key={a.id}
            role="status"
            className={cn("flex items-center gap-3 border-b px-4 py-2 text-sm sm:px-6", tone.className)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{a.title}</span>
              {a.body ? <span className="ml-1.5 opacity-90">{a.body}</span> : null}
            </span>
            {a.linkUrl ? (
              external ? (
                <a
                  href={a.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
                >
                  {a.linkLabel || "Detay"}
                </a>
              ) : (
                <Link href={a.linkUrl} className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline">
                  {a.linkLabel || "Detay"}
                </Link>
              )
            ) : null}
            {a.dismissible ? (
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => dismiss(a)}
                className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
