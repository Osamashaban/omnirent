import { PrismaClient } from "@prisma/client";

// Next.js reloads modules in development, which would otherwise create a new
// database client (and a new connection pool) on every edit until the database
// refuses further connections. Caching the client on `globalThis` keeps exactly
// one instance alive across reloads. In production the module is evaluated once
// anyway, so the cache is a no-op.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Neon's free plan puts the database to sleep after a few idle minutes. The
// first request after that has to wait while it wakes up, and Prisma's default
// 5 second connect timeout can run out first, which shows the visitor
// "Application error: a server-side exception". Give it 20 seconds instead,
// unless the connection string already sets its own connect_timeout.
export function withWakeUpTimeout(url: string | undefined): string | undefined {
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "connect_timeout=20";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: withWakeUpTimeout(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
