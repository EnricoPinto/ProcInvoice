import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-utils";
import { CURRENT_KEY_VERSION } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  // Query audit logs with search params
  const url = new URL(req.url);
  const actionFilter = url.searchParams.get("action");
  const search = url.searchParams.get("search");

  const auditWhere: import("@prisma/client").Prisma.AuditLogWhereInput = {};
  if (actionFilter) auditWhere.action = actionFilter;
  if (search) {
    auditWhere.OR = [
      { resource: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, auditLogs, totalInvoices, flaggedInvoices] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        accountType: true,
        role: true,
        country: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
      },
    }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { isRetentionFlagged: true } }),
  ]);

  return NextResponse.json({
    securityMetrics: {
      activeUsers: users.length,
      currentKeyVersion: CURRENT_KEY_VERSION,
      totalInvoices,
      flaggedInvoices,
      euHostingRegion: "EU (Frankfurt / eu-central-1)",
      iso27001Status: "Compliant — Audit Logging & Key Versioning Active",
    },
    users,
    auditLogs,
  });
}
