import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Server-Sent Events endpoint for real-time order updates
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      if (!closed) {
        // Send a connection established event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
      }

      // Track the latest time we saw an update to avoid sending duplicate events
      let lastCheckedAt = new Date();
      // Set back slightly on start so we fetch immediately if something just happened
      lastCheckedAt.setSeconds(lastCheckedAt.getSeconds() - 2);

      intervalId = setInterval(async () => {
        if (closed) return;
        try {
          // Find any orders that have been created or modified since our last check
          const updatedOrders = await prisma.order.findMany({
            where: {
              updatedAt: { gt: lastCheckedAt },
            },
            select: { id: true, status: true, orderNumber: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
          });

          if (updatedOrders.length > 0) {
            // Update lastCheckedAt to the most recent change among the results
            lastCheckedAt = updatedOrders[0].updatedAt;

            // Broadcast the exact changes that occurred
            const payload = JSON.stringify({ type: "update", changes: updatedOrders });
            if (!closed) {
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
        } catch (err) {
          // Silent catch on DB polling errors to prevent crashing the stream
        }
      }, 2000); // Poll every 2 seconds for high responsiveness
    },
    cancel() {
      closed = true;
      if (intervalId) clearInterval(intervalId);
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
