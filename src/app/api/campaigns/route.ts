import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "ADMIN" && role !== "CASHIER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      name, bannerImage, rewardType, giftName, giftImage,
      discountType, discountValue, pointsRequired, startDate, endDate, active, maxQuantity
    } = body;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        bannerImage,
        rewardType,
        giftName: rewardType === "GIFT" ? giftName : null,
        giftImage: rewardType === "GIFT" ? giftImage : null,
        discountType: rewardType === "DISCOUNT" ? discountType : null,
        discountValue: rewardType === "DISCOUNT" ? parseInt(discountValue) : null,
        pointsRequired: parseInt(pointsRequired),
        startDate: new Date(startDate.includes('Z') || startDate.includes('+') ? startDate : startDate + "+07:00"),
        endDate: new Date(endDate.includes('Z') || endDate.includes('+') ? endDate : endDate + "+07:00"),
        active: active !== undefined ? active : true,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null
      }
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
