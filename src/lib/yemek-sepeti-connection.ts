import type { YemekSepetiConnection } from "@/lib/yemek-sepeti-api";

export function canSaveYemekSepetiConnection(input: {
  chainId: string;
  vendorId: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  connection?: YemekSepetiConnection | null;
}): boolean {
  if (input.chainId.trim() === "") return false;
  if (input.vendorId.trim() === "") return false;
  if (input.clientId.trim() === "" && !input.connection?.clientIdMasked) return false;
  if (input.clientSecret.trim() === "" && !input.connection) return false;
  if (input.webhookSecret.trim() === "" && !input.connection?.webhookSecretMasked) return false;
  return true;
}
