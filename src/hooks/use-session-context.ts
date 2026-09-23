"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSessionContextClient } from "@/lib/session-context";

export const SESSION_CONTEXT_QUERY_KEY = ["sessionContext"] as const;

export function useSessionContext(enabled = true) {
  return useQuery({
    queryKey: SESSION_CONTEXT_QUERY_KEY,
    queryFn: fetchSessionContextClient,
    enabled,
    staleTime: 15_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
