import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const authed = await requireAuth(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Web Browser";

  const [settings, lastLoginLog, recentActivities] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId: authed.userId },
    }),
    prisma.auditLog.findFirst({
      where: {
        userId: authed.userId,
        action: "LOGIN",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { userId: authed.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    settings,
    lastLoginAt: lastLoginLog?.createdAt?.toISOString() || recentActivities[0]?.createdAt?.toISOString() || null,
    currentIp,
    userAgent,
    recentActivities: recentActivities.map((act, index) => ({
      id: act.id,
      action: act.action,
      resource: act.resource,
      ipAddress: act.ipAddress || "127.0.0.1",
      createdAt: act.createdAt.toISOString(),
      isCurrent: index === 0,
    })),
  });
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
