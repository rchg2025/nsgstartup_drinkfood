import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            toppings: { include: { topping: { select: { id: true, name: true } } } },
          },
        },
        cashier: { select: { id: true, name: true } },
        barista: { select: { id: true, name: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, baristaId, paymentStatus } = body;
    const userId = session?.user?.id as string;
    const role = (session.user as any)?.role;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (status === "PREPARING" && (role === "BARISTA" || role === "CASHIER")) updateData.baristaId = userId;
    if (status === "COMPLETED") updateData.completedAt = new Date();

    const existingOrder = await prisma.order.findUnique({ where: { id }, select: { cashierId: true } });
    if (status === "COMPLETED" && ["CASHIER", "ADMIN"].includes(role)) {
      updateData.cashierId = userId;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: { select: { id: true, name: true } }, toppings: { include: { topping: { select: { id: true, name: true } } } } } },
        cashier: { select: { id: true, name: true } },
      },
    });

    if (status) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "Cập nhật trạng thái",
          details: `Đơn #${order.orderNumber} -> ${status}`,
        }
      });
    }

    // Send notifications based on status changes
    if (status === "PREPARING") {
      // Cashier confirmed, inform Barista
      await prisma.notification.create({
        data: {
          type: "NEW_ORDER",
          title: `Đơn #${order.orderNumber} cần pha chế`,
          message: `Thu ngân đã xác nhận đơn hàng của ${order.customerName || "Khách lẻ"}, vui lòng pha chế.`,
          orderId: order.id,
          targetRole: "BARISTA",
          read: false,
        },
      });
    }
    if (status === "READY") {
      await prisma.notification.create({
        data: {
          type: "ORDER_READY",
          title: `Đơn #${order.orderNumber} sẵn sàng`,
          message: `Đơn hàng của ${order.customerName || "Khách lẻ"} đã pha xong, mời lấy đồ`,
          orderId: order.id,
          targetRole: "CASHIER",
          read: false,
        },
      });
    }
    if (status === "CANCELLED") {
      await prisma.notification.create({
        data: {
          type: "ORDER_CANCELLED",
          title: `Đơn #${order.orderNumber} bị hủy`,
          message: `Đơn hàng đã bị hủy`,
          orderId: order.id,
          targetRole: "BARISTA",
          read: false,
        },
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Prisma cascading delete should handle orderItems and toppings if configured,
    // but just to be safe, delete related toppings and items first if needed.
    // Assuming cascading delete is set. If not, this might throw an error.
    // For now we will rely on cascading delete.
    const order = await prisma.order.findUnique({ where: { id } });
    if (order) {
      await prisma.activityLog.create({
        data: {
          userId: session?.user?.id as string,
          action: "Xoá đơn hàng",
          details: `Đơn #${order.orderNumber} bị xoá`,
        }
      });
    }

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const role = (session.user as any)?.role;

    if (role !== "ADMIN" && role !== "CASHIER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 1. Fetch old order to handle points update if necessary
    const oldOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!oldOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (oldOrder.status === "COMPLETED" || oldOrder.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot edit completed/cancelled order" }, { status: 400 });
    }

    // 2. Fetch new cost prices
    const productIds = body.items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    });
    const costPriceMap = new Map(products.map(p => [p.id, p.costPrice]));

    // 3. Handle Loyalty Points Delta
    if (oldOrder.isPointAwarded && oldOrder.customerPhone) {
      const oldEarned = Math.floor(oldOrder.finalAmount * 0.01);
      const newEarned = Math.floor(body.finalAmount * 0.01);
      const delta = newEarned - oldEarned;

      if (delta !== 0 && oldOrder.customerId) {
        await prisma.customer.update({
          where: { id: oldOrder.customerId },
          data: {
            totalPoints: { increment: delta },
            currentPoints: { increment: delta },
          }
        });
      }
    }

    // 4. In a transaction: delete old items, update order and create new items
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.order.update({
        where: { id },
        data: {
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          totalAmount: body.totalAmount,
          discount: body.discount,
          finalAmount: body.finalAmount,
          paymentMethod: body.paymentMethod,
          paymentStatus: body.paymentStatus,
          note: body.note,
          items: {
            create: body.items.map((item: any) => ({
              product: { connect: { id: item.productId } },
              sizeName: item.sizeName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCostPrice: costPriceMap.get(item.productId) || 0,
              totalPrice: item.totalPrice,
              note: item.note,
              toppings: {
                create: item.toppings?.map((t: any) => ({
                  topping: { connect: { id: t.toppingId } },
                  price: t.price,
                })) || []
              }
            }))
          }
        }
      })
    ]);

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true } }, toppings: { include: { topping: { select: { id: true, name: true } } } } } },
        cashier: { select: { id: true, name: true } },
        barista: { select: { id: true, name: true } },
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Chỉnh sửa đơn hàng",
        details: `Đơn #${updatedOrder?.orderNumber} được chỉnh sửa`,
      }
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Order edit error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}


