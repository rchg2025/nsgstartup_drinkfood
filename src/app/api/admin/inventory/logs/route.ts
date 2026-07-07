import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: {
        product: { select: { name: true } },
        topping: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory logs" }, { status: 500 });
  }
}
