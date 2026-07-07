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
    const [products, toppings] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          image: true,
          category: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.topping.findMany({
        select: {
          id: true,
          name: true,
          stockQuantity: true,
        },
        orderBy: { createdAt: "desc" }
      })
    ]);
    
    const inventory = [
      ...products.map(p => ({ ...p, type: "PRODUCT" })),
      ...toppings.map(t => ({ ...t, type: "TOPPING", category: { name: "Topping" }, image: "" }))
    ];

    return NextResponse.json(inventory);
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
    const { productId, toppingId, quantityAdded, note } = body;
    const userId = (session.user as any).id;
    
    if ((!productId && !toppingId) || !quantityAdded || isNaN(quantityAdded) || quantityAdded <= 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Use transaction to ensure both log creation and stock update succeed together
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.inventoryLog.create({
        data: {
          productId: productId || null,
          toppingId: toppingId || null,
          quantityAdded,
          note,
          userId
        }
      });
      
      let updatedItem;
      if (productId) {
        updatedItem = await tx.product.update({
          where: { id: productId },
          data: { stockQuantity: { increment: quantityAdded } }
        });
      } else if (toppingId) {
        updatedItem = await tx.topping.update({
          where: { id: toppingId },
          data: { stockQuantity: { increment: quantityAdded } }
        });
      }
      
      return { log, updatedItem };
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
  }
}
