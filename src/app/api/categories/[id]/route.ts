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
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        icon: body.icon,
        sortOrder: body.sortOrder,
        active: body.active,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Cập nhật Danh mục",
        details: `Cập nhật thông tin danh mục: ${category.name}`,
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const oldCategory = await prisma.category.findUnique({ where: { id } });
    if (oldCategory) {
      await prisma.activityLog.create({
        data: {
          userId: session?.user?.id as string,
          action: "Xóa Danh mục",
          details: `Đã xóa danh mục: ${oldCategory.name}`,
        }
      });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
