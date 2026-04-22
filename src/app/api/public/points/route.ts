import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Missing phone number" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone },
      include: {
        pointLogs: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Mask phone number for public safety
    const maskedPhone = phone.slice(0, 3) + "****" + phone.slice(-3);

    return NextResponse.json({
      name: customer.name || "Khách hàng",
      phone: maskedPhone,
      currentPoints: customer.currentPoints,
      totalPoints: customer.totalPoints,
      redeemedPoints: customer.redeemedPoints,
      pointLogs: customer.pointLogs
    });

  } catch (error) {
    console.error("Public Point API Error:", error);
    return NextResponse.json({ error: "Failed to fetch points" }, { status: 500 });
  }
}
