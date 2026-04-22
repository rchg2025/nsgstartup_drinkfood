import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, campaignId } = body;

    if (!phone || !campaignId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      return NextResponse.json({ error: "Không tìm thấy khách hàng với số điện thoại này." }, { status: 404 });
    }

    if (!customer.active) {
      return NextResponse.json({ error: "Tài khoản khách hàng này đã bị khóa." }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "Chiến dịch không tồn tại." }, { status: 404 });
    }

    if (!campaign.active || campaign.isDeleted || new Date() > campaign.endDate || new Date() < campaign.startDate) {
      return NextResponse.json({ error: "Chiến dịch không còn khả dụng." }, { status: 400 });
    }

    if (campaign.maxQuantity !== null && campaign.usedQuantity >= campaign.maxQuantity) {
      return NextResponse.json({ error: "Chiến dịch đã hết số lượng tham gia." }, { status: 400 });
    }

    if (customer.currentPoints < campaign.pointsRequired) {
      return NextResponse.json({ error: `Không đủ điểm. Bạn cần ${campaign.pointsRequired} điểm nhưng chỉ có ${customer.currentPoints} điểm.` }, { status: 400 });
    }

    // Generate random code if it's a discount
    let generatedCode = null;
    if (campaign.rewardType === "DISCOUNT") {
      generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase(); // e.g. "8K2PAX1"
    }

    // Begin transaction
    const [reward] = await prisma.$transaction([
      prisma.customerReward.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          pointsUsed: campaign.pointsRequired,
          discountCode: generatedCode,
        }
      }),
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          currentPoints: { decrement: campaign.pointsRequired },
          redeemedPoints: { increment: campaign.pointsRequired }
        }
      }),
      prisma.pointLog.create({
        data: {
          customerId: customer.id,
          action: "REDEEM_CAMPAIGN",
          points: -campaign.pointsRequired,
          note: `Đổi Quà/Mã từ chiến dịch: ${campaign.name}`
        }
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          usedQuantity: { increment: 1 },
          // If we hit the max after this increment, we can just optionally disable it,
          // but checking mathematically works just fine and is safe.
          active: campaign.maxQuantity !== null && (campaign.usedQuantity + 1) >= campaign.maxQuantity ? false : undefined
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      rewardType: campaign.rewardType,
      giftName: campaign.giftName,
      discountCode: generatedCode,
      endDate: campaign.endDate
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to redeem points" }, { status: 500 });
  }
}
