import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-utils";
import { decrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      accountType: true,
      country: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          companyName: true,
          businessType: true,
          contactName: true,
          coc: true,
        },
      },
      individual: {
        select: {
          id: true,
          fullName: true,
        },
      },
      _count: {
        select: {
          invoices: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Decrypt contactName if present
  const sanitized = users.map((u) => {
    let contactName = u.company?.companyName || u.individual?.fullName || "";
    if (u.company?.contactName) {
      try {
        contactName = decrypt(u.company.contactName);
      } catch {
        // fallback
      }
    }

    return {
      id: u.id,
      email: u.email,
      role: u.role,
      accountType: u.accountType,
      country: u.country,
      createdAt: u.createdAt,
      companyName: u.company?.companyName || null,
      contactName,
      businessType: u.company?.businessType || null,
      coc: u.company?.coc || null,
      invoiceCount: u._count.invoices,
    };
  });

  return NextResponse.json({ accounts: sanitized });
}

export async function DELETE(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  let body: { userId: string; confirmText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Prevent admin from deleting their own account
  if (body.userId === authed.userId) {
    return NextResponse.json({ error: "You cannot delete your own active administrator account" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: body.userId },
    include: { company: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const isCompany = user.accountType === "COMPANY";

  await prisma.$transaction(async (tx) => {
    // Delete user cascades to CompanyProfile, IndividualProfile, Invoices, UserSettings, AuditLogs
    await tx.user.delete({ where: { id: body.userId } });

    await tx.auditLog.create({
      data: {
        userId: authed.userId,
        action: isCompany ? "DELETE_COMPANY_ACCOUNT" : "DELETE_USER_ACCOUNT",
        resource: `user:${body.userId}`,
        details: { email: user.email, accountType: user.accountType },
      },
    });
  });

  return NextResponse.json({ success: true });
}
