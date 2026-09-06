import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recognizeInvoice } from "@/lib/ocr";
import { rateLimit, rateLimitResponse, requireAuth } from "@/lib/api-utils";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/utils";
import { encryptJson } from "@/lib/encryption";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 uploads per hour per user
  if (!rateLimit(`upload:${authed.userId}`, 20, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const skipWarning = formData.get("skipWarning") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only PDF, JPG, PNG, and WebP are accepted." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Detect page count for PDFs
  let pageCount = 1;
  if (file.type === "application/pdf") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      pageCount = pdfData.numpages;
    } catch (e) {
      console.error("PDF parse error:", e);
    }
  }

  // If multi-page and user hasn't confirmed, return page count for modal
  if (pageCount > 1 && !skipWarning) {
    return NextResponse.json({ multiPage: true, pageCount }, { status: 200 });
  }

  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  let fileUrl = `/uploads/${authed.userId}/${uniqueName}`;

  // If Supabase Storage or S3 credentials provided, upload to cloud bucket
  if (process.env.STORAGE_BUCKET_URL && process.env.STORAGE_ACCESS_KEY) {
    try {
      const bucketName = process.env.STORAGE_BUCKET_NAME || "invoices";
      const remotePath = `${authed.userId}/${uniqueName}`;
      const uploadEndpoint = `${process.env.STORAGE_BUCKET_URL}/object/${bucketName}/${remotePath}`;
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STORAGE_ACCESS_KEY}`,
          "Content-Type": file.type,
        },
        body: buffer,
      });
      if (res.ok) {
        fileUrl = `${process.env.STORAGE_BUCKET_URL}/object/public/${bucketName}/${remotePath}`;
      }
    } catch (storageErr) {
      console.warn("Cloud storage upload error:", storageErr);
    }
  }

  // Also write to local/tmp disk if filesystem allows
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const baseUploadDir = isVercel
      ? path.join(require("os").tmpdir(), "uploads")
      : path.join(process.cwd(), "uploads");
    const uploadDir = path.join(baseUploadDir, authed.userId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);
  } catch (fsErr) {
    console.warn("Local disk write skipped (serverless environment):", fsErr);
  }

  // Create invoice record
  const invoice = await prisma.invoice.create({
    data: {
      userId: authed.userId,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      pageCount,
      status: "PROCESSING",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "UPLOAD_INVOICE",
      resource: `invoice:${invoice.id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  // Run OCR
  runOCR(invoice.id, buffer, file.type, authed.userId, req.headers.get("x-forwarded-for") || "unknown").catch(console.error);

  return NextResponse.json({ success: true, invoiceId: invoice.id }, { status: 201 });
}

async function runOCR(invoiceId: string, buffer: Buffer, mimeType: string, userId: string, ipAddress: string) {
  try {
    const extractedData = await recognizeInvoice(buffer, mimeType);
    const encrypted = encryptJson(extractedData);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PROCESSED",
        extractedData: encrypted as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "OCR_COMPLETE",
        resource: `invoice:${invoiceId}`,
        ipAddress,
      },
    });
  } catch (err) {
    console.error("OCR error:", err);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "FAILED" },
    });
  }
}

