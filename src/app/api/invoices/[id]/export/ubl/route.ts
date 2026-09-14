import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/encryption";
import type { ExtractedInvoiceData } from "@/lib/ocr";
import { generateUbl21Xml } from "@/lib/ubl-generator";

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
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const rawData = invoice.extractedData;
  const data = (typeof rawData === "string"
    ? decryptJson(rawData)
    : rawData) as ExtractedInvoiceData | null;

  if (!data) {
    return NextResponse.json(
      { error: "No extracted data available for this invoice" },
      { status: 400 }
    );
  }

  // Only permit XML export for documents classified as "Factuur"
  if (data.classifiedType === "Overige document") {
    return NextResponse.json(
      {
        error:
          "XML export is not supported for documents classified as 'Overige document'. Only 'Factuur' documents can be exported to UBL 2.1 XML.",
      },
      { status: 400 }
    );
  }

  try {
    const xmlContent = generateUbl21Xml(data);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT_UBL_XML",
        resource: `invoice:${invoice.id}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    const safeNumber = (data.invoiceNumber || invoice.id).replace(/[^a-zA-Z0-9-_]/g, "_");

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoice-${safeNumber}-ubl2.1.xml"`,
      },
    });
  } catch (err) {
    console.error("UBL export error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to generate UBL XML" },
      { status: 500 }
    );
  }
}
