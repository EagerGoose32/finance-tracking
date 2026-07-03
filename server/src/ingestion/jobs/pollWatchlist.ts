import { prisma } from "../../db/client";
import { ingestCompany } from "./ingestCompany";
import { sendPendingAlertPushes } from "../../notifications/pushSender";

export async function pollWatchlist(): Promise<void> {
  const job = await prisma.ingestionJob.create({ data: { status: "running" } });

  const companies = await prisma.company.findMany({
    where: { watchlistItems: { some: {} } },
  });

  const errors: string[] = [];
  let companiesProcessed = 0;

  for (const company of companies) {
    try {
      const result = await ingestCompany(company);
      errors.push(...result.errors);
      companiesProcessed++;
    } catch (err) {
      errors.push(`${company.ticker}: ${(err as Error).message}`);
    }
  }

  await sendPendingAlertPushes();

  await prisma.ingestionJob.update({
    where: { id: job.id },
    data: {
      finishedAt: new Date(),
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      companiesProcessed,
      errors,
    },
  });
}
