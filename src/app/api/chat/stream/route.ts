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
  let lastMessageDate = searchParams.get("lastMessageDate") ? new Date(searchParams.get("lastMessageDate") as string) : null;

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
      };

      send({ type: "connected", message: "Chat SSE connected" });

      intervalId = setInterval(async () => {
        if (closed) {
          clearInterval(intervalId);
          return;
        }

        try {
          // Find all conversations the user is in
          const userParticipant = await prisma.conversationParticipant.findMany({
            where: { userId: currentUserId },
            select: { conversationId: true },
          });
          const userConvIds = userParticipant.map(p => p.conversationId);

          if (userConvIds.length > 0) {
            const where: any = {
              conversationId: { in: userConvIds },
            };
            if (lastMessageDate) {
              where.createdAt = { gt: lastMessageDate };
            } else {
              // If no date provided on connection, we don't return old messages
              const newestMessage = await prisma.message.findFirst({
                where: { conversationId: { in: userConvIds } },
                orderBy: { createdAt: "desc" },
              });
              if (newestMessage) {
                lastMessageDate = newestMessage.createdAt;
              } else {
                lastMessageDate = new Date();
              }
              return; // Skip first poll
            }

            const newMessages = await prisma.message.findMany({
              where,
              include: {
                sender: { select: { id: true, name: true, avatar: true } },
              },
              orderBy: { createdAt: "asc" },
            });

            if (newMessages.length > 0) {
              lastMessageDate = newMessages[newMessages.length - 1].createdAt;
              send({ type: "messages", data: newMessages });
            }
          }
        } catch (err) {
          // Suppress DB errors in loop
        }
      }, 500); // Poll every 500ms for fast chat feeling
    },
    cancel() {
      closed = true;
      clearInterval(intervalId);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
