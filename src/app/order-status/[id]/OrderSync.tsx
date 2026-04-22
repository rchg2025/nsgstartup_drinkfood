"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { playSuccess } from "@/lib/audio";

export default function OrderSync({ id, initialStatus }: { id: string, initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (['COMPLETED', 'CANCELLED'].includes(status)) return;

    const eventSource = new EventSource("/api/sync");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "update" && data.changes) {
          const myOrder = data.changes.find((o: any) => o.id === id);
          if (myOrder && myOrder.status !== status) {
            setStatus(myOrder.status);
            
            // Play success sound if it's ready or completed
            if (myOrder.status === "READY" || myOrder.status === "COMPLETED") {
              playSuccess();
            }

            // Silent Next.js soft refresh to get newest data on page
            router.refresh();
          }
        }
      } catch (e) {}
    };

    return () => eventSource.close();
  }, [id, status, router]);

  return null; // Invisible component
}
