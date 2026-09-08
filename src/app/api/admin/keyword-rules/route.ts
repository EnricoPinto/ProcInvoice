import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-utils";
import { ensureDefaultKeywordRules } from "@/lib/seed-keywords";

export async function GET(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  await ensureDefaultKeywordRules();

  const rules = await prisma.keywordRule.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  let body: {
    fieldName: string;
    keywords: string[] | string;
    matchType?: string;
    regexPattern?: string;
    enabled?: boolean;
    priority?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.fieldName || !body.keywords) {
    return NextResponse.json({ error: "fieldName and keywords are required" }, { status: 400 });
  }

  const kwStr = typeof body.keywords === "string" ? body.keywords : JSON.stringify(body.keywords);

  const rule = await prisma.keywordRule.create({
    data: {
      fieldName: body.fieldName,
      keywords: kwStr,
      matchType: body.matchType || "EXACT",
      regexPattern: body.regexPattern || null,
      enabled: body.enabled ?? true,
      priority: body.priority ?? 0,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "CREATE_KEYWORD_RULE",
      resource: `rule:${rule.id}`,
      details: { fieldName: rule.fieldName },
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
