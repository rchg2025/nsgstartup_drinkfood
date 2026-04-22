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
    const period = searchParams.get("period") || "today";

    const now = new Date();
    let startDate: Date;

    if (period === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate = new Date(now);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch commission rate
    const settings = await prisma.setting.findMany();
    const commissionRateSetting = settings.find(s => s.key === "commission_rate");
    const commissionRate = parseFloat(commissionRateSetting?.value || "50") / 100;

    // Calculate overall revenue, cost, commission, and net profit
    const ordersForProfit = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startDate },
      },
      include: {
        items: true,
      }
    });

    let totalRevenueVal = 0;
    let totalCostVal = 0;
    let totalCommissionVal = 0;

    ordersForProfit.forEach((order) => {
      totalRevenueVal += order.finalAmount;
      let orderCost = 0;
      order.items.forEach((item) => {
        orderCost += item.unitCostPrice * item.quantity;
      });
      totalCostVal += orderCost;
      const profit = order.finalAmount - orderCost;
      
      if (order.cashierId && profit > 0) {
        totalCommissionVal += profit * commissionRate;
      }
    });

    const netProfitVal = (totalRevenueVal - totalCostVal) - totalCommissionVal;

    // Total revenue
    const revenueResult = {
      _sum: { finalAmount: totalRevenueVal },
      _count: ordersForProfit.length,
    };

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Top products
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: startDate }, status: "COMPLETED" } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, image: true },
    });

    const topProductsWithDetails = topProducts.map((tp) => ({
      ...tp,
      product: products.find((p) => p.id === tp.productId),
    }));

    // Revenue by day (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRevenue = await prisma.order.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: day, lte: dayEnd },
        },
        _sum: { finalAmount: true },
        _count: true,
      });

      last7Days.push({
        date: day.toISOString().split("T")[0],
        revenue: dayRevenue._sum.finalAmount || 0,
        orders: dayRevenue._count,
      });
    }

    // Payment methods
    const paymentMethods = await prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { status: "COMPLETED", createdAt: { gte: startDate } },
      _count: true,
      _sum: { finalAmount: true },
    });

    return NextResponse.json({
      totalRevenue: revenueResult._sum.finalAmount || 0,
      totalOrders: revenueResult._count,
      ordersByStatus,
      topProducts: topProductsWithDetails,
      last7Days,
      paymentMethods,
      netProfit: netProfitVal,
      totalCommission: totalCommissionVal,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
