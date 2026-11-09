"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  MAX_PINNED,
  movePinnedId,
  pushRecentId,
  togglePinnedId,
} from "@/lib/dashboard-nav-prefs";

const PINNED_KEY = "algory-dashboard-nav-pinned";
const RECENT_KEY = "algory-dashboard-nav-recent";
const GROUPS_KEY = "algory-dashboard-nav-groups";

type NavPrefs = {
  pinned: string[];
  recent: string[];
  groups: Record<string, boolean>;
};

const EMPTY: NavPrefs = { pinned: [], recent: [], groups: {} };
const listeners = new Set<() => void>();
let snapshot: NavPrefs | null = null;

function readJson<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");
const isBoolRecord = (value: unknown): value is Record<string, boolean> =>
  value != null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every((entry) => typeof entry === "boolean");

function load(): NavPrefs {
  return {
    pinned: readJson(PINNED_KEY, [], isStringList).slice(0, MAX_PINNED),
    recent: readJson(RECENT_KEY, [], isStringList),
    groups: readJson(GROUPS_KEY, {}, isBoolRecord),
  };
}

function getSnapshot(): NavPrefs {
  if (snapshot == null) snapshot = load();
  return snapshot;
}

function getServerSnapshot(): NavPrefs {
  return EMPTY;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === PINNED_KEY || event.key === RECENT_KEY || event.key === GROUPS_KEY) {
      snapshot = load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(patch: Partial<NavPrefs>) {
  const next = { ...getSnapshot(), ...patch };
  snapshot = next;
  try {
    if (patch.pinned) window.localStorage.setItem(PINNED_KEY, JSON.stringify(next.pinned));
    if (patch.recent) window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.recent));
    if (patch.groups) window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next.groups));
  } catch {
    /* tarayıcı depolaması kapalı olabilir; tercih yalnızca bu oturumda kalır */
  }
  emit();
}

/**
 * Sidebar tercihleri: sabitlenen sayfalar, son ziyaret edilenler ve grup açık/kapalı durumu.
 * Tarayıcıda saklanır, tüm bileşenler arasında anında eşitlenir.
 */
export function useDashboardNavPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePinned = useCallback((id: string) => {
    update({ pinned: togglePinnedId(getSnapshot().pinned, id) });
  }, []);
  const movePinned = useCallback((id: string, direction: -1 | 1) => {
    update({ pinned: movePinnedId(getSnapshot().pinned, id, direction) });
  }, []);
  const recordVisit = useCallback((id: string) => {
    const current = getSnapshot().recent;
    if (current[0] === id) return;
    update({ recent: pushRecentId(current, id) });
  }, []);
  const setGroupOpen = useCallback((groupId: string, open: boolean) => {
    update({ groups: { ...getSnapshot().groups, [groupId]: open } });
  }, []);

  return {
    pinned: prefs.pinned,
    recent: prefs.recent,
    groups: prefs.groups,
    canPinMore: prefs.pinned.length < MAX_PINNED,
    togglePinned,
    movePinned,
    recordVisit,
    setGroupOpen,
  };
}
