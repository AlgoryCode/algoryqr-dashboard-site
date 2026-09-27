# Chef funnel KPIs (iteration 1)

## Environment flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_CHEF_CROSS_SELL_ENABLED` | on | After add-to-cart cross-sell strip |
| `NEXT_PUBLIC_CHEF_CROSS_SELL_MAX_ITEMS` | `2` | A/B: set `1` for single-card cross-sell |

## Events (menu analytics)

- `CHEF_CHAT_OPEN`
- `CHEF_RECOMMENDATION_REQUEST` (`metadata.mode`)
- `CHEF_RECOMMENDATION_SHOWN` (`metadata.productCount`, `metadata.menuSuggestionCount`)
- `CHEF_PRODUCT_CARD_CLICK` (`metadata.source`)
- `CHEF_PRODUCT_ADD` (`metadata.source`)
- `CHEF_CROSS_SELL_SHOWN` / `CLICK` / `ADD`
- `CHEF_CART_OPEN` (`metadata.from`)

## Funnel ratios

1. `CHEF_RECOMMENDATION_SHOWN` → `CHEF_PRODUCT_ADD`
2. `CHEF_CROSS_SELL_SHOWN` → `CHEF_CROSS_SELL_ADD`
3. `CHEF_CHAT_OPEN` → `ORDER_SUBMITTED` (existing event)

Server logs: `menu_analytics_ingest_fallback` and `chef_bff_timing` in BFF when upstream analytics rejects new types.
