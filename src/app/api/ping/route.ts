import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as any).id;

  try {
    await prisma.user.update({
      where: { id: currentUserId },
      data: { lastActive: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail silently on ping
    return NextResponse.json({ error: "Ping failed" }, { status: 500 });
  }
}
