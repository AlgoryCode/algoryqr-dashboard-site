import { z } from "zod";

/** qr-agent `POST /api/v1/chat` — canonical request (BFF → agent). */
export const chefAgentUpstreamRequestSchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  /** Ham kullanıcı cümlesi; normalize edilmez. */
  userQuery: z.string().trim().max(500).nullable().optional(),
  /** Sepet / mod / yanıt kuralları (kullanıcı metni tekrarlanmaz). */
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().trim().min(1).max(100).optional(),
  products: z.array(z.record(z.string(), z.unknown())).min(1).max(400),
  cartProductIds: z.array(z.number().int().positive()).max(40).optional(),
  candidateProductIds: z.array(z.number().int().positive()).max(60).optional(),
  priorOrderProductIds: z.array(z.number().int().positive()).max(40).optional(),
  recommendationIntent: z
    .enum(["general", "pairing", "complete_meal", "specific"])
    .optional(),
  locale: z.enum(["tr", "en", "ru", "ar"]).optional(),
  conversationTranscript: z.string().trim().max(2000).optional(),
});

export type ChefAgentUpstreamRequest = z.infer<typeof chefAgentUpstreamRequestSchema>;

const productIdsSchema = z.union([
  z.array(z.number().int().positive()).max(6),
  z.null(),
  z.undefined(),
]);

/** qr-agent yanıtı — BFF doğrulaması. */
export const chefAgentChatResponseSchema = z.object({
  reply: z.string().max(2000).optional(),
  message: z.string().max(2000).optional(),
  conversationId: z.string().max(100).optional(),
  turnId: z.string().max(128).optional(),
  productIds: productIdsSchema,
  products: z.unknown().optional(),
  searchComplete: z.unknown().optional(),
  timing: z.record(z.string(), z.number()).optional(),
});

export type ChefAgentChatResponseParsed = z.infer<typeof chefAgentChatResponseSchema>;

export function parseChefAgentChatResponse(
  data: unknown,
): { ok: true; data: ChefAgentChatResponseParsed } | { ok: false; error: z.ZodError } {
  const parsed = chefAgentChatResponseSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error };
  return { ok: true, data: parsed.data };
}
