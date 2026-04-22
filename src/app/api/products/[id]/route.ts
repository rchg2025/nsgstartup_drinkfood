import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    // Delete existing sizes then recreate
    if (body.sizes) {
      await prisma.productSize.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        image: body.image,
        price: body.price,
        costPrice: body.costPrice !== undefined ? body.costPrice : undefined,
        categoryId: body.categoryId,
        available: body.available,
        sizes: body.sizes
          ? {
              create: body.sizes.map((s: any) => ({
                name: s.name,
                priceAdd: s.priceAdd,
              })),
            }
          : undefined,
      },
      include: { sizes: true, category: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Cập nhật Sản phẩm",
        details: `Cập nhật thông tin sản phẩm: ${product.name}`,
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (oldProduct) {
      await prisma.activityLog.create({
        data: {
          userId: session?.user?.id as string,
          action: "Xóa Sản phẩm",
          details: `Đã xóa sản phẩm: ${oldProduct.name}`,
        }
      });
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
