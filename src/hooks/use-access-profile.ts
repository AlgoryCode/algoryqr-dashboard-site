"use client";

import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { SESSION_CONTEXT_QUERY_KEY, useSessionContext } from "@/hooks/use-session-context";
import { toAccessProfile } from "@/lib/auth-user";

export const ACCESS_PROFILE_QUERY_KEY = SESSION_CONTEXT_QUERY_KEY;

export function useAccessProfile(enabled = true) {
  const query = useSessionContext(enabled);
  const data = useMemo(() => {
    if (!query.data) return undefined;
    return toAccessProfile({
      packageCode: query.data.packageCode ?? null,
      products: query.data.products,
      scopes: query.data.scopes,
      roles: query.data.user.role ? [query.data.user.role] : [],
      provider: query.data.user.provider,
    });
  }, [query.data]);
  return { ...query, data };
}

export function invalidateAccessProfile(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ACCESS_PROFILE_QUERY_KEY });
}
