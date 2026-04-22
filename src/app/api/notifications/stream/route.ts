import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// SSE Notification Stream
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") || "CASHIER";
  let lastId = searchParams.get("lastId") || "";

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      };

      send(JSON.stringify({ type: "connected", message: "SSE connected" }));

      intervalId = setInterval(async () => {
        if (closed) {
          clearInterval(intervalId);
          return;
        }
        try {
          const where: any = {
            targetRole: role as any,
            read: false,
          };
          if (lastId) {
            where.id = { gt: lastId };
          }

          const notifications = await prisma.notification.findMany({
            where,
            include: { order: { select: { id: true, orderNumber: true } } },
            orderBy: { createdAt: "asc" },
          });

          if (notifications.length > 0) {
            lastId = notifications[notifications.length - 1].id;
            send(JSON.stringify({ type: "notifications", data: notifications }));
          }
        } catch (err) {
          // DB error, just skip
        }
      }, 3000); // Poll every 3 seconds
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
      Connection: "keep-alive",
    },
  });
}
