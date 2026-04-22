import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000+07:00`);
      const end = new Date(`${endDate}T23:59:59.999+07:00`);
      where.createdAt = { gte: start, lte: end };
    } else if (startDate) {
      const start = new Date(`${startDate}T00:00:00.000+07:00`);
      where.createdAt = { gte: start };
    } else if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999+07:00`);
      where.createdAt = { lte: end };
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // A helper method in case frontend needs to log custom UI operations
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, details } = await req.json();
    const log = await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action,
        details,
      }
    });
    return NextResponse.json({ success: true, log });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 });
  }
}
