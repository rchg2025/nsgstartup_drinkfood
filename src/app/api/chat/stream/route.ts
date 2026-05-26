import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const currentUserId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const lastMessageDateStr = searchParams.get("lastMessageDate");
  let lastMessageDate = lastMessageDateStr ? new Date(lastMessageDateStr) : null;

  if (!lastMessageDate) {
     return NextResponse.json({ type: "connected" });
  }

  try {
    const userParticipant = await prisma.conversationParticipant.findMany({
      where: { userId: currentUserId },
      select: { conversationId: true },
    });
    const userConvIds = userParticipant.map(p => p.conversationId);

    if (userConvIds.length > 0) {
      const where: any = {
        conversationId: { in: userConvIds },
        createdAt: { gt: lastMessageDate }
      };

      const newMessages = await prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      if (newMessages.length > 0) {
        return NextResponse.json({ type: "messages", data: newMessages });
      }
    }
    
    return NextResponse.json({ type: "no_messages" });
  } catch (err) {
    return NextResponse.json({ error: "Polling error" }, { status: 500 });
  }
}

