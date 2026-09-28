import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateEnv } from "@/lib/env";

// Validate required environment variables on first import
validateEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Pass PoolConfig to PrismaPg — it manages the pool lifecycle internally,
  // which is more reliable for serverless than managing our own pg.Pool.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    min: 0,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache in all environments — module is only loaded once per serverless container
globalForPrisma.prisma = prisma;
