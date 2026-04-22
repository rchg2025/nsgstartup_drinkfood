import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { customerPhone, customerName } = await req.json();

    if (!customerPhone) {
      return NextResponse.json({ error: "Số điện thoại là bắt buộc" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.isPointAwarded) {
      return NextResponse.json({ error: "Đơn hàng này đã được tích điểm" }, { status: 400 });
    }

    const earnedPoints = Math.floor(order.finalAmount * 0.01);

    if (earnedPoints <= 0) {
      return NextResponse.json({ error: "Giá trị đơn hàng không đủ để tích điểm" }, { status: 400 });
    }

    // Find or create customer
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: customerPhone }
    });

    let customer;

    if (existingCustomer) {
      if (!existingCustomer.active) {
        return NextResponse.json({ error: "Tài khoản khách hàng đang bị khóa" }, { status: 400 });
      }
      const nameToUpdate = (customerName && customerName !== "Khách") ? customerName : undefined;
      customer = await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          ...(nameToUpdate ? { name: nameToUpdate } : {}),
          totalPoints: { increment: earnedPoints },
          currentPoints: { increment: earnedPoints }
        }
      });
    } else {
      const cName = (customerName && customerName !== "Khách") ? customerName : "Khách hàng mới";
      customer = await prisma.customer.create({
        data: {
          phone: customerPhone,
          name: cName,
          totalPoints: earnedPoints,
          currentPoints: earnedPoints
        }
      });
    }

    // Award point log
    await prisma.pointLog.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        action: "EARN",
        points: earnedPoints,
        note: `Tích điểm thủ công từ hóa đơn #${order.orderNumber}`
      }
    });

    // Link order to customer and set isPointAwarded
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customerPhone,
        isPointAwarded: true
      }
    });

    return NextResponse.json({ success: true, earnedPoints, customer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
