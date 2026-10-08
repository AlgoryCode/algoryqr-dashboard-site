"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  clearFlowLog,
  clientFlowLogEnabled,
  getFlowLogEntries,
  getServerFlowSnapshot,
  hydrateFlowLog,
  ingestServerFlow,
  recordFlow,
  subscribeFlowLog,
  type FlowEntry,
} from "@/lib/flow-log";

let fetchPatched = false;

export function FlowLogDock() {
  const [open, setOpen] = useState(false);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const entries = useSyncExternalStore(subscribeFlowLog, getFlowLogEntries, getServerFlowSnapshot);

  useEffect(() => {
    const active = clientFlowLogEnabled();
    setEnabled(active);
    if (!active) return;
    hydrateFlowLog();
    installFetchLog();
    let stop = false;
    const pull = () => {
      void fetch("/api/flow-log", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { entries?: FlowEntry[] } | null) => {
          if (!stop && body?.entries) ingestServerFlow(body.entries);
        })
        .catch(() => undefined);
    };
    pull();
    const timer = window.setInterval(pull, 1000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!enabled) return null;

  const visible = problemsOnly ? entries.filter((entry) => entry.level !== "ok") : entries;
  const bugs = entries.filter((entry) => entry.level === "bug").length;
  const warnings = entries.filter((entry) => entry.level === "warn").length;

  return (
    <section className="fixed bottom-4 right-4 z-[80] w-[min(640px,calc(100vw-2rem))] text-zinc-100">
      {open ? (
        <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Akış günlüğü</p>
              <p className="text-[11px] text-zinc-400">
                {entries.length} kayıt · {warnings} uyarı · {bugs} hata
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                onClick={() => setProblemsOnly((value) => !value)}
              >
                {problemsOnly ? "Tümü" : "Sorunlar"}
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                onClick={() => clearFlowLog()}
              >
                Temizle
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                Kapat
              </button>
            </div>
          </header>
          <ol className="max-h-[50vh] space-y-2 overflow-auto px-3 py-2 font-mono text-[11px]">
            {visible.length === 0 ? (
              <li className="text-zinc-500">Henüz kayıt yok. Kayıt, giriş veya demo adımı bir istek ürettiğinde burada görünür.</li>
            ) : (
              visible.map((entry) => <FlowRow key={entry.id} entry={entry} />)
            )}
          </ol>
        </div>
      ) : (
        <button
          type="button"
          className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold shadow-xl"
          onClick={() => setOpen(true)}
        >
          Akış günlüğü {entries.length > 0 ? `(${entries.length})` : ""}
          {bugs + warnings > 0 ? ` · ${bugs + warnings} sorun` : ""}
        </button>
      )}
    </section>
  );
}

function FlowRow({ entry }: { entry: FlowEntry }) {
  const tone =
    entry.level === "bug" ? "border-red-900 bg-red-950/50" : entry.level === "warn" ? "border-amber-900 bg-amber-950/40" : "border-zinc-800 bg-zinc-900";
  return (
    <li className={`rounded border px-2 py-1.5 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span>
          {entry.method} {entry.path}
        </span>
        <span>
          {entry.status || "—"} · {entry.durationMs}ms
        </span>
      </div>
      {entry.requestSummary ? <p className="break-all text-zinc-300">istek {entry.requestSummary}</p> : null}
      {entry.summary ? <p className="break-all text-zinc-300">cevap {entry.summary}</p> : null}
      <p className="text-zinc-500">
        {entry.scope}
        {entry.anomaly ? ` · ${entry.anomaly}` : ""}
      </p>
    </li>
  );
}

function installFetchLog(): void {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = Date.now();
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const path = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    try {
      const response = await original(input, init);
      let body: unknown;
      if (!response.ok) {
        body = await response
          .clone()
          .json()
          .catch(() => undefined);
      }
      recordFlow({
        scope: "fetch",
        method,
        path,
        status: response.status,
        durationMs: Date.now() - started,
        request: init?.body,
        body,
      });
      return response;
    } catch (error) {
      recordFlow({
        scope: "fetch",
        method,
        path,
        status: 0,
        durationMs: Date.now() - started,
        summary: error instanceof Error ? error.message : "İstek tamamlanamadı",
        anomaly: "AG",
      });
      throw error;
    }
  };
}
