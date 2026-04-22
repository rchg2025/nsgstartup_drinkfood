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
    const users = await prisma.user.findMany({
      where: {
        active: true,
        name: { not: "quantri" },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users list:", error);
    return NextResponse.json({ error: "Failed to fetch users list" }, { status: 500 });
  }
}
