import { allowanceFromUsage, type AssistantAllowance } from "@/lib/assistant-usage";
import { getMerchantIdFromAccessToken } from "@/lib/auth-user";
import { fetchAssistantUsage } from "@/lib/server/assistant-meter";
import { resolveVerifiedProfile } from "@/lib/server/product-gate";

export type AssistantCaller =
  | { ok: false; status: 401 | 503; message: string }
  | { ok: true; accessToken: string; merchantId: number | null };

export type AssistantAccess =
  | { ok: false; status: 401 | 503; message: string }
  | {
      ok: true;
      accessToken: string;
      merchantId: number | null;
      entitled: boolean;
      allowance: AssistantAllowance;
    };

/** The signed-in merchant, verified by the backend; a forged cookie never gets through. */
export async function resolveAssistantCaller(): Promise<AssistantCaller> {
  const gate = await resolveVerifiedProfile();
  if (!gate.ok) {
    return { ok: false, status: gate.status === 401 ? 401 : 503, message: gate.message };
  }
  return { ok: true, accessToken: gate.accessToken, merchantId: getMerchantIdFromAccessToken(gate.accessToken) };
}

/**
 * Who may ask the dashboard assistant, and how much more today. qr-service meters the questions
 * (ASSISTANT_QUESTION): unlimited with the assistant in the plan, a few free ones a day otherwise.
 */
export async function resolveAssistantAccess(): Promise<AssistantAccess> {
  const caller = await resolveAssistantCaller();
  if (!caller.ok) return caller;
  const usage = await fetchAssistantUsage(caller);
  if (!usage) {
    return { ok: false, status: 503, message: "Asistan şu an kullanılamıyor, biraz sonra tekrar deneyin." };
  }
  const allowance = allowanceFromUsage(usage);
  return { ...caller, entitled: allowance.limit == null, allowance };
}
