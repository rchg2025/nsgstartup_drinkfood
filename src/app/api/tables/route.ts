import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const tables = await prisma.table.findMany({
      orderBy: [
        { zone: "asc" },
        { name: "asc" }
      ]
    });
    return NextResponse.json(tables);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, zone, active } = body;

    if (!name || !zone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newTable = await prisma.table.create({
      data: {
        name,
        zone,
        active: active !== undefined ? active : true,
      }
    });
    return NextResponse.json(newTable, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}
