import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const requests = await prisma.songRequest.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        }
      },
      select: {
        id: true,
        message: true,
        songName: true,
        requesterName: true,
        status: true,
        rejectReason: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    // Custom sort: ACCEPTED -> COMPLETED -> PENDING -> REJECTED
    const statusOrder: Record<string, number> = {
      "ACCEPTED": 1,
      "COMPLETED": 2,
      "PENDING": 3,
      "REJECTED": 4
    };

    const sortedRequests = requests.sort((a, b) => {
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    return NextResponse.json(sortedRequests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch song requests" }, { status: 500 });
  }
}
