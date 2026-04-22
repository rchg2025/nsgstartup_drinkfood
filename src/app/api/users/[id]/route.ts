import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const updateData: any = {
      name: body.name,
      role: body.role,
      active: body.active,
    };
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Cập nhật Nhân sự",
        details: `Cập nhật thông tin: ${user.name}`,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    
    // Attempt to hard-delete the user
    try {
      const old = await prisma.user.findUnique({ where: { id } });
      await prisma.user.delete({
        where: { id },
      });

      if (old) {
        await prisma.activityLog.create({
          data: {
            userId: session?.user?.id as string,
            action: "Xóa Nhân sự",
            details: `Xóa tài khoản vĩnh viễn: ${old.name}`,
          }
        });
      }

      return NextResponse.json({ success: true });
    } catch (dbErr) {
      // If it fails (likely due to foreign key constraints with orders), soft delete it and hide username
      const old = await prisma.user.findUnique({ where: { id } });
      if (old) {
        await prisma.user.update({
          where: { id },
          // Append random string to email to free up the username
          data: { active: false, email: `${old.email}_deleted_${Date.now()}` },
        });

        await prisma.activityLog.create({
          data: {
            userId: session?.user?.id as string,
            action: "Xóa Nhân sự (Soft)",
            details: `Khóa tài khoản: ${old.name}`,
          }
        });
      }
      return NextResponse.json({ success: true, soft: true });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
