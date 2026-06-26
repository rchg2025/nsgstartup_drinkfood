import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        contactEmail: true,
        role: true,
        avatar: true,
        createdAt: true,
        activityLogs: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, action: true, details: true, createdAt: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updateData: any = {
      name: body.name,
    };

    if (body.contactEmail !== undefined) {
      updateData.contactEmail = body.contactEmail || null;
    }

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, contactEmail: true, role: true }
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Cập nhật Hồ sơ",
        details: "Cập nhật thông tin cá nhân",
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
