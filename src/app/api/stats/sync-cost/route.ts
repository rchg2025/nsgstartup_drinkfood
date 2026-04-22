import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Tự động quét và cập nhật những món hàng trong các đơn chưa có giá gốc (unitCostPrice = 0)
    const itemsWithoutCost = await prisma.orderItem.findMany({
      where: { unitCostPrice: 0 },
      select: { id: true, productId: true },
    });

    if (itemsWithoutCost.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No items to sync" });
    }

    // Load tất cả product có trong danh sách
    const productIds = Array.from(new Set(itemsWithoutCost.map((i) => i.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    });

    const costPriceMap = new Map(products.map((p) => [p.id, p.costPrice || 0]));

    // Batch update
    let updatedCount = 0;
    
    // We update item by item because Prisma doesn't support bulk update with varying values well 
    // unless using raw query. Prisma transactions are fine.
    const updates = itemsWithoutCost.map(item => {
      const dbCostPrice = costPriceMap.get(item.productId) || 0;
      if (dbCostPrice > 0) {
        updatedCount++;
        return prisma.orderItem.update({
          where: { id: item.id },
          data: { unitCostPrice: dbCostPrice },
        });
      }
      return null;
    }).filter(Boolean);

    if (updates.length > 0) {
      // @ts-ignore
      await prisma.$transaction(updates);
    }

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to sync cost price" }, { status: 500 });
  }
}
