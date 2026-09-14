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
    name?: string;
    ruleType?: string;
    regexPattern?: string | null;
    formatHint?: string | null;
    enabled?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.validationRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const updated = await prisma.validationRule.update({
    where: { id },
    data: {
      ...(body.fieldName !== undefined && { fieldName: body.fieldName }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.ruleType !== undefined && { ruleType: body.ruleType }),
      ...(body.regexPattern !== undefined && { regexPattern: body.regexPattern }),
      ...(body.formatHint !== undefined && { formatHint: body.formatHint }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "UPDATE_VALIDATION_RULE",
      resource: `val_rule:${id}`,
      details: { fieldName: updated.fieldName, name: updated.name },
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

  await prisma.validationRule.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "DELETE_VALIDATION_RULE",
      resource: `val_rule:${id}`,
    },
  });

  return NextResponse.json({ success: true });
}
