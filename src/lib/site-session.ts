"use client";

import axios from "axios";

import { recordFlow } from "@/lib/flow-log";
import { clearPackageAccess, loadPackageAccess } from "@/lib/load-package-access";

/**
 * The one place the dashboard refreshes, ends, or logs out of the site session.
 *
 * - `refreshSession` is single-flight: concurrent callers (axios 401 retries, polling, the
 *   proactive timer, settings buttons) share one `/api/auth/refresh` request.
 * - Once the session has ended, nothing refreshes again until the page reloads, so pollers
 *   cannot keep hammering `/auth/refresh` with a dead token.
 * - Ending the session in one tab ends it in every open tab.
 */

const LOGIN_PATH = "/login";
const STORED_USER_KEY = "algory_user";
const CHANNEL_NAME = "algoryqr:site-session";

export type SessionEndReason = "expired" | "logout" | "email-not-verified" | "other-tab";

export type RefreshResult =
  | { ok: true; accessTokenExpiresAt: number | null }
  | { ok: false; status: number };

type ChannelMessage = { type: "ended"; reason: SessionEndReason };

let ended = false;
let inflight: Promise<RefreshResult> | null = null;
let channel: BroadcastChannel | null | undefined;
const endListeners = new Set<(reason: SessionEndReason) => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function onLoginPage(): boolean {
  return isBrowser() && window.location.pathname === LOGIN_PATH;
}

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  if (!isBrowser() || typeof BroadcastChannel === "undefined") {
    channel = null;
    return channel;
  }
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
    if (event.data?.type === "ended") {
      void endSession("other-tab", { notifyOtherTabs: false, callServer: false });
    }
  };
  return channel;
}

/** Subscribe to the session ending (e.g. to stop polling). Returns an unsubscribe function. */
export function onSessionEnd(listener: (reason: SessionEndReason) => void): () => void {
  getChannel();
  endListeners.add(listener);
  return () => {
    endListeners.delete(listener);
  };
}

export function isSessionEnded(): boolean {
  return ended;
}

function clearLocalSessionState() {
  clearPackageAccess();
  try {
    localStorage.removeItem(STORED_USER_KEY);
  } catch {
    // storage blocked: nothing to clear
  }
}

async function callServerLogout() {
  await axios
    .post("/api/auth/logout", {}, { withCredentials: true, validateStatus: () => true })
    .catch(() => undefined);
}

function loginUrl(reason: SessionEndReason): string {
  if (reason === "email-not-verified") return `${LOGIN_PATH}?verify=1`;
  return LOGIN_PATH;
}

/**
 * Ends the session everywhere: clears local state, revokes it on the server, tells other tabs,
 * and does a full navigation to /login so no in-memory query cache or poller survives.
 */
export async function endSession(
  reason: SessionEndReason,
  options: { notifyOtherTabs?: boolean; callServer?: boolean } = {},
): Promise<void> {
  if (!isBrowser()) return;
  const { notifyOtherTabs = true, callServer = true } = options;
  // Already on the login page: just clean up, never reload it (that would loop).
  const leaving = !onLoginPage();
  if (ended && leaving) return;
  if (leaving) ended = true;

  clearLocalSessionState();
  for (const listener of endListeners) {
    try {
      listener(reason);
    } catch {
      // a listener failing must not block logout
    }
  }
  if (callServer) await callServerLogout();
  if (notifyOtherTabs) getChannel()?.postMessage({ type: "ended", reason } satisfies ChannelMessage);
  if (leaving) window.location.replace(loginUrl(reason));
}

/** User-initiated logout. */
export function logout(): Promise<void> {
  return endSession("logout");
}

/**
 * Drops a half-finished login (e.g. cancelling 2FA) without leaving the login page or
 * signing other tabs out.
 */
export async function discardPendingLogin(): Promise<void> {
  clearPackageAccess();
  await callServerLogout();
}

async function requestRefresh(): Promise<RefreshResult> {
  try {
    const response = await axios.post<{ accessTokenExpiresAt?: number | null }>(
      "/api/auth/refresh",
      {},
      { withCredentials: true, validateStatus: (status) => status < 500 },
    );
    recordFlow({
      scope: "api",
      method: "POST",
      path: "/api/auth/refresh",
      status: response.status,
      body: response.data,
    });
    if (response.status >= 200 && response.status < 300) {
      void loadPackageAccess(true);
      return { ok: true, accessTokenExpiresAt: response.data?.accessTokenExpiresAt ?? null };
    }
    if (response.status === 401) {
      await endSession("expired");
    }
    return { ok: false, status: response.status };
  } catch {
    // network error or 5xx: keep the session, the caller may retry later
    return { ok: false, status: 0 };
  }
}

/**
 * Refreshes the access token. Concurrent calls share one request; after the session has ended
 * it resolves to `{ ok: false }` without touching the network.
 */
export function refreshSession(): Promise<RefreshResult> {
  if (!isBrowser() || ended) return Promise.resolve({ ok: false, status: 401 });
  getChannel();
  if (!inflight) {
    inflight = requestRefresh().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
