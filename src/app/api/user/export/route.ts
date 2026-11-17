import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { decrypt, decryptJson } from "@/lib/encryption";
import { BRANDING } from "@/lib/branding";

export async function GET(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = authed.userId;

  const [user, company, invoices, settings, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, accountType: true, role: true, country: true, createdAt: true },
    }),
    prisma.companyProfile.findUnique({ where: { userId } }),
    // individualProfile removed — all accounts are COMPANY
    prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Decrypt profiles for full user export
  let decryptedCompany = null;
  if (company) {
    decryptedCompany = {
      ...company,
      vatNumber: company.vatNumber ? decrypt(company.vatNumber) : null,
      iban: company.iban ? decrypt(company.iban) : null,
      address: company.address ? decrypt(company.address) : null,
      companyEmail: company.companyEmail ? decrypt(company.companyEmail) : null,
      contactName: company.contactName ? decrypt(company.contactName) : "",
      contactDesignation: company.contactDesignation ? decrypt(company.contactDesignation) : null,
    };
  }

  // Individual profile removed — all accounts are now COMPANY type
  const decryptedInvoices = invoices.map((inv) => ({
    ...inv,
    extractedData: decryptJson(inv.extractedData) || inv.extractedData,
  }));

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: "EXPORT_DATA",
      resource: "gdpr:user_export",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    },
  });

  const exportData = {
    system: BRANDING.name,
    logo: BRANDING.logo,
    exportDate: new Date().toISOString(),
    complianceNotice: "GDPR Article 20 - Right to Data Portability Export",
    user,
    profile: decryptedCompany,
    settings,
    invoices: decryptedInvoices,
    auditLogs,
  };

  const jsonStr = JSON.stringify(exportData, null, 2);

  return new NextResponse(jsonStr, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="procinvoice_gdpr_export_${userId}.json"`,
    },
  });
}
