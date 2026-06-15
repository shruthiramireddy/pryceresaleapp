# Pryce

A resale price estimator for secondhand fashion. Enter a brand, item name, and condition — Pryce searches real eBay sold listings via the RapidAPI eBay Average Selling Price API, computes price statistics (p10/median/p90/mean/stddev), and returns a distribution of what that item actually sold for. Results are cached in Postgres so repeat searches are instant.

**Live demo:** [pryceresaleapp.vercel.app](https://pryceresaleapp.vercel.app)

## What I Built

Pryce answers a simple question: *what is this item actually worth on the resale market?*

You search by brand, item name, and condition. Pryce pulls real sold listings from eBay, calculates a price range (low, fair market, high), shows a distribution chart, and links you directly to individual sold comps so you can verify the data yourself.

When eBay has no results for an obscure search, Pryce falls back to a seeded database of realistic listings matched with PostgreSQL trigram fuzzy search — so the app never feels empty.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Drizzle ORM** + Postgres (Supabase)
- **RapidAPI** eBay Average Selling Price API for live sold listing data
- **Tailwind CSS** + shadcn/ui
- Deployed on **Vercel**

## How to Run Locally

```bash
git clone https://github.com/shruthiramireddy/pryceresaleapp
cd pryceresaleapp
npm install
```

Create `.env.local` with:

```env
DATABASE_URL=your_supabase_connection_string
RAPID_API_KEY=your_rapidapi_key
```

Then:

```bash
npx drizzle-kit push
npx tsx src/db/seed.ts   # optional: seeds 1000 fallback listings
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How the Non-Trivial Endpoint Works

`POST /api/estimate` does the following in sequence:

1. **Validates input** with Zod (`brand`, `itemName`, `condition`)
2. **Calls RapidAPI** to fetch up to 60 real eBay sold listings for that search
3. **If live data returns 1+ results**, computes price stats directly from eBay data (p10, p25, median, p75, p90, mean, stddev) in TypeScript
4. **Falls back** to a `pg_trgm` fuzzy search on the seeded `listings` table if eBay returns nothing
5. **Caches the search** in the `searches` table (`brand`, `query`, `condition`, stats) to avoid repeat API calls
6. **Returns comps** with direct eBay listing URLs so users can click through

### Other API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/estimate` | POST | Run a price estimate |
| `/api/searches` | GET | Last 20 cached searches (powers the history page) |
| `/api/ebay-notification` | GET/POST | eBay marketplace account deletion webhook |

## Project Structure

```
src/
├── app/
│   ├── api/estimate/route.ts   # Main estimate endpoint
│   ├── api/searches/route.ts   # Search history API
│   ├── history/page.tsx        # Recent searches UI
│   └── page.tsx                # Home / search UI
├── components/
│   ├── CompCard.tsx            # Individual sold listing card
│   ├── PriceChart.tsx          # Price distribution histogram
│   └── Nav.tsx                 # Top navigation
├── db/
│   ├── schema.ts               # Drizzle schema (listings, searches)
│   └── seed.ts                 # Seed script
└── lib/
    ├── ebay.ts                 # RapidAPI eBay integration
    ├── estimate.ts             # pg_trgm fuzzy search + stats
    └── searches.ts             # Shared search history queries
```

## What I'd Do Next With More Time

- **Add the Anthropic API back** for AI-generated pricing summaries and sell tips (was working but removed to reduce latency)
- **Implement eBay Browse API OAuth** to replace the RapidAPI wrapper with a direct integration
- **Add user accounts** so people can save searches and track price changes over time
- **Add a price trend chart** showing whether prices for an item are going up or down over the last 90 days
- **Category filtering** so you can narrow to just tops, bottoms, shoes, etc.

## Tradeoffs I Made

### RapidAPI over direct eBay API

eBay's official Finding API was decommissioned in February 2025. The replacement Browse API requires OAuth, which was out of scope. RapidAPI gives us real sold listing data with a simple key — the tradeoff is cost at scale and a third-party dependency.

### Seeded fallback data

1000 realistic listings are seeded so the app never feels empty, even for obscure searches that eBay doesn't return much for.

### No auth

Searches are anonymous. Would add Clerk or Supabase Auth next to associate history with users and enable saved searches.

### Stats computed in TypeScript, not SQL

Easier to test and iterate on than SQL percentile functions, at the cost of pulling more rows into memory. Fine at this scale.

### 24h search cache

Simple TTL cache on the `searches` table. A smarter version would invalidate based on new eBay data rather than time.

## License

MIT
