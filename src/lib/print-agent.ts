import { api } from "@/lib/api/client";
import type { BranchItem } from "@/lib/branch";

export type PrintAgentDevice = {
  id: number;
  branchId: number;
  deviceName: string;
  printerName?: string | null;
  agentVersion?: string | null;
  lastSeenAt?: string | null;
  enabled: boolean;
  createdAt?: string | null;
};

export type PrintPairingCode = {
  code: string;
  branchId: number;
  expiresAt: string;
};

export type PrintApiKeyCredentials = {
  merchantId?: number;
  userId?: number;
  deviceId: number;
  branchId: number;
  apiKey: string;
  deviceName: string;
};

export type PrintFailedJob = {
  id: number;
  sourceType: string;
  sourceId: string;
  jobType: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  createdAt?: string | null;
};

export type PrintAgentSettings = {
  merchantId?: number;
  userId?: number;
  branchId: number;
  printKitchenEnabled: boolean;
  devices: PrintAgentDevice[];
};

export async function getPrinterSettingsRequest(branchId: number) {
  const { data } = await api.get<PrintAgentSettings>("/printer/settings", {
    params: { branchId },
  });
  return data;
}

export async function createPrintPairingCodeRequest(branchId: number) {
  const { data } = await api.post<PrintPairingCode>("/print-agent/manage/pairing-codes", { branchId });
  return data;
}

export async function createPrintApiKeyRequest(branchId: number, deviceName?: string) {
  const { data } = await api.post<PrintApiKeyCredentials>("/print-agent/manage/api-keys", {
    branchId,
    deviceName: deviceName || "Print Agent",
  });
  return data;
}

export async function listPrintDevicesRequest(branchId: number) {
  const { data } = await api.get<PrintAgentDevice[]>("/print-agent/manage/devices", {
    params: { branchId },
  });
  return data;
}

export async function setPrintDeviceEnabledRequest(deviceId: number, enabled: boolean) {
  const { data } = await api.put<PrintAgentDevice>(`/print-agent/manage/devices/${deviceId}/enabled`, {
    enabled,
  });
  return data;
}

export async function listFailedPrintJobsRequest(branchId: number) {
  const { data } = await api.get<PrintFailedJob[]>("/print-agent/manage/jobs/failed", {
    params: { branchId },
  });
  return data;
}

export async function retryPrintJobRequest(jobId: number) {
  const { data } = await api.post<PrintFailedJob>(`/print-agent/manage/jobs/${jobId}/retry`);
  return data;
}

export async function setPrintKitchenEnabledRequest(branchId: number, enabled: boolean) {
  const { data } = await api.put<BranchItem>(`/print-agent/manage/branches/${branchId}/print-kitchen`, {
    enabled,
  });
  return data;
}
