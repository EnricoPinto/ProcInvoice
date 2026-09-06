import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: authed.userId },
  });

  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { skipMultiPageWarning?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: authed.userId },
    update: {
      ...(body.skipMultiPageWarning !== undefined && {
        skipMultiPageWarning: body.skipMultiPageWarning,
      }),
    },
    create: {
      userId: authed.userId,
      skipMultiPageWarning: body.skipMultiPageWarning ?? false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: authed.userId,
      action: "SETTINGS_UPDATE",
      resource: "user_settings",
      details: body,
    },
  });

  return NextResponse.json({ settings });
}
