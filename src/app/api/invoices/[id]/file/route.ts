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
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // If local file URL
  if (invoice.fileUrl.startsWith("/uploads/")) {
    const relativePath = invoice.fileUrl.replace(/^\//, "");
    const subPath = relativePath.replace(/^uploads[/\\]/, "");
    const localFilePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath);

    if (!fs.existsSync(localFilePath)) {
      return NextResponse.json({ error: "File not found on server" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const mimeType = invoice.mimeType || "application/pdf";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.fileName)}"`,
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  // If remote URL (e.g. Supabase Storage), redirect or proxy
  return NextResponse.redirect(invoice.fileUrl);
}
