import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      where: { active: true },
      orderBy: [
        { zone: "asc" },
        { name: "asc" }
      ],
      select: {
        id: true,
        name: true,
        zone: true,
      }
    });
    return NextResponse.json(tables);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}
