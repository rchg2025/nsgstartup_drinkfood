import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code } = body;

    if (!code) {
      return NextResponse.json({ error: "Vui lòng nhập mã giảm giá" }, { status: 400 });
    }

    const reward = await prisma.customerReward.findUnique({
      where: { discountCode: code },
      include: {
        campaign: true,
        customer: true
      }
    });

    if (!reward) {
      return NextResponse.json({ error: "Mã giảm giá không tồn tại." }, { status: 404 });
    }

    if (reward.isUsed) {
      return NextResponse.json({ error: "Mã giảm giá này đã được sử dụng." }, { status: 400 });
    }

    if (phone && reward.customer.phone !== phone.trim()) {
      return NextResponse.json({ error: "Mã giảm giá này không thuộc về số điện thoại của bạn." }, { status: 403 });
    }

    if (!reward.campaign) {
      return NextResponse.json({ error: "Chiến dịch của mã giảm giá này đã bị xóa." }, { status: 400 });
    }

    const campaignEndDate = reward.campaign.endDate;
    const expirationDate = new Date(campaignEndDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    if (new Date() > expirationDate) {
      return NextResponse.json({ error: "Mã giảm giá đã vô hiệu hóa (quá 15 ngày kể từ ngày kết thúc chiến dịch)." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      rewardId: reward.id,
      discountType: reward.campaign.discountType,
      discountValue: reward.campaign.discountValue,
      campaignName: reward.campaign.name
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to validate code" }, { status: 500 });
  }
}
