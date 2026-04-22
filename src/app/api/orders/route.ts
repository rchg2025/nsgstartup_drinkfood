import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000+07:00`);
      const end = new Date(`${endDate}T23:59:59.999+07:00`);
      dateFilter = { createdAt: { gte: start, lte: end } };
    } else if (startDate) {
      const start = new Date(`${startDate}T00:00:00.000+07:00`);
      dateFilter = { createdAt: { gte: start } };
    } else if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999+07:00`);
      dateFilter = { createdAt: { lte: end } };
    } else if (date) {
      const start = new Date(`${date}T00:00:00.000+07:00`);
      const end = new Date(`${date}T23:59:59.999+07:00`);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...dateFilter,
      },
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
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    // Resolve canonical customer names from the Customer table by phone
    // Collect all unique phone numbers from orders that have a phone
    const phones = [...new Set(orders.map(o => o.customerPhone).filter(Boolean))] as string[];
    let phoneToNameMap: Record<string, string> = {};
    if (phones.length > 0) {
      const customers = await prisma.customer.findMany({
        where: { phone: { in: phones } },
        select: { phone: true, name: true },
      });
      customers.forEach(c => {
        if (c.phone && c.name) phoneToNameMap[c.phone] = c.name;
      });
    }

    // Enrich each order with the resolved display name
    const enrichedOrders = orders.map(order => {
      let displayName: string | null = null;
      if (order.customerPhone && phoneToNameMap[order.customerPhone]) {
        // Phone found in DB → always use DB name (canonical)
        displayName = phoneToNameMap[order.customerPhone];
      } else if (order.customerPhone) {
        // Has phone but not in DB → show original name or "Khách"
        displayName = order.customerName || null;
      } else {
        // No phone, no name → "Khách lẻ" (handled by UI)
        displayName = order.customerName || null;
      }
      return { ...order, customerName: displayName };
    });

    return NextResponse.json(enrichedOrders);

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  
  try {
    const body = await req.json();
    const userId = session?.user?.id as string | undefined;

    // Get today's order count for order number (Vietnam timezone)
    const now = new Date();
    const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // "YYYY-MM-DD"
    const todayVnStart = new Date(`${vnDateStr}T00:00:00.000+07:00`);
    const orderCount = await prisma.order.count({
      where: { createdAt: { gte: todayVnStart } },
    });

    // Fetch product const prices to record unitCostPrice
    const productIds = body.items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    });
    const costPriceMap = new Map(products.map(p => [p.id, p.costPrice]));

    // Handle Customer Points
    let customerId = undefined;
    let isPointAwarded = false;
    let earnedPoints = 0;

    if (body.customerPhone) {
      earnedPoints = Math.floor(body.finalAmount * 0.01);
      if (earnedPoints > 0) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { phone: body.customerPhone }
        });

        if (existingCustomer) {
          if (existingCustomer.active) {
            const nameToUpdate = (body.customerName && body.customerName !== "Khách") ? body.customerName : undefined;
            const customer = await prisma.customer.update({
              where: { id: existingCustomer.id },
              data: {
                ...(nameToUpdate ? { name: nameToUpdate } : {}),
                totalPoints: { increment: earnedPoints },
                currentPoints: { increment: earnedPoints }
              }
            });
            customerId = customer.id;
            isPointAwarded = true;
          }
        } else {
          const newName = (body.customerName && body.customerName !== "Khách") ? body.customerName : "Khách hàng";
          const customer = await prisma.customer.create({
            data: {
              phone: body.customerPhone,
              name: newName,
              totalPoints: earnedPoints,
              currentPoints: earnedPoints
            }
          });
          customerId = customer.id;
          isPointAwarded = true;
        }
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: orderCount + 1,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        totalAmount: body.totalAmount,
        discount: body.discount || 0,
        finalAmount: body.finalAmount,
        paymentMethod: body.paymentMethod || "CASH",
        paymentStatus: body.paymentStatus || "PENDING",
        cashierId: userId,
        customerId: customerId,
        isPointAwarded: isPointAwarded,
        usedDiscountCodeId: body.usedDiscountCodeId || null,
        note: body.note,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            sizeName: item.sizeName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCostPrice: costPriceMap.get(item.productId) || 0,
            totalPrice: item.totalPrice,
            note: item.note,
            toppings: item.toppings && item.toppings.length > 0
              ? {
                  create: item.toppings.map((t: any) => ({
                    toppingId: t.toppingId || t.topping?.id, 
                    price: t.price,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            toppings: { include: { topping: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    if (body.usedDiscountCodeId) {
      await prisma.customerReward.update({
        where: { id: body.usedDiscountCodeId },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      });
    }

    if (isPointAwarded && customerId) {
      await prisma.pointLog.create({
        data: {
          customerId: customerId,
          orderId: order.id,
          action: "EARN",
          points: earnedPoints,
          note: `Tích điểm từ hóa đơn #${order.orderNumber}`
        }
      });
    }

    // Create notification for cashiers to verify the order first
    await prisma.notification.create({
      data: {
        type: "NEW_ORDER",
        title: `Đơn hàng #${order.orderNumber}`,
        message: `Có đơn hàng mới từ ${body.customerName || "Khách lẻ"} với ${body.items.length} món`,
        orderId: order.id,
        targetRole: "CASHIER",
        read: false,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
