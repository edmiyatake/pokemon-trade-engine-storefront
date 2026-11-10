# Data Contract: Card Catalog (Web Client)

> Status: Draft | Owner: Edwin Miyatake | Last updated: 2026-11-10
> Related ADRs: TODO: card identity ADR, shadcn/ui ADR, pagination style ADR (engine)

## 1. Purpose
This contract covers the shape of the card data the web client renders, and the function pages call to get it. Today it is backed by a seeded TCGdex fixture; later it will be backed by the trading engine's GraphQL API.

## 2. Scope
- In scope: card browsing grid, card tiles, search, filters, pagination
- Out of scope: listings, trades, user inventory, auth, engine-side pricing

## 3. Card View Model
The shape components receive. This is OUR shape, not TCGdex's. Formatting (e.g. cents to "$12.34") happens only in the UI.

| Field | Type | Required | Example | Source (TCGdex) | Notes |
|---|---|---|---|---|---|
| id | string | yes | `swsh3-136` | card `id` | Mock uses the TCGdex id. Engine id scheme is decided in the card identity ADR |
| name | string | yes | `Furret` | card `name` | Searchable |
| number | string | yes | `136` | card `localId` | `localId` can be a string or a number. Always converted to string. Sort tiebreaker |
| setId | string | yes | `swsh3` | card `set.id` | Used for the set filter (ids, not names) |
| setName | string | yes | `Darkness Ablaze` | card `set.name` | Display and searchable |
| releaseDate | string (ISO date) | yes | `2020-08-14` | set endpoint `releaseDate` | Not on the card response (SetBrief has no date). Taken from the set response fetched during seeding |
| rarity | string | | `Uncommon` | card `rarity` | Optional in TCGdex. Used for rarity filter |
| category | string | yes | `Pokemon` | card `category` | One of `Pokemon`, `Trainer`, `Energy`. Used for card type filter |
| imageUrl | string | | `https://assets.tcgdex.net/en/swsh/swsh3/136/high.webp` | card `image` | Built per Section 5 Image rules. Null when `image` is missing |
| marketPriceCents | integer | | `9` | card `pricing.tcgplayer.<variant>.marketPrice` | Built per Section 5 Price rules. Null when no USD price |
| listingCount | integer | yes | `0` | n/a | Always 0 until the engine exists |

## 4. Data Access Contract: `getCards`
The data function does not decide HTTP status or UI. It returns data; the page decides what to show.

### Input
| Param | Type | Default | Notes |
|---|---|---|---|
| q | string | none | Matches `name` and `setName`. Empty or whitespace means no filter |
| page | integer | 1 | 1-based. Invalid values (0, negative, non-numeric) are treated as 1 |
| pageSize | integer | 12 | 3 rows of 4 |
| setId | string | none | Exact match |
| rarity | string | none | Exact match |
| category | string | none | Exact match: `Pokemon`, `Trainer`, or `Energy` |
| releasedFrom | string (ISO date) | none | Inclusive |
| releasedTo | string (ISO date) | none | Inclusive |

### Output
| Field | Type | Notes |
|---|---|---|
| items | Card[] | The cards for the requested page only |
| totalCount | integer | Matches across ALL pages, before pagination. Example: 40 seeded cards, no search, totalCount = 40, so ceil(40 / 12) = 4 pages |
| page | integer | The requested page, echoed back |
| pageSize | integer | The page size used |

### Behavior
- Sort order: `releaseDate` descending, then `number` ascending (tiebreaker, since every card in a set shares one date)
- Empty result: `items: []`, `totalCount: 0`. The page shows the empty state ("Oops, nothing came up")
- Page past the end (e.g. page 99): `items: []` with the real `totalCount`. The page shows "That page doesn't exist" with a link to page 1. No 404
- Search matching: trimmed, case-insensitive substring match on `name` and `setName` (maps to Postgres `ILIKE` later)
- Filters combine with AND

### Future GraphQL mapping (draft guess, keeps names aligned)
| Contract | Future GraphQL |
|---|---|
| `getCards({ q, page, pageSize, ...filters })` | `cards(filter: CardFilter, page: PageInput): CardPage` |
| `q` (also the URL param) | `CardFilter.query` |
| `setId`, `rarity`, `category` | `CardFilter.setId`, `CardFilter.rarity`, `CardFilter.category` |
| `releasedFrom`, `releasedTo` | `CardFilter.releasedFrom`, `CardFilter.releasedTo` |
| `page`, `pageSize` | `PageInput.number`, `PageInput.size` |
| Output | `CardPage { items, totalCount, page, pageSize }` |

Pagination style: offset (page number + size) for now. Cursor pagination is the alternative. This becomes a breaking change once Talus consumes the API, so it gets an ADR during engine schema design.

## 5. Mapping Rules (Raw TCGdex to View Model)

### Price
- Source: TCGplayer (USD) only
- Variant rule: use the first variant that has a `marketPrice`, in this order: `normal`, `holofoil`, `reverse-holofoil`
  - TODO: confirm the actual key names against one real response per seeded set. The TCGdex docs list `reverse-holofoil`, but their example response uses `reverse`
  - First edition keys are ignored (modern sets have no first editions)
- Conversion: dollars to integer cents, rounded to the nearest cent (never truncated, since 0.29 * 100 = 28.999... in JavaScript)
- Missing price: null, shown as "No price data". No EUR fallback
- UI label: "Market price", kept separate from future engine prices (listing price, last trade price)

### Image
- URL format: `image` + `/high.webp` (quality `high`, extension `webp`)
- Missing image: `imageUrl` is null. The UI shows an "image not found" icon

### Other fields
- `number`: `localId` converted to string
- `releaseDate`: from the set endpoint response, joined to each card by `set.id`
- `setName`: from the card's `set.name`

## 6. Seed Data

| Item | Value |
|---|---|
| Source | TCGdex REST API, locale `en` |
| Sets used | `sv08` (Surging Sparks), `sv08.5` (Prismatic Evolutions), `me03` (Perfect Order), `30th` (30th Celebration) |
| Why these sets | Modern English sets for good price coverage. Release dates span late 2024 to late 2026, so sort and date filters are testable. 30th Celebration (released Sep 2026) is recent and may have sparse pricing, which exercises the "No price data" state |
| Card count | 40 (10 per set) |
| Raw file | `data/raw/tcgdex-cards.json` |
| File metadata | `source`, `setIds`, and per-card `fetchedAt` |
| Script | `scripts/seed-cards.ts` |

### Set id notes
- Ids come from the TCGdex sets list endpoint (`/v2/en/sets`), not from guessing
- `sv08.5` contains a dot. Safe in URL paths; never split ids on dots or use them with dot-path tools
- `30th` starts with a digit and had no logo or symbol in the sets list at selection time. Expect gaps in its card data and pricing
- `30th-c` (30th Classic Collection) is a different set. Do not confuse it with `30th`
- The sets list also includes TCG Pocket sets (ids like `A1`, `B2`). Those are digital-only cards and must never be seeded

### Fetch flow
1. For each set: fetch the set endpoint, record `releaseDate`, take the first 10 card ids
2. For each card id: fetch the card detail
3. Merge results into the raw file (see Failure handling)

### How to re-run
1. TODO: prerequisites (Node version, install step)
2. TODO: command (npm script name)
3. Expected output: a summary like "38 of 40 saved, skipped: <ids>"
4. Verify: open the raw file and check that `fetchedAt` values changed for saved cards

### Failure handling
- Failed card fetch: skip the card, log its id and the reason, continue
- Partial run: merge by card id. Successful cards replace their existing entries; failed cards keep their previous entry (if any). Each card carries its own `fetchedAt`, so mixed fetch times are visible
- Atomic write: write to a temp file, then rename it over the real file, so a crash mid-write never leaves a corrupt file
- Request pacing: sequential or a few at a time (about 5), no bursts

## 7. Validation
- Raw response validation: Zod schema applied when reading the raw file
- Invalid card: skip it and log its id. One bad card never blanks the grid
- Known TCGdex doc inconsistencies to validate against real data, not docs:
  - TCGplayer variant key names (`reverse` vs `reverse-holofoil`)
  - `pricing.tcgplayer.updated` documented as a Number, shown as an ISO string in the example

## 8. Open Questions
- Actual TCGplayer variant key names in real responses
- Engine card id scheme (internal UUID with TCGdex id as external reference, or TCGdex id as primary key). Decided in the card identity ADR

## 9. Changelog
| Date | Change | Author |
|---|---|---|
| 2026-11-09 | Initial draft | Edwin Miyatake |
| 2026-11-10 | Added filter fields, sort tiebreaker, output semantics, GraphQL mapping draft, USD-only price rule, validation rules | Edwin Miyatake |
| 2026-11-10 | Chose `category` for card type, picked four seed sets, defined variant order and image URL format, filled Source column, added merge-by-id partial runs with atomic write | Edwin Miyatake |
| 2026-11-10 | Recorded seed set ids (`sv08`, `sv08.5`, `me03`, `30th`) and set id notes | Edwin Miyatake |