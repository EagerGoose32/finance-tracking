# finance-tracking

A mobile app for auditing public companies' financial filings and tracking discrepancies.

Users maintain a watchlist of stock tickers. The backend ingests each company's SEC EDGAR
filings (10-K/10-Q), diffs consecutive filings for material numeric changes, and computes
forensic-accounting red-flag scores (Piotroski F-Score, Altman Z-Score, Beneish M-Score).
Alerts are pushed to the mobile app when a new filing shows a material change or a score
crosses a risk threshold. The goal is to surface things that would otherwise take a human
analyst hours of manually cross-referencing filings to spot — a sudden restatement, an
accrual-heavy earnings pattern, a leverage ratio quietly creeping up — as soon as a company
files with the SEC.

## Status

This is an MVP scaffold — a working end-to-end slice, not a finished product. Built so far:

- **Data model**: Postgres schema (via Prisma) for companies, filings, XBRL fact snapshots,
  filing diffs, red-flag scores, watchlists, alerts, and push tokens.
- **SEC EDGAR ingestion**: rate-limited client with the required `User-Agent` header, ticker
  → CIK resolution, filing history fetcher, and XBRL "company facts" fetcher.
- **Scoring**: Piotroski F-Score is fully implemented, including a fallback map for SEC's
  inconsistent XBRL tag names across companies/taxonomy years. Altman Z-Score and Beneish
  M-Score are modeled in the schema but not yet implemented (Altman needs a market-cap
  substitute since XBRL doesn't report it; Beneish needs a larger tag-mapping effort).
- **Diff engine**: compares XBRL facts between a company's consecutive same-form-type
  filings (10-K vs. prior 10-K, etc.) and flags line items that moved more than ~12%.
- **Backend API**: watchlist CRUD, company detail, score history, filing list, filing diff,
  alerts, and push-token registration endpoints (Express + Prisma).
- **Mobile app**: Expo/React Native app with four screens — Watchlist, Company Detail,
  Filing Diff, and Alerts — wired to the API and to Expo push notifications.
- **Verified**: both workspaces typecheck cleanly; the server boots and serves all endpoints
  against a real Postgres instance; scoring and diffing logic were checked against
  hand-computed values on synthetic XBRL-shaped data.
- **Not yet verified**: ingestion against live SEC EDGAR data — the sandbox this was built
  in blocks outbound network access to sec.gov, so the EDGAR client code has not been
  exercised against the real API yet.

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
