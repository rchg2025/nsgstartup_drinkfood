import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    settings.forEach((s) => {
      config[s.key] = s.value;
    });
    const res = NextResponse.json(config);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates = [];

    // The body should be a key-value object of strings
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        updates.push(
          prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        );
      }
    }

    await prisma.$transaction(updates);

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id as string,
        action: "Thay đổi cấu hình hệ thống",
        details: `Cập nhật: ${Object.keys(body).join(", ")}`,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
