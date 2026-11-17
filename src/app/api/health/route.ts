import { NextResponse } from "next/server";

/**
 * Health check endpoint — safe to expose, shows no secrets.
 * Visit /api/health on the deployed app to diagnose env issues.
 */
export async function GET() {
  const checks = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    FIELD_ENCRYPTION_KEY: !!process.env.FIELD_ENCRYPTION_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: !!process.env.VERCEL,
    // Partial URL for verification (not the secret)
    DB_HOST: process.env.DATABASE_URL
      ? (() => {
          try {
            return new URL(process.env.DATABASE_URL).hostname;
          } catch {
            return "invalid-url";
          }
        })()
      : "NOT_SET",
  };

  // Try a quick DB connection
  let dbStatus = "untested";
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (e: unknown) {
    dbStatus = `failed: ${e instanceof Error ? e.message : String(e)}`;
  }

  const allGood =
    checks.DATABASE_URL &&
    checks.NEXTAUTH_SECRET &&
    checks.FIELD_ENCRYPTION_KEY;

  return NextResponse.json(
    {
      status: allGood ? "ok" : "degraded",
      dbConnection: dbStatus,
      envChecks: checks,
    },
    { status: allGood ? 200 : 500 }
  );
}

