import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Standard REST endpoint for polling order updates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lastCheckedAtParam = searchParams.get("lastCheckedAt");
  
  if (!lastCheckedAtParam) {
    return NextResponse.json({ type: "connected" });
  }

  try {
    const lastCheckedAt = new Date(lastCheckedAtParam);
    const updatedOrders = await prisma.order.findMany({
      where: {
        updatedAt: { gt: lastCheckedAt },
      },
      select: { id: true, status: true, orderNumber: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (updatedOrders.length > 0) {
      return NextResponse.json({ type: "update", changes: updatedOrders });
    }
    
    return NextResponse.json({ type: "no_update" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to poll" }, { status: 500 });
  }
}
