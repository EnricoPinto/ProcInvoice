import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Prefer pooler URL for serverless (Supabase transaction pooler on port 6543)
  // Fall back to direct URL if pooler not set
  const rawUrl =
    process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "";
  const connectionString = rawUrl.replace(/^["']|["']$/g, "").trim();

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is missing. " +
        "Make sure it is set in your Vercel project settings under Settings > Environment Variables."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
