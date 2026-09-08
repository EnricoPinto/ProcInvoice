import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  const { id } = await params;
  let body: {
    fieldName?: string;
    keywords?: string[] | string;
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

  const existing = await prisma.keywordRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const kwStr = body.keywords
    ? typeof body.keywords === "string"
      ? body.keywords
      : JSON.stringify(body.keywords)
    : undefined;

  const updated = await prisma.keywordRule.update({
    where: { id },
    data: {
      ...(body.fieldName !== undefined && { fieldName: body.fieldName }),
      ...(kwStr !== undefined && { keywords: kwStr }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.regexPattern !== undefined && { regexPattern: body.regexPattern }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.priority !== undefined && { priority: body.priority }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "UPDATE_KEYWORD_RULE",
      resource: `rule:${id}`,
      details: { fieldName: updated.fieldName },
    },
  });

  return NextResponse.json({ rule: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await requireAdmin(req);
  if (!authed) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

  const { id } = await params;

  await prisma.keywordRule.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "DELETE_KEYWORD_RULE",
      resource: `rule:${id}`,
    },
  });

  return NextResponse.json({ success: true });
}
