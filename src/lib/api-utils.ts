import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Server-side rate limiter (in-memory, suitable for single-instance dev).
 * Replace with Redis (e.g. Upstash) for production multi-instance setups.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= limit) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}

/** Require an authenticated session — returns user id, accountType, and role or null */
export async function requireAuth(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req?: NextRequest
): Promise<{ userId: string; accountType: string; role: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    accountType: (session.user.accountType as string) || "INDIVIDUAL",
    role: (session.user.role as string) || "USER",
  };
}

/** Require an admin session — returns user or null */
export async function requireAdmin(
  req?: NextRequest
): Promise<{ userId: string; accountType: string; role: string } | null> {
  const authed = await requireAuth(req);
  if (!authed || authed.role !== "ADMIN") return null;
  return authed;
}
