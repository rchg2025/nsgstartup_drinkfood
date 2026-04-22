import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, icon: true },
    });
    const res = NextResponse.json(categories);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const category = await prisma.category.create({
      data: {
        name: body.name,
        icon: body.icon || "🍹",
        sortOrder: body.sortOrder || 0,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Tạo Danh mục",
        details: `Tạo danh mục mới: ${category.name}`,
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
