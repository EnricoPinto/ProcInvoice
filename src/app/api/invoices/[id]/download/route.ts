import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: authed.userId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Audit log download
  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "DOWNLOAD_INVOICE",
      resource: `invoice:${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // If cloud storage URL, redirect
  if (invoice.fileUrl.startsWith("http://") || invoice.fileUrl.startsWith("https://")) {
    return NextResponse.redirect(invoice.fileUrl);
  }

  // Check local filesystem locations
  const filename = path.basename(invoice.fileUrl);
  const possiblePaths = [
    path.join(process.cwd(), "uploads", authed.userId, filename),
    path.join(tmpdir(), "uploads", authed.userId, filename),
  ];

  let foundPath: string | null = null;
  for (const p of possiblePaths) {
    if (existsSync(/*turbopackIgnore: true*/ p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath) {
    return NextResponse.json(
      { error: "Original file is not found on disk" },
      { status: 404 }
    );
  }

  const fileBuffer = await readFile(/*turbopackIgnore: true*/ foundPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": invoice.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(invoice.fileName)}"`,
    },
  });
}
