import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";
import { rateLimit, rateLimitResponse } from "@/lib/api-utils";
import { validateVatNumber, validateKvkNumber, validateIbanNumber } from "@/lib/compliance";

const registerSchema = z
  .object({
    contactName: z.string().min(2, "Contact person name is required"),
    country: z.string().min(2, "Country is required").default("NL"),
    businessType: z.string().min(1, "Please select a business type"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    termsAccepted: z
      .boolean()
      .refine((v) => v === true, { message: "Must accept Terms of Service" }),
    privacyAccepted: z
      .boolean()
      .refine((v) => v === true, {
        message: "Must accept Privacy Policy & GDPR terms",
      }),

    // Conditional: At least ONE of coc (KVK/COC) or vatNumber is required
    coc: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),

    // Optional fields
    companyName: z.string().optional().nullable(),
    iban: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    companyEmail: z.string().optional().nullable(),
    contactDesignation: z.string().optional().nullable(),
    accountType: z.string().optional().default("COMPANY"),
  })
  .refine(
    (d) =>
      (typeof d.coc === "string" && d.coc.trim().length > 0) ||
      (typeof d.vatNumber === "string" && d.vatNumber.trim().length > 0),
    {
      message: "At least one of KVK/COC number OR VAT number is required",
      path: ["coc"],
    }
  );

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  if (!rateLimit(`register:${ip}`, 10, 15 * 60 * 1000)) {
    return rateLimitResponse();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.disclaimer && b.termsAccepted === undefined) {
      b.termsAccepted = b.disclaimer;
    }
    if (b.disclaimer && b.privacyAccepted === undefined) {
      b.privacyAccepted = b.disclaimer;
    }
    if (typeof b.iban === "string" && b.iban.trim() === "") {
      delete b.iban;
    }
    if (typeof b.coc === "string" && b.coc.trim() === "") {
      delete b.coc;
    }
    if (typeof b.vatNumber === "string" && b.vatNumber.trim() === "") {
      delete b.vatNumber;
    }
    if (typeof b.companyEmail === "string" && b.companyEmail.trim() === "") {
      delete b.companyEmail;
    }
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
    const firstField = Object.keys(fieldErrors)[0];
    const firstMsg =
      firstField && fieldErrors[firstField]?.[0]
        ? fieldErrors[firstField]![0]
        : "Validation failed";

    return NextResponse.json(
      { error: firstMsg, details: flattened },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Format validation for provided compliance fields
  if (data.vatNumber && data.vatNumber.trim().length > 0) {
    const vatCheck = validateVatNumber(data.vatNumber.trim(), data.country);
    if (!vatCheck.valid) {
      return NextResponse.json({ error: vatCheck.error }, { status: 400 });
    }
  }

  if (data.coc && data.coc.trim().length > 0) {
    const cocCheck = validateKvkNumber(data.coc.trim(), data.country);
    if (!cocCheck.valid) {
      return NextResponse.json({ error: cocCheck.error }, { status: 400 });
    }
  }

  if (data.iban && data.iban.trim().length > 0) {
    const ibanCheck = validateIbanNumber(data.iban.trim());
    if (!ibanCheck.valid) {
      return NextResponse.json({ error: ibanCheck.error }, { status: 400 });
    }
  }

  try {
    // Check existing user
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          accountType: "COMPANY",
          country: data.country || "NL",
          lastLoginAt: new Date(),
        },
      });

      await tx.userSettings.create({
        data: { userId: user.id },
      });

      const effectiveCompanyName =
        data.companyName?.trim() || data.contactName.trim();

      await tx.companyProfile.create({
        data: {
          userId: user.id,
          companyName: effectiveCompanyName,
          coc: data.coc?.trim() || null,
          businessType: data.businessType,
          vatNumber: data.vatNumber?.trim() ? encrypt(data.vatNumber.trim()) : null,
          iban: data.iban?.trim() ? encrypt(data.iban.trim()) : null,
          address: data.address?.trim() ? encrypt(data.address.trim()) : null,
          companyEmail: data.companyEmail?.trim()
            ? encrypt(data.companyEmail.trim())
            : null,
          contactName: encrypt(data.contactName.trim()),
          contactDesignation: data.contactDesignation?.trim()
            ? encrypt(data.contactDesignation.trim())
            : null,
          termsAccepted: data.termsAccepted,
          privacyAccepted: data.privacyAccepted,
          disclaimerAccepted: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REGISTER",
          resource: "auth",
          ipAddress: ip,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      {
        error:
          (err as Error)?.message || "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
