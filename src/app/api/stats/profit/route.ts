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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const cashierId = searchParams.get("cashierId");

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
    }

    const settings = await prisma.setting.findMany();
    const commissionRateSetting = settings.find(s => s.key === "commission_rate");
    const commissionRate = parseFloat(commissionRateSetting?.value || "50") / 100;


    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED", // Only calculate profit for completed orders
        ...(cashierId ? { cashierId } : {}),
        ...dateFilter,
      },
      include: {
        items: true,
        cashier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const ordersData = orders.map((order) => {
      // Calculate total cost for this order
      const totalCost = order.items.reduce((sum, item) => sum + (item.unitCostPrice * item.quantity), 0);
      const profit = order.finalAmount - totalCost;
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        discount: order.discount,
        finalAmount: order.finalAmount,
        totalCost,
        profit,
        cashier: order.cashier,
      };
    });

    // We need to fetch withdrawals for each cashier too.
    // So we need to query CommissionWithdrawal.
    const withdrawals = await prisma.commissionWithdrawal.groupBy({
      by: ['userId'],
      _sum: { amount: true },
    });
    const withdrawnMap = new Map();
    withdrawals.forEach(w => withdrawnMap.set(w.userId, w._sum.amount || 0));

    // Aggregate by cashier
    const cashierMap = new Map();
    ordersData.forEach((o) => {
      const cId = o.cashier?.id;
      if (!cId) return; // FIX: Exclude unknown cashiers
      if (!cashierMap.has(cId)) {
        cashierMap.set(cId, {
          id: cId,
          name: o.cashier?.name || "Khách lẻ / Không xác định",
          orderCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          commission: 0,
        });
      }
      const cStats = cashierMap.get(cId);
      cStats.orderCount += 1;
      cStats.totalRevenue += o.finalAmount;
      cStats.totalCost += o.totalCost;
      cStats.totalProfit += o.profit;
      cStats.commission = cStats.totalProfit * commissionRate;
      cStats.withdrawn = 0; // We'll fill this after grouping
      cStats.available = 0;
    });

    // Merge withdrawals
    cashierMap.forEach((cStats, cId) => {
      cStats.withdrawn = withdrawnMap.get(cId) || 0;
      cStats.available = Math.max(0, cStats.commission - cStats.withdrawn);
    });

    return NextResponse.json({
      orders: ordersData,
      cashiers: Array.from(cashierMap.values()),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profit stats" }, { status: 500 });
  }
}
