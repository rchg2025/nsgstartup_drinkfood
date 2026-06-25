import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const role = (session?.user as any)?.role;
  
  if (role !== "ADMIN" && role !== "BAND") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status, isTipReceived, tipSenderAccount, tipReceivedAt, rejectReason } = body;
    
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const updated = await prisma.songRequest.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(isTipReceived !== undefined && { isTipReceived }),
        ...(tipSenderAccount !== undefined && { tipSenderAccount }),
        ...(tipReceivedAt !== undefined && { tipReceivedAt: new Date(tipReceivedAt) }),
        ...(rejectReason !== undefined && { rejectReason })
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update song request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  const role = (session?.user as any)?.role;
  
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const fromTips = searchParams.get("fromTips") === "true";

    if (fromTips) {
      await prisma.songRequest.delete({ where: { id } });
    } else {
      const existing = await prisma.songRequest.findUnique({ where: { id } });
      if (existing?.isTipReceived) {
        await prisma.songRequest.update({
          where: { id },
          data: { isHidden: true }
        });
      } else {
        await prisma.songRequest.delete({ where: { id } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete song request" }, { status: 500 });
  }
}
