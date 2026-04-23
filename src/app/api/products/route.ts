import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const available = searchParams.get("available");

    const products = await prisma.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(available === "true" ? { available: true } : {}),
      },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        image: true,
        available: true,
        category: { select: { id: true, name: true, icon: true } },
        sizes: { select: { id: true, name: true, priceAdd: true } },
      },
      orderBy: { name: "asc" },
    });
    const res = NextResponse.json(products);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        image: body.image,
        price: body.price,
        costPrice: body.costPrice || 0,
        categoryId: body.categoryId,
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
        action: "Tạo Sản phẩm mới",
        details: `Đã tạo sản phẩm: ${product.name}`,
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
