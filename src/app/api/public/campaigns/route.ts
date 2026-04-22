import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    // Only return active campaigns that are within the current date range
    const campaigns = await prisma.campaign.findMany({
      where: {
        active: true,
        isDeleted: false,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { createdAt: "desc" }
    });
    // Filter out campaigns that have reached their max quantity
    const validCampaigns = campaigns.filter(c => c.maxQuantity === null || c.usedQuantity < c.maxQuantity);
    const res = NextResponse.json(validCampaigns);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
