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

| Field | Type | Required | Example | Source (TCGdex field) | Notes |
|---|---|---|---|---|---|
| id | string | yes | `swsh3-136` | `id` | Card identity, see card identity ADR |
| name | string | yes | `Charizard` | `name` | Searchable |
| number | string | yes | `136` | TODO | String, not number: some numbers contain letters. Sort tiebreaker |
| setId | string | yes | `swsh3` | TODO | Used for the set filter (ids, not names) |
| setName | string | yes | `Darkness Ablaze` | TODO | Display and searchable |
| releaseDate | string (ISO date) | yes | `2020-08-14` | TODO (from the set, not the card) | Used for sort and date filter |
| rarity | string | | `Rare Holo` | TODO | Used for rarity filter |
| TODO: `category` or `types` | TODO | | | TODO | Pick one meaning of "card type" (see Open Questions) |
| imageUrl | string | | | TODO | Built per Section 5 Image rules |
| marketPriceCents | integer | | `1234` | TODO | Null when no USD price. See Section 5 Price |
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
| TODO: card type param | string | none | Name depends on the Section 3 decision |
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
| `setId`, `rarity`, card type | `CardFilter.setId`, `CardFilter.rarity`, TODO |
| `releasedFrom`, `releasedTo` | `CardFilter.releasedFrom`, `CardFilter.releasedTo` |
| `page`, `pageSize` | `PageInput.number`, `PageInput.size` |
| Output | `CardPage { items, totalCount, page, pageSize }` |

Pagination style: offset (page number + size) for now. Cursor pagination is the alternative. This becomes a breaking change once Talus consumes the API, so it gets an ADR during engine schema design.

## 5. Mapping Rules (Raw TCGdex to View Model)

### Price
- Source: TCGplayer (USD) only
- Variant rule: TODO (e.g. first variant with a marketPrice, in order: TODO)
- Conversion: dollars to integer cents, rounded to the nearest cent (never truncated, since 0.29 * 100 = 28.999... in JavaScript)
- Missing price: null, shown as "No price data". No EUR fallback
- UI label: "Market price", kept separate from future engine prices (listing price, last trade price)

### Image
- URL format: TODO (base `image` field + quality + extension; verify in TCGdex docs)
- Missing image: TODO (placeholder image or card-back graphic)

### Other fields
- `releaseDate` and `setName` come from the set, not the card detail
- TODO: any other renames or defaults found while writing the script

## 6. Seed Data

| Item | Value |
|---|---|
| Source | TCGdex REST API, locale `en` |
| Sets used | TODO: 4 sets (ids and names) |
| Why these sets | TODO (different release dates so sort and date filters are testable; modern English for price coverage) |
| Card count | 40 (10 per set) |
| Raw file | `data/raw/tcgdex-cards.json` |
| Fetched at | Stored in file metadata (`fetchedAt`, `source`, `setIds`) |
| Script | `scripts/seed-cards.ts` |

### How to re-run
1. TODO: prerequisites (Node version, install step)
2. TODO: command
3. Expected output: a summary like "38 of 40 saved, 2 skipped: <ids>"

### Failure handling
- Failed card fetch: skip the card, log its id and the reason, continue
- Partial run: TODO (overwrite the file anyway, or only write if enough cards succeeded)
- Request pacing: sequential or a few at a time (about 5), no bursts

## 7. Validation
- Raw response validation: Zod schema applied when reading the raw file
- Invalid card: skip it and log its id. One bad card never blanks the grid

## 8. Open Questions
- "Card type" filter: `category` (Pokemon / Trainer / Energy) or `types` (Fire, Water, ...)?
- Which 4 sets to seed?
- Price variant rule order?

## 9. Changelog
| Date | Change | Author |
|---|---|---|
| 2026-11-09 | Initial draft | Edwin Miyatake |
| 2026-11-10 | Added filter fields, sort tiebreaker, output semantics, GraphQL mapping draft, USD-only price rule, validation rules | Edwin Miyatake |