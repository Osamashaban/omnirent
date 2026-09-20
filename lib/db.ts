import { PrismaClient } from "@prisma/client";

// Next.js reloads modules in development, which would otherwise create a new
// database client (and a new connection pool) on every edit until the database
// refuses further connections. Caching the client on `globalThis` keeps exactly
// one instance alive across reloads. In production the module is evaluated once
// anyway, so the cache is a no-op.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
