export type FlowLevel = "ok" | "warn" | "bug";

export type FlowEntry = {
  id: string;
  at: string;
  scope: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  level: FlowLevel;
  anomaly: string | null;
  summary: string;
};

const MAX_ENTRIES = 200;
const listeners = new Set<() => void>();
let entries: FlowEntry[] = [];
let sequence = 0;
const recentChecks = new Map<string, number>();

const SECRET_KEY = /password|token|secret|authorization|cookie/i;

export function flowLogEnabled(): boolean {
  const flag = (process.env.FLOW_LOG_ENABLED || "").trim().toLowerCase();
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  const blob = [
    process.env.API_BASE_URL,
    process.env.AUTH_BASE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_ENV,
    process.env.DEPLOY_ENV,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes("stage");
}

export function clientFlowLogEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  if (params.get("flowlog") === "0") return false;
  if (host.includes("stage.")) return true;
  if (params.get("flowlog") === "1") return true;
  try {
    return window.localStorage.getItem("flowlog") === "1";
  } catch {
    return false;
  }
}

export function subscribeFlowLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFlowLogEntries(): FlowEntry[] {
  return entries;
}

const EMPTY_ENTRIES: FlowEntry[] = [];

export function getServerFlowSnapshot(): FlowEntry[] {
  return EMPTY_ENTRIES;
}

export function clearFlowLog(): void {
  entries = [];
  listeners.forEach((listener) => listener());
}

export function recordFlow(input: {
  scope: string;
  method: string;
  path: string;
  status: number;
  durationMs?: number;
  body?: unknown;
  summary?: string;
  anomaly?: string | null;
}): void {
  const path = stripOrigin(input.path);
  if (!path || path.includes("/api/flow-log") || path.includes("/_next/") || path.includes("_rsc=")) return;
  const summary = input.summary ?? summarizeBody(input.body);
  const checkKey = `${input.scope}|${input.method}|${path}|${input.status}|${summary}`;
  if (input.method === "CHECK") {
    const now = Date.now();
    const previous = recentChecks.get(checkKey) ?? 0;
    if (now - previous < 4000) return;
    recentChecks.set(checkKey, now);
  }
  const anomaly = input.anomaly === undefined ? detectAnomaly(input.status, summary) : input.anomaly;
  const entry: FlowEntry = {
    id: `${Date.now().toString(36)}-${++sequence}`,
    at: new Date().toISOString(),
    scope: input.scope,
    method: input.method,
    path,
    status: input.status,
    durationMs: input.durationMs ?? 0,
    level: levelOf(input.status, anomaly),
    anomaly,
    summary,
  };
  if (typeof window === "undefined") {
    if (!flowLogEnabled()) return;
    console.info(`[flow] ${JSON.stringify(entry)}`);
    return;
  }
  if (!clientFlowLogEnabled()) return;
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((listener) => listener());
}

export function recordProductCheck(
  product: string,
  present: boolean,
  packageCode: string | null,
): void {
  recordFlow({
    scope: "entitlement",
    method: "CHECK",
    path: product,
    status: present ? 200 : 403,
    anomaly: present ? null : "PAKETTE_URUN_YOK",
    summary: present
      ? `${product} pakette var${packageCode ? ` (${packageCode})` : ""}`
      : `${product} pakette yok${packageCode ? ` (${packageCode})` : ""}`,
  });
}

function levelOf(status: number, anomaly: string | null): FlowLevel {
  if (status >= 500 || anomaly === "SUNUCU_HATASI") return "bug";
  if (status >= 400 || anomaly) return "warn";
  return "ok";
}

function detectAnomaly(status: number, summary: string): string | null {
  if (status >= 500 || /cannot invoke|exception|nullpointer/i.test(summary)) return "SUNUCU_HATASI";
  if (status === 404) return "UC_YOK";
  if (status === 401 || status === 403) return "ERISIM";
  if (status === 0) return "AG";
  return null;
}

function summarizeBody(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body.slice(0, 180);
  if (Array.isArray(body)) return `liste ${body.length}`;
  if (typeof body !== "object") return String(body).slice(0, 180);
  const record = body as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of [
    "message",
    "code",
    "status",
    "decision",
    "packageCode",
    "activePackage",
    "demo",
    "active",
    "trialPackageCode",
    "userId",
    "allowed",
  ]) {
    if (record[key] !== undefined) picked[key] = redactValue(key, record[key]);
  }
  if (Array.isArray(record.products)) picked.products = record.products;
  if (Array.isArray(record.entitlements)) picked.entitlementCount = record.entitlements.length;
  if (Array.isArray(record.content)) picked.contentCount = record.content.length;
  const text = JSON.stringify(picked);
  return text === "{}" ? "" : text.slice(0, 280);
}

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY.test(key)) return "<gizli>";
  if (Array.isArray(value)) return value.slice(0, 12);
  if (value && typeof value === "object") return summarizeBody(value);
  return value;
}

function stripOrigin(path: string): string {
  try {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const url = new URL(path);
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return path;
  }
  return path;
}
