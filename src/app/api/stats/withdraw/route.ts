import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/stats/withdraw - Fetch withdrawal history
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const cashierId = searchParams.get("cashierId");
    
    const history = await prisma.commissionWithdrawal.findMany({
      where: {
        ...(cashierId ? { userId: cashierId } : {})
      },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// POST /api/stats/withdraw - Process withdrawal
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, amount, available } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    if (amount > available) {
      return NextResponse.json({ error: "Số tiền muốn rút vượt quá số dư khả dụng" }, { status: 400 });
    }

    const withdrawal = await prisma.commissionWithdrawal.create({
      data: {
        userId,
        amount,
        note: `Rút tiền từ Admin`,
      }
    });

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true }});
    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Rút tiền hoa hồng",
        details: `Rút ${amount.toLocaleString('vi-VN')} đ cho nhân viên ${targetUser?.name || 'Không rõ'}`,
      }
    });

    return NextResponse.json({ success: true, withdrawal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process withdrawal" }, { status: 500 });
  }
}
