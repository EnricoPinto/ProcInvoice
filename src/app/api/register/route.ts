import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";
import { rateLimit, rateLimitResponse } from "@/lib/api-utils";
import { validateVatNumber, validateKvkNumber, validateIbanNumber } from "@/lib/compliance";

const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  accountType: z.enum(["COMPANY", "INDIVIDUAL"]),
  country: z.string().default("NL"),
  termsAccepted: z.boolean().refine((v) => v === true, { message: "Must accept Terms of Service" }),
  privacyAccepted: z.boolean().refine((v) => v === true, { message: "Must accept Privacy Policy & GDPR terms" }),
});

const companySchema = baseSchema.extend({
  accountType: z.literal("COMPANY"),
  companyName: z.string().min(2),
  coc: z.string().min(3),
  businessType: z.string().min(1),
  vatNumber: z.string().min(3),
  iban: z.string().min(5),
  address: z.string().min(5),
  companyEmail: z.string().email(),
  contactName: z.string().min(2),
  contactDesignation: z.string().min(1),
});

const individualSchema = baseSchema.extend({
  accountType: z.literal("INDIVIDUAL"),
  fullName: z.string().min(2),
  address: z.string().min(5),
  iban: z.string().optional(),
});

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
  }

  const accountType = (body as Record<string, unknown>)?.accountType;
  const schema = accountType === "COMPANY" ? companySchema : individualSchema;
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
    const firstField = Object.keys(fieldErrors)[0];
    const firstMsg = firstField && fieldErrors[firstField]?.[0]
      ? fieldErrors[firstField]![0]
      : "Validation failed";

    return NextResponse.json(
      { error: firstMsg, details: flattened },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Format validation for NL & EU market compliance
  if (data.accountType === "COMPANY") {
    const cData = data as z.infer<typeof companySchema>;

    const vatCheck = validateVatNumber(cData.vatNumber, cData.country);
    if (!vatCheck.valid) {
      return NextResponse.json({ error: vatCheck.error }, { status: 400 });
    }

    const cocCheck = validateKvkNumber(cData.coc, cData.country);
    if (!cocCheck.valid) {
      return NextResponse.json({ error: cocCheck.error }, { status: 400 });
    }

    const ibanCheck = validateIbanNumber(cData.iban);
    if (!ibanCheck.valid) {
      return NextResponse.json({ error: ibanCheck.error }, { status: 400 });
    }
  } else {
    const iData = data as z.infer<typeof individualSchema>;
    if (iData.iban) {
      const ibanCheck = validateIbanNumber(iData.iban);
      if (!ibanCheck.valid) {
        return NextResponse.json({ error: ibanCheck.error }, { status: 400 });
      }
    }
  }

  try {
    // Check existing user
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
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
          email: data.email,
          passwordHash,
          accountType: data.accountType,
          country: data.country || "NL",
          lastLoginAt: new Date(),
        },
      });

      await tx.userSettings.create({
        data: { userId: user.id },
      });

      if (data.accountType === "COMPANY") {
        const companyData = data as z.infer<typeof companySchema>;
        await tx.companyProfile.create({
          data: {
            userId: user.id,
            companyName: companyData.companyName,
            coc: companyData.coc,
            businessType: companyData.businessType,
            vatNumber: encrypt(companyData.vatNumber),
            iban: encrypt(companyData.iban),
            address: encrypt(companyData.address),
            companyEmail: encrypt(companyData.companyEmail),
            contactName: encrypt(companyData.contactName),
            contactDesignation: encrypt(companyData.contactDesignation),
            termsAccepted: companyData.termsAccepted,
            privacyAccepted: companyData.privacyAccepted,
            disclaimerAccepted: true,
          },
        });
      } else {
        const indData = data as z.infer<typeof individualSchema>;
        await tx.individualProfile.create({
          data: {
            userId: user.id,
            fullName: indData.fullName,
            address: encrypt(indData.address),
            iban: indData.iban ? encrypt(indData.iban) : null,
            termsAccepted: indData.termsAccepted,
            privacyAccepted: indData.privacyAccepted,
            disclaimerAccepted: true,
          },
        });
      }

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
      { error: (err as Error)?.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
