import { z } from "zod";

const menuProductBodySchema = z
  .object({
    productId: z.number().int().positive(),
    menuId: z.number().int(),
    name: z.string().trim().min(1),
  })
  .passthrough();

/** Dashboard `POST /api/menu/chef/search` body. */
export const chefSearchRequestBodySchema = z.object({
  publicId: z.string().trim().min(1).max(128),
  /** Agent bağlamı (sepet, kurallar). */
  message: z.string().trim().min(1).max(4000),
  /** Ham kullanıcı cümlesi — agent `userQuery` alanına aynen gider. */
  userQuery: z.string().trim().max(500).optional(),
  selectedProductId: z.number().int().positive().optional(),
  conversationId: z.string().trim().min(1).max(100).optional(),
  menuProducts: z.array(menuProductBodySchema).min(1).max(400).optional(),
  cartProductIds: z.array(z.number().int().positive()).max(40).optional(),
  recentlyShownProductIds: z.array(z.number().int().positive()).max(60).optional(),
  priorOrderProductIds: z.array(z.number().int().positive()).max(40).optional(),
  conversationTranscript: z.string().trim().max(2000).optional(),
  locale: z.enum(["tr", "en", "ru", "ar"]).optional(),
});

export type ChefSearchRequestBody = z.infer<typeof chefSearchRequestBodySchema>;
