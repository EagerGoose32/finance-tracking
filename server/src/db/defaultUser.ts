import { prisma } from "./client";

const DEFAULT_USER_EMAIL = "owner@finance-tracking.local";

/**
 * MVP has no login flow — every request acts on behalf of a single
 * implicit user, created lazily on first use.
 */
export async function getDefaultUser() {
  return prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: { email: DEFAULT_USER_EMAIL },
  });
}
