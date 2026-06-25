import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  
  if (role !== "ADMIN" && role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const requests = await prisma.songRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch song requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, songName, requesterName, hasTip, tipAmount } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const newRequest = await prisma.songRequest.create({
      data: {
        message,
        songName,
        requesterName,
        hasTip: !!hasTip,
        tipAmount: hasTip ? tipAmount : null,
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create song request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const onlyTips = searchParams.get("onlyTips") === "true";

    if (onlyTips) {
      await prisma.songRequest.deleteMany({
        where: { isTipReceived: true }
      });
    } else {
      await prisma.songRequest.deleteMany({});
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete song requests" }, { status: 500 });
  }
}
