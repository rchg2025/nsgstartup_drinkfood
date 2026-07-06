import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // Edge Cache for 60 seconds

export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    const [categories, products, toppings, settingsData, campaignsData] = await Promise.all([
      // Categories
      prisma.category.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, icon: true },
      }),
      // Products (available only)
      prisma.product.findMany({
        where: { available: true, stockQuantity: { gt: 0 } },
        select: {
          id: true,
          name: true,
          description: true,
          recipe: true,
          price: true,
          retailPrice: true,
          costPrice: true,
          image: true,
          available: true,
          stockQuantity: true,
          category: { select: { id: true, name: true, icon: true } },
          sizes: { select: { id: true, name: true, priceAdd: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Toppings
      prisma.topping.findMany({
        where: { available: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, price: true },
      }),
      // Settings
      prisma.setting.findMany(),
      // Campaigns
      prisma.campaign.findMany({
        where: {
          active: true,
          isDeleted: false,
          startDate: { lte: now },
          endDate: { gte: now }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Format settings
    const settings: Record<string, string> = {};
    settingsData.forEach((s) => {
      settings[s.key] = s.value;
    });

    // Format valid campaigns
    const campaigns = campaignsData.filter(c => c.maxQuantity === null || c.usedQuantity < c.maxQuantity);

    const data = {
      categories,
      products,
      toppings,
      settings,
      campaigns
    };

    const res = NextResponse.json(data);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res;
  } catch (error) {
    console.error("Failed to fetch menu data:", error);
    return NextResponse.json({ error: "Failed to fetch menu data" }, { status: 500 });
  }
}
