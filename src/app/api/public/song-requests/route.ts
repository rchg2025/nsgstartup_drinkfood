import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.songRequest.findMany({
      select: {
        id: true,
        message: true,
        songName: true,
        requesterName: true,
        status: true,
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
