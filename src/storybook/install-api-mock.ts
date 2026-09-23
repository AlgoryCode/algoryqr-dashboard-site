import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { getSiteSameOriginAxios } from "@/lib/site-same-origin-axios";

import { bodyForRequest } from "./fixtures";

const MARK = "__algoryStorybookApiMock";

function jsonResponse(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { data, status: 200, statusText: "OK", headers: {}, config };
}

const adapter: AxiosAdapter = (config) => {
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  return Promise.resolve(jsonResponse(config, bodyForRequest(url)));
};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function installFetch() {
  const host = window as Window & { [MARK]?: boolean };
  if (host[MARK]) return;
  host[MARK] = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = requestUrl(input);
    if (!url.includes("/api/")) return nativeFetch(input, init);
    return Promise.resolve(
      new Response(JSON.stringify(bodyForRequest(url)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
}

export function installApiMock() {
  getSiteSameOriginAxios().defaults.adapter = adapter;
  if (typeof window !== "undefined") installFetch();
}
