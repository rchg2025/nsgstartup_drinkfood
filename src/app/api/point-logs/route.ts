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
    const q = searchParams.get("q");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // Only fetch REDEEM logs as per requirement?
    // "Thêm một tab Lịch sử đổi điểm sẽ ghi nhận lại thời gian đổi điểm, số điểm đã đổi..."
    // Wait, the user said "Lịch sử đổi điểm". We can fetch all or just REDEEM. 
    // I'll fetch just REDEEM if action=REDEEM is passed, else fetch all.
    const action = searchParams.get("action");

    let whereClause: any = {};

    if (action) {
      if (action === "REDEEM") {
        whereClause.action = { in: ["REDEEM", "REDEEM_CAMPAIGN"] };
      } else {
        whereClause.action = action;
      }
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(`${startDate}T00:00:00.000+07:00`);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(`${endDate}T23:59:59.999+07:00`);
      }
    }

    if (q) {
      whereClause.customer = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } }
        ]
      };
    }

    const logs = await prisma.pointLog.findMany({
      where: whereClause,
      include: {
        customer: true,
        order: { select: { orderNumber: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
