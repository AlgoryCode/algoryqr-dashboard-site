import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { flowLogEnabled, recordFlow } from "@/lib/flow-log";

type TimedConfig = InternalAxiosRequestConfig & { __flowStarted?: number };

let installed = false;

export function installUpstreamFlowLog(): void {
  if (installed || !flowLogEnabled()) return;
  installed = true;
  axios.interceptors.request.use((config) => {
    (config as TimedConfig).__flowStarted = Date.now();
    return config;
  });
  axios.interceptors.response.use(
    (response) => {
      const config = response.config as TimedConfig;
      recordFlow({
        scope: "upstream",
        method: (config.method || "GET").toUpperCase(),
        path: response.config.url || "",
        status: response.status,
        durationMs: elapsed(config),
        request: config.data,
        body: response.data,
      });
      return response;
    },
    (error: AxiosError) => {
      const config = error.config as TimedConfig | undefined;
      recordFlow({
        scope: "upstream",
        method: (config?.method || "GET").toUpperCase(),
        path: config?.url || "",
        status: error.response?.status ?? 0,
        durationMs: elapsed(config),
        request: config?.data,
        body: error.response?.data ?? error.message,
      });
      return Promise.reject(error);
    },
  );
}

function elapsed(config: TimedConfig | undefined): number {
  if (!config?.__flowStarted) return 0;
  return Date.now() - config.__flowStarted;
}
