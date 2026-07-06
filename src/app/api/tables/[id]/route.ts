import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, zone, active } = body;

    const updatedTable = await prisma.table.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(zone && { zone }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(updatedTable);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Check if table has orders
    const tableWithOrders = await prisma.table.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });

    if (tableWithOrders?._count.orders && tableWithOrders._count.orders > 0) {
      return NextResponse.json({ error: "Cannot delete table with existing orders" }, { status: 400 });
    }

    await prisma.table.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete table" }, { status: 500 });
  }
}
