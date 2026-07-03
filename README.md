# finance-tracking

A mobile app for auditing public companies' financial filings and tracking discrepancies.

Users maintain a watchlist of stock tickers. The backend ingests each company's SEC EDGAR
filings (10-K/10-Q), diffs consecutive filings for material numeric changes, and computes
forensic-accounting red-flag scores (Piotroski F-Score, Altman Z-Score, Beneish M-Score).
Alerts are pushed to the mobile app when a new filing shows a material change or a score
crosses a risk threshold.

## Project structure

```
mobile/                 React Native (Expo) app
server/                 Node/TypeScript API + SEC EDGAR ingestion + scoring
packages/shared-types/  Shared DTOs/zod schemas used by mobile and server
```

## Data source

All financial data comes from [SEC EDGAR](https://www.sec.gov/edgar) — free, no API key
required. Every request must include a descriptive `User-Agent` header (see `.env.example`)
or SEC will reject it with a 403.

## Getting started

```bash
cp .env.example .env      # fill in EDGAR_USER_AGENT with a real contact
docker compose up -d      # local Postgres
pnpm install
pnpm --filter server prisma migrate dev
pnpm run ingest:once      # seeds AAPL/MSFT, ingests filings, computes scores
pnpm run server:dev
pnpm run mobile:start
```

See `.claude/plans` (if present) or project docs for the full MVP scope and build order.
