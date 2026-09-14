import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      // Admins can view any invoice; regular users can view their own
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
    },
    include: {
      fileRecord: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // 1. If stored in database as binary buffer (100% persistent on Vercel)
  if (invoice.fileRecord?.data) {
    return new NextResponse(Buffer.from(invoice.fileRecord.data), {
      status: 200,
      headers: {
        "Content-Type": invoice.mimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.fileName)}"`,
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // 2. Check local disk or /tmp disk
  if (invoice.fileUrl.startsWith("/uploads/")) {
    const relativePath = invoice.fileUrl.replace(/^\//, "");
    const subPath = relativePath.replace(/^uploads[/\\]/, "");
    const localFilePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath);
    const tmpFilePath = path.join(require("os").tmpdir(), "uploads", subPath);

    const targetPath = fs.existsSync(localFilePath)
      ? localFilePath
      : fs.existsSync(tmpFilePath)
      ? tmpFilePath
      : null;

    if (targetPath) {
      const fileBuffer = fs.readFileSync(targetPath);
      const mimeType = invoice.mimeType || "application/pdf";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.fileName)}"`,
          "X-Frame-Options": "SAMEORIGIN",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  // 3. If remote URL (e.g. Supabase Storage), redirect
  if (invoice.fileUrl.startsWith("http://") || invoice.fileUrl.startsWith("https://")) {
    return NextResponse.redirect(invoice.fileUrl);
  }

  // 4. Return an informative SVG placeholder image if file was not cached on ephemeral serverless storage
  const cleanName = invoice.fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="none">
    <rect width="600" height="800" fill="#0f172a" rx="16"/>
    <rect x="24" y="24" width="552" height="752" stroke="#334155" stroke-dasharray="8 8" stroke-width="2" rx="12"/>
    <circle cx="300" cy="310" r="50" fill="#1e293b"/>
    <path d="M280 290h40v40h-40z" stroke="#818cf8" stroke-width="3" fill="none" rx="4"/>
    <path d="M290 280v20M310 280v20" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round"/>
    <text x="300" y="400" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700">${cleanName}</text>
    <text x="300" y="435" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="13">Original document preview not cached on serverless disk.</text>
    <text x="300" y="460" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="12">All extracted fields and table line items are safely preserved.</text>
    <rect x="150" y="500" width="300" height="42" rx="8" fill="#1e1b4b" stroke="#4338ca" stroke-width="1"/>
    <text x="300" y="526" text-anchor="middle" fill="#c7d2fe" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">Re-upload to view original document image</text>
  </svg>`;

  return new NextResponse(placeholderSvg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache",
    },
  });
}
