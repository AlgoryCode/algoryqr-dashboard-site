# Chef chat — qr-agent API contract

Dashboard BFF (`/api/menu/chef/search`, `/search/stream`) calls `POST {QR_AGENT_BASE_URL}/api/v1/chat`.

## Request (input schema)

| Field | Type | Notes |
|--------|------|--------|
| `publicId` | string | Menu public id |
| **`userQuery`** | string \| null | **Ham kullanıcı cümlesi; normalize edilmez, BFF aynen iletir.** |
| `message` | string | Bağlam: sepet özeti, mod, yanıt kuralları (kullanıcı metni tekrarlanmaz) |
| `conversationId` | string? | Continuation |
| `products` | `AgentCatalogProduct[]` | Full or client-provided catalog |
| `cartProductIds` | number[]? | Structured cart |
| `priorOrderProductIds` | number[]? | Guest order history hint |
| `recommendationIntent` | `general` \| `pairing` \| `complete_meal` \| `specific`? | BFF hint |
| `locale` | string? | Default `tr` |
| `conversationTranscript` | string? | Last turns summary from BFF |
| `candidateProductIds` | number[]? | Badge hybrid pool (subset selection) |

Zod: `chefAgentUpstreamRequestSchema` (`src/lib/chef/chef-agent-schema.ts`).

Dashboard client → BFF: `chefSearchRequestBodySchema` (`message` + `userQuery` + `menuProducts` + `cartProductIds` …).

## Response (output schema)

| Field | Type | Notes |
|--------|------|--------|
| `reply` | string | **Max ~2 short Turkish sentences.** No bullet product lists. |
| `productIds` | number[] | Up to **6** ids from `products` only |
| `conversationId` | string? | |
| `turnId` | string? | Persisted chat turn id (for guest like/dislike) |
| `searchComplete` | object? | Optional debug metadata |

Zod: `chefAgentChatResponseSchema` — BFF `parseChefAgentChatResponse`.

## BFF post-processing (no query normalize)

1. Validate agent response shape.
2. Hydrate `productIds` from catalog; drop cart duplicates.
3. Diet / price guards use **raw `userQuery`** only.
4. If agent returns no valid ids → **fallback** `pickCatalogProductsForRawUserQuery` (substring match, `tr-TR` case only).
5. Rank (category cap, recent dedup, prior orders).

Agent is the primary recommender; BFF does not rewrite picks with synonym/stop-word pipelines.

## Turn feedback (menu API)

Dashboard BFF: `POST /api/menu/chef/turn-feedback`

Proxies to: `PATCH /menu/public/{publicId}/chef-chat/turns/{turnId}/feedback`

Body: `{ "feedback": "LIKE" | "DISLIKE" }`

## System prompt rules (qr-agent)

1. Read **`userQuery`** for what the guest wants; use **`products`** as the only id source.
2. Only recommend `productId` values present in the request catalog.
3. Never repeat items listed in `cartProductIds`.
4. For `complete_meal` / cart context: prioritize missing course (food, drink, dessert).
5. For `general`: diverse 2–4 products suitable as menu bundle anchors.
6. Respect allergens/diet when **`userQuery`** mentions them.
7. Do not invent prices or products.

## Golden scenarios (regression)

- General recommendation with empty cart → 2–4 ids, short reply.
- Cart with drink only → food and/or dessert ids, no duplicate drink.
- Vegan / allergen **userQuery** → filtered ids only.
- All returned ids exist in catalog; none in cart.

## Deploy order

1. Deploy qr-agent with **`userQuery`** field (ignore if absent for old BFF).
2. Deploy dashboard-site BFF sending `userQuery` + structured `message`.
3. Tighten agent prompt and run golden set.
