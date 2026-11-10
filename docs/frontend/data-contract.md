# Data Contract: Card Catalog (Web Client)

> Status: Draft | Owner: Edwin Miyatake | Last updated: <2026-11-09>
> Related ADRs: <link to ADR on card identity>, <link to ADR on shadcn/ui>

## 1. Purpose
This contract covers the shape of the card data the web client renders, and the function pages call to get it. Today it is backed by a seeded TCGdex fixture; later it will be backed by the trading engine's GraphQL API.

## 2. Scope
- In scope: <e.g. card browsing grid, card tiles, search, pagination>
- Out of scope: <e.g. listings, trades, user inventory, auth>

## 3. Card View Model
<!-- The shape components receive. This is OUR shape, not TCGdex's. -->

| Field | Type | Required | Example | Source (TCGdex field) | Notes |
|---|---|---|---|---|---|
| id | string | yes | `swsh3-136` | `id` | <see card identity ADR> |
| name | string | yes | | | |
| setName | string | yes | | | |
| number | string | | | | <string, not number: some numbers have letters> |
| rarity | string | | | | |
| imageUrl | string | | | | <how the final URL is built> |
| marketPriceCents | integer | | `1234` | | <null when no price> |
| listingCount | integer | yes | `0` | n/a | <always 0 until the engine exists> |

## 4. Data Access Contract: `getCards`

### Input
| Param | Type | Default | Notes |
|---|---|---|---|
| q | string | | <which fields are searched?> |
| page | integer | 1 | <1-based or 0-based?> |
| pageSize | integer | 12 | |
| <filter> | | | <e.g. setId, rarity, price range> |

### Output
| Field | Type | Notes |
|---|---|---|
| items | Card[] | |
| totalCount | integer | <total matches before pagination> |
| page | integer | |
| pageSize | integer | |

### Behavior
- Sort order: <e.g. by set number ascending>
- Empty result: <what is returned>
- Invalid page (e.g. page 99): <clamp, empty list, or error?>
- Search matching: <case-insensitive? substring? which fields?>

### Future GraphQL mapping
| Contract | Future GraphQL |
|---|---|
| `getCards({ q, page, pageSize })` | <e.g. `cards(filter: { query }, page: { ... })`> |
| URL param `q` | <must match filter field name> |

## 5. Mapping Rules (Raw TCGdex to View Model)

### Price
- Source: <tcgplayer (USD) or cardmarket (EUR)?>
- Variant rule: <e.g. first variant with a marketPrice, in order: ...>
- Conversion: dollars to integer cents, rounded with <rounding method>
- Missing price: <null, shown as "No price data">
- UI label: <e.g. "Market price", kept separate from future engine prices>

### Image
- URL format: <base + quality + extension>
- Missing image: <fallback behavior>

### Other fields
- <any renames, defaults, or derived fields>

## 6. Seed Data

| Item | Value |
|---|---|
| Source | TCGdex REST API, locale `<en>` |
| Set used | <set id and name> |
| Why this set | <reason> |
| Card count | <e.g. 40> |
| Raw file | `data/raw/tcgdex-cards.json` |
| Fetched at | <stored in file metadata> |
| Script | `scripts/seed-cards.ts` |

### How to re-run
1. <prerequisites>
2. <command>
3. <expected output, e.g. "38 of 40 saved">

### Failure handling
- Failed card fetch: <skip and log?>
- Partial run: <does it overwrite the file?>

## 7. Validation
- Raw response validation: <e.g. Zod schema at read time, or none>
- What happens on invalid data: <skip card, throw, log>

## 8. Open Questions
- <e.g. Should search include set name?>
- <e.g. Show EUR prices for cards missing USD?>

## 9. Changelog
| Date | Change | Author |
|---|---|---|
| <YYYY-MM-DD> | Initial draft | <you> |