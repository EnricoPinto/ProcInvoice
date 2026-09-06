import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { rm } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function DELETE(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = authed.userId;

  try {
    // 1. Delete user files directory
    const uploadDir = path.join(process.cwd(), "uploads", userId);
    if (existsSync(uploadDir)) {
      await rm(uploadDir, { recursive: true, force: true });
    }

    // 2. Audit erasure request
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE_ACCOUNT",
        resource: `user:${userId}`,
        details: { notice: "GDPR Article 17 Right to Erasure executed" },
      },
    });

    // 3. Cascade delete user account in database
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: "Account and associated data deleted permanently." });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
