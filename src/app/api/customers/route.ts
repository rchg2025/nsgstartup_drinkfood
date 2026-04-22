import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "CASHIER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    let whereClause = {};
    if (q) {
      whereClause = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } }
        ]
      };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { currentPoints: "desc" }
    });

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
