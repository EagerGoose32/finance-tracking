import { prisma } from "../db/client";
import { getDefaultUser } from "../db/defaultUser";
import { resolveTicker } from "./tickerResolver";
import { ingestCompany } from "./jobs/ingestCompany";

const SEED_TICKERS = ["AAPL", "MSFT"];

async function main() {
  const user = await getDefaultUser();

  for (const ticker of SEED_TICKERS) {
    const resolved = await resolveTicker(ticker);
    if (!resolved) {
      console.error(`Could not resolve ticker ${ticker}`);
      continue;
    }

    const company = await prisma.company.upsert({
      where: { cik: resolved.cik },
      update: {},
      create: { cik: resolved.cik, ticker: resolved.ticker, name: resolved.name },
    });

    await prisma.watchlistItem.upsert({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      update: {},
      create: { userId: user.id, companyId: company.id },
    });

    console.log(`Ingesting ${company.ticker} (${company.name})...`);
    const result = await ingestCompany(company);
    console.log(
      `  -> ${result.newFilingsCount} new filing(s), ${result.errors.length} error(s)`
    );
    for (const err of result.errors) console.error(`  ! ${err}`);
  }

  console.log("Done. Run `pnpm --filter server prisma studio` to inspect the data.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
