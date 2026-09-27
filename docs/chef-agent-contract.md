# Chef chat — qr-agent API contract

Dashboard BFF (`/api/menu/chef/search`) calls `POST {QR_AGENT_BASE_URL}/api/v1/chat`.

## Request (extended)

| Field | Type | Notes |
|--------|------|--------|
| `publicId` | string | Menu public id |
| `message` | string | User message (may include Turkish context prefixes from BFF) |
| `conversationId` | string? | Continuation |
| `products` | `AgentCatalogProduct[]` | Full or client-provided catalog |
| `cartProductIds` | number[]? | Structured cart (optional, backward compatible) |
| `recommendationIntent` | `general` \| `pairing` \| `complete_meal`? | Hint for ranking |
| `locale` | string? | Default `tr` |

## Response

| Field | Type | Notes |
|--------|------|--------|
| `reply` | string | **Max ~2 short Turkish sentences.** No bullet product lists. |
| `productIds` | number[] | Up to **6** ids from `products` only |
| `conversationId` | string? | |
| `searchComplete` | object? | Optional debug metadata |

## System prompt rules (qr-agent)

1. Only recommend `productId` values present in the request catalog.
2. Never repeat items listed in `cartProductIds`.
3. For `complete_meal` / cart context: prioritize missing course (food, drink, dessert).
4. For `general`: diverse 2–4 products suitable as menu bundle anchors.
5. Respect allergens/diet when the user message mentions them.
6. Do not invent prices or products.

## Golden scenarios (regression)

- General recommendation with empty cart → 2–4 ids, short reply.
- Cart with drink only → food and/or dessert ids, no duplicate drink.
- Vegan / allergen user message → filtered ids only.
- All returned ids exist in catalog; none in cart.

## Deploy order

1. Deploy qr-agent with optional new fields ignored if absent.
2. Deploy dashboard-site BFF sending `cartProductIds` + `recommendationIntent`.
3. Tighten agent prompt and run golden set.
