"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { playSuccess } from "@/lib/audio";

export default function OrderSync({ id, initialStatus }: { id: string, initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (['COMPLETED', 'CANCELLED'].includes(status)) return;

    let lastCheckedAt = new Date();
    lastCheckedAt.setSeconds(lastCheckedAt.getSeconds() - 2);

    const poll = async () => {
      if (document.hidden) return; // Vercel optimization
      try {
        const res = await fetch(`/api/sync?lastCheckedAt=${lastCheckedAt.toISOString()}`);
        const data = await res.json();

        if (data.type === "update" && data.changes) {
          lastCheckedAt = new Date(data.changes[0].updatedAt);
          
          const change = data.changes.find((o: any) => o.id === id);
          if (change && change.status !== status) {
            setStatus(change.status);
            
            // Play success sound if it's ready or completed
            if (change.status === "READY" || change.status === "COMPLETED") {
              playSuccess();
            }

            // Silent Next.js soft refresh to get newest data on page
            router.refresh();
          }
        }
      } catch (e) {}
    };

    const intervalId = setInterval(poll, 10000);
    return () => clearInterval(intervalId);
  }, [id, status, router]);

  return null; // Invisible component
}
