import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-utils";
import { ensureDefaultKeywordRules } from "@/lib/seed-keywords";

export async function GET(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  await ensureDefaultKeywordRules();

  const rules = await prisma.validationRule.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  let body: {
    fieldName: string;
    name: string;
    ruleType?: string;
    regexPattern?: string;
    formatHint?: string;
    enabled?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.fieldName || !body.name) {
    return NextResponse.json({ error: "fieldName and name are required" }, { status: 400 });
  }

  const rule = await prisma.validationRule.create({
    data: {
      fieldName: body.fieldName,
      name: body.name,
      ruleType: body.ruleType || "REGEX",
      regexPattern: body.regexPattern || null,
      formatHint: body.formatHint || null,
      enabled: body.enabled ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "CREATE_VALIDATION_RULE",
      resource: `val_rule:${rule.id}`,
      details: { fieldName: rule.fieldName, name: rule.name },
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
