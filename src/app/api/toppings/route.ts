import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const toppings = await prisma.topping.findMany({
      orderBy: { createdAt: "desc" }, // fallback if name is not preferable, wait, let's keep name asc as before
    });
    const res = NextResponse.json(toppings);
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch toppings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const topping = await prisma.topping.create({
      data: { name: body.name, price: body.price || 0 },
    });
    revalidatePath('/api/public/menu-data');
    return NextResponse.json(topping, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create topping" }, { status: 500 });
  }
}
