import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyReportEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Check authorization headers if CRON_SECRET is configured
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, we must validate it.
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Determine today's range in Vietnam Time (UTC+7)
    // We get current UTC date, adjust it to UTC+7, set hours to 0, then shift back to UTC to query DB.
    const now = new Date();
    // Offset for UTC+7 is 7 * 60 minutes
    const offsetTimeMs = 7 * 60 * 60 * 1000; 
    
    // Create a date object that represents the local time in Vietnam
    const localVNTime = new Date(now.getTime() + offsetTimeMs);
    
    // Start of the day in VN
    const startOfVNDay = new Date(localVNTime);
    startOfVNDay.setUTCHours(0, 0, 0, 0);
    // Convert back to actual UTC time for Prisma
    const startDate = new Date(startOfVNDay.getTime() - offsetTimeMs);
    
    // End of the day in VN
    const endOfVNDay = new Date(localVNTime);
    endOfVNDay.setUTCHours(23, 59, 59, 999);
    const endDate = new Date(endOfVNDay.getTime() - offsetTimeMs);

    // 2. Fetch Orders for Revenue, Item Count and Commission Calculation
    const settings = await prisma.setting.findMany();
    const commissionRateSetting = settings.find(s => s.key === "commission_rate");
    const commissionRate = parseFloat(commissionRateSetting?.value || "50") / 100;

    const completedOrders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        finalAmount: true,
        cashierId: true,
        items: {
          select: { unitCostPrice: true, quantity: true }
        }
      }
    });

    let totalRevenue = 0;
    let totalItems = 0;
    let totalCommission = 0;

    completedOrders.forEach(order => {
      totalRevenue += order.finalAmount;
      let orderCost = 0;
      
      order.items.forEach(item => {
        totalItems += item.quantity;
        orderCost += item.unitCostPrice * item.quantity;
      });

      const profit = order.finalAmount - orderCost;
      if (order.cashierId && profit > 0) {
        totalCommission += profit * commissionRate;
      }
    });

    // 3. Fetch Tips from Song Requests
    const songRequests = await prisma.songRequest.findMany({
      where: {
        isTipReceived: true,
        hasTip: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { tipAmount: true }
    });

    let totalTips = 0;
    songRequests.forEach(req => {
      totalTips += (req.tipAmount || 0);
    });

    // 4. Send Email
    // Only send if there's any activity or revenue
    if (completedOrders.length > 0 || totalTips > 0) {
      // Format date string for the report (dd/MM/yyyy)
      const dateStr = `${startOfVNDay.getUTCDate().toString().padStart(2, '0')}/${(startOfVNDay.getUTCMonth() + 1).toString().padStart(2, '0')}/${startOfVNDay.getUTCFullYear()}`;

      await sendDailyReportEmail({
        date: dateStr,
        totalRevenue: totalRevenue,
        totalOrders: completedOrders.length,
        totalItems: totalItems,
        commissions: {
          totalCommission: totalCommission,
          totalTips: totalTips
        }
      });
    }

    return NextResponse.json({ success: true, processed: true, message: "Báo cáo ngày đã được xử lý" });

  } catch (error: any) {
    console.error("Cron Job Daily Report Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process daily report" }, { status: 500 });
  }
}
