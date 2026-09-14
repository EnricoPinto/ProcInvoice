import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { decryptJson } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const status = (searchParams.get("status") || "ALL").toUpperCase();
  const docType = (searchParams.get("docType") || "ALL").trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sortBy = searchParams.get("sortBy") || "date"; // "date" | "fileName" | "status" | "size"
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

  // Fetch all invoices belonging to user with uploader profile details
  const rawInvoices = await prisma.invoice.findMany({
    where: { userId: authed.userId },
    include: {
      user: {
        select: {
          email: true,
          company: { select: { companyName: true } },
          individual: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with decrypted vendor and document type
  const enriched = rawInvoices.map((inv) => {
    let data: any = null;
    try {
      data = decryptJson(inv.extractedData) || inv.extractedData;
    } catch {
      data = null;
    }

    const uploaderName =
      inv.user?.company?.companyName ||
      inv.user?.individual?.fullName ||
      inv.user?.email ||
      "You";

    return {
      id: inv.id,
      fileName: inv.fileName,
      fileSize: inv.fileSize,
      mimeType: inv.mimeType,
      pageCount: inv.pageCount,
      status: inv.status,
      failureReason: inv.failureReason,
      createdAt: inv.createdAt.toISOString(),
      uploaderName,
      vendorName: data?.vendorName || "",
      documentType: data?.documentType || "Factuur",
      invoiceNumber: data?.invoiceNumber || "",
      totalAmount: data?.totalAmount ?? null,
    };
  });

  // Apply filters
  let filtered = enriched.filter((inv) => {
    // Status filter
    if (status !== "ALL" && inv.status !== status) {
      return false;
    }

    // Document type filter
    if (docType !== "ALL" && inv.documentType !== docType) {
      return false;
    }

    // Search filter (matches filename, vendor, or invoice number)
    if (search) {
      const matchFile = inv.fileName.toLowerCase().includes(search);
      const matchVendor = inv.vendorName.toLowerCase().includes(search);
      const matchNum = inv.invoiceNumber.toLowerCase().includes(search);
      if (!matchFile && !matchVendor && !matchNum) return false;
    }

    // Date range filters
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime()) && new Date(inv.createdAt) < from) {
        return false;
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      // Set to end of day if only YYYY-MM-DD was provided
      to.setHours(23, 59, 59, 999);
      if (!isNaN(to.getTime()) && new Date(inv.createdAt) > to) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    let res = 0;
    if (sortBy === "fileName") {
      res = a.fileName.localeCompare(b.fileName);
    } else if (sortBy === "status") {
      res = a.status.localeCompare(b.status);
    } else if (sortBy === "size") {
      res = a.fileSize - b.fileSize;
    } else {
      // Default: date
      res = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortOrder === "asc" ? res : -res;
  });

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    invoices: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}
