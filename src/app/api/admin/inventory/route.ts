import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/inventory
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        image: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

// POST /api/admin/inventory (Add Stock)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { productId, quantityAdded, note } = body;
    const userId = (session.user as any).id;
    
    if (!productId || !quantityAdded || isNaN(quantityAdded) || quantityAdded <= 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Use transaction to ensure both log creation and stock update succeed together
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.inventoryLog.create({
        data: {
          productId,
          quantityAdded,
          note,
          userId
        }
      });
      
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: { increment: quantityAdded }
        }
      });
      
      return { log, product };
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
  }
}
