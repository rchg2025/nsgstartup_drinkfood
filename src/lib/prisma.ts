import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy initialization via Proxy — PrismaNeon factory only creates a Pool
// on first actual DB query, not at module import time (which happens during Next.js build)
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      const connectionString = process.env.POSTGRES_PRISMA_URL;
      if (!connectionString) {
        throw new Error("POSTGRES_PRISMA_URL environment variable is not set");
      }
      // PrismaNeon is a factory that internally creates its own Pool from config
      const adapter = new PrismaNeon({ connectionString } as any);
      globalForPrisma.prisma = new PrismaClient({ adapter } as any);
    }
    return (globalForPrisma.prisma as any)[prop];
  },
});
