import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { decryptJson, encryptJson } from "@/lib/encryption";
import { rm } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: authed.userId }, // strict owner check
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Decrypt extractedData for response if encrypted string
  const decryptedData = decryptJson(invoice.extractedData) || invoice.extractedData;

  // Access traceability audit log (ISO 27001)
  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "VIEW_INVOICE",
      resource: `invoice:${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({
    invoice: {
      ...invoice,
      extractedData: decryptedData,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: authed.userId },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  let body: { extractedData?: object; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const encryptedData = body.extractedData ? (encryptJson(body.extractedData) as unknown as import("@prisma/client").Prisma.InputJsonValue) : undefined;

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      ...(encryptedData !== undefined && { extractedData: encryptedData }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "EDIT_INVOICE",
      resource: `invoice:${id}`,
      details: { fields: Object.keys(body) },
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({
    invoice: {
      ...updated,
      extractedData: body.extractedData || decryptJson(updated.extractedData) || updated.extractedData,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: authed.userId },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Remove local file if present
  try {
    const filename = path.basename(invoice.fileUrl);
    const fullPath = path.join(process.cwd(), "uploads", authed.userId, filename);
    if (existsSync(fullPath)) {
      await rm(fullPath, { force: true });
    }
  } catch {
    // continue
  }

  await prisma.invoice.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "DELETE_INVOICE",
      resource: `invoice:${id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  return NextResponse.json({ success: true });
}
