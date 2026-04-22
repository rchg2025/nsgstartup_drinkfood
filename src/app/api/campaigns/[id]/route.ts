import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    
    // allow toggling active or updating other fields
    const { 
      name, bannerImage, rewardType, giftName, giftImage,
      discountType, discountValue, pointsRequired, startDate, endDate, active, maxQuantity
    } = body;
    
    const updateData: any = {};
    if (active !== undefined) updateData.active = active;
    if (name) updateData.name = name;
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage;
    if (rewardType) {
      updateData.rewardType = rewardType;
      updateData.giftName = rewardType === "GIFT" ? giftName : null;
      updateData.giftImage = rewardType === "GIFT" ? giftImage : null;
      updateData.discountType = rewardType === "DISCOUNT" ? discountType : null;
      updateData.discountValue = rewardType === "DISCOUNT" ? parseInt(discountValue) : null;
    }
    if (pointsRequired !== undefined) updateData.pointsRequired = parseInt(pointsRequired);
    if (startDate) updateData.startDate = new Date(startDate.includes('Z') || startDate.includes('+') ? startDate : startDate + "+07:00");
    if (endDate) updateData.endDate = new Date(endDate.includes('Z') || endDate.includes('+') ? endDate : endDate + "+07:00");
    if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity === "" ? null : parseInt(maxQuantity);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    await prisma.campaign.update({
      where: { id },
      data: { isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
