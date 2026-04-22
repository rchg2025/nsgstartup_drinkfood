import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const targetRole = searchParams.get("role");
    const userId = session.user?.id;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetRole: targetRole as any },
          { targetUserId: userId },
        ],
      },
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { ids } = body;
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
