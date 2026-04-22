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
        status: "COMPLETED",
        ...(cashierId ? { cashierId } : {}),
        ...dateFilter,
      },
      select: {
        finalAmount: true,
        cashierId: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            unitCostPrice: true,
            totalPrice: true,
            product: { select: { name: true } }
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalCommission = 0;
    let totalItemsSold = 0;

    const productSalesMap = new Map();

    orders.forEach(order => {
      totalRevenue += order.finalAmount;
      let orderCost = 0;
      order.items.forEach(item => {
        const itemCost = item.unitCostPrice * item.quantity;
        const itemRevenue = item.totalPrice; // This is the final calculated price including sizes and toppings
        const itemProfit = itemRevenue - itemCost;
        
        orderCost += itemCost;
        totalItemsSold += item.quantity;

        const pId = item.productId;
        const pName = item.product?.name || "Unknown Product";

        if (!productSalesMap.has(pId)) {
          productSalesMap.set(pId, {
            id: pId,
            name: pName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0
          });
        }
        const pStats = productSalesMap.get(pId);
        pStats.quantity += item.quantity;
        pStats.revenue += itemRevenue;
        pStats.cost += itemCost;
        pStats.profit += itemProfit;
      });
      totalCost += orderCost;
      const orderProfit = order.finalAmount - orderCost;
      if (order.cashierId && orderProfit > 0) {
        totalCommission += orderProfit * commissionRate;
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const netProfit = totalProfit - totalCommission;

    const products = Array.from(productSalesMap.values()).sort((a, b) => b.quantity - a.quantity);

    // Also get the total unique products in the DB for stats
    const totalProductsInDb = await prisma.product.count();

    return NextResponse.json({
      summary: {
        totalProducts: totalProductsInDb,
        totalItemsSold,
        totalRevenue,
        totalCost,
        totalProfit,
        totalCommission,
        netProfit,
      },
      products
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
