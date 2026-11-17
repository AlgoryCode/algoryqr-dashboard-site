"use client";

import { useQuery } from "@tanstack/react-query";

import { getBranchAssistantReportRequest } from "@/lib/api";

export function useBranchAssistantReport(
  branchId: number | null,
  from: string,
  to: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["branchAssistantReport", branchId, from, to] as const,
    queryFn: () => getBranchAssistantReportRequest(branchId as number, from, to),
    enabled: enabled && branchId != null,
    staleTime: 60_000,
    retry: 1,
  });
}
