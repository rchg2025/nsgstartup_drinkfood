import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { pointsToRedeem } = await req.json();

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: "Khách hàng không tồn tại" }, { status: 404 });
    }

    if (pointsToRedeem <= 0) {
      return NextResponse.json({ error: "Điểm đổi phải lớn hơn 0" }, { status: 400 });
    }

    if (customer.currentPoints < pointsToRedeem) {
      return NextResponse.json({ error: "Điểm hiện tại không đủ" }, { status: 400 });
    }

    // Process redemption
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        currentPoints: { decrement: pointsToRedeem },
        redeemedPoints: { increment: pointsToRedeem }
      }
    });

    await prisma.pointLog.create({
      data: {
        customerId: id,
        action: "REDEEM",
        points: pointsToRedeem,
        note: "Đổi điểm nhận ưu đãi/quà tặng"
      }
    });

    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi hệ thống khi đổi điểm" }, { status: 500 });
  }
}
