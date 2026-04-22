import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
  throw new Error("No database connection string found. Set POSTGRES_PRISMA_URL or POSTGRES_URL_NON_POOLING in .env");
}

console.log("📡 Connecting to:", connectionString.split("@")[1]?.split("/")[0]);

const sql = neon(connectionString);
const adapter = new PrismaNeon({ connectionString } as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  // Create users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);
  const baristaPassword = await bcrypt.hash("barista123", 10);

  const users = [
    { email: "admin@nsg.vn", name: "Admin NSG", password: adminPassword, role: "ADMIN" as const },
    { email: "cashier@nsg.vn", name: "Thu Ngân 1", password: cashierPassword, role: "CASHIER" as const },
    { email: "barista@nsg.vn", name: "Pha Chế 1", password: baristaPassword, role: "BARISTA" as const },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({ data: u });
    }
  }
  console.log("✅ Users created");

  // Create categories
  const categoriesData = [
    { id: "cat-trasua", name: "Trà sữa", icon: "🧋", sortOrder: 1 },
    { id: "cat-caphe", name: "Cà phê", icon: "☕", sortOrder: 2 },
    { id: "cat-nuocep", name: "Nước ép", icon: "🍊", sortOrder: 3 },
    { id: "cat-doan", name: "Đồ ăn vặt", icon: "🍟", sortOrder: 4 },
  ];

  for (const c of categoriesData) {
    const existing = await prisma.category.findUnique({ where: { id: c.id } });
    if (!existing) {
      await prisma.category.create({ data: c });
    }
  }
  console.log("✅ Categories created");

  // Create toppings
  const toppingsData = [
    { id: "top-tcden", name: "Trân châu đen", price: 5000 },
    { id: "top-tcvang", name: "Trân châu vàng", price: 5000 },
    { id: "top-thachcam", name: "Thạch cam", price: 5000 },
    { id: "top-pudding", name: "Pudding trứng", price: 7000 },
    { id: "top-whipping", name: "Whipping cream", price: 8000 },
    { id: "top-kemxoi", name: "Kem xoài", price: 8000 },
  ];

  for (const t of toppingsData) {
    const existing = await prisma.topping.findUnique({ where: { id: t.id } });
    if (!existing) {
      await prisma.topping.create({ data: t });
    }
  }
  console.log("✅ Toppings created");

  // Create products
  const productsData = [
    {
      id: "prod-tsttd", name: "Trà sữa trân châu đen",
      description: "Trà sữa thơm béo với trân châu đen dẻo", price: 35000,
      categoryId: "cat-trasua",
      image: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=300&q=80",
      sizes: [{ name: "M", priceAdd: 0 }, { name: "L", priceAdd: 7000 }],
    },
    {
      id: "prod-tsmatcha", name: "Trà sữa matcha",
      description: "Trà xanh Nhật Bản hòa quyện với sữa tươi", price: 40000,
      categoryId: "cat-trasua",
      image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=300&q=80",
      sizes: [{ name: "M", priceAdd: 0 }, { name: "L", priceAdd: 8000 }],
    },
    {
      id: "prod-tsdaotao", name: "Trà sữa đào táo",
      description: "Hương vị đào tươi mát pha cùng sữa", price: 38000,
      categoryId: "cat-trasua",
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&q=80",
      sizes: [{ name: "S", priceAdd: -5000 }, { name: "M", priceAdd: 0 }, { name: "L", priceAdd: 8000 }],
    },
    {
      id: "prod-cf-sua", name: "Cà phê sữa",
      description: "Cà phê Việt Nam pha với sữa đặc", price: 25000,
      categoryId: "cat-caphe",
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80",
      sizes: [{ name: "S", priceAdd: 0 }, { name: "M", priceAdd: 5000 }],
    },
    {
      id: "prod-cf-den", name: "Cà phê đen",
      description: "Cà phê nguyên chất đậm đà", price: 20000,
      categoryId: "cat-caphe",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&q=80",
      sizes: [{ name: "S", priceAdd: 0 }, { name: "M", priceAdd: 5000 }],
    },
    {
      id: "prod-cf-bac-xiu", name: "Bạc xỉu",
      description: "Cà phê nhẹ nhiều sữa, vị ngọt nhẹ", price: 28000,
      categoryId: "cat-caphe",
      image: "https://images.unsplash.com/photo-1561882468-9110d70d2a88?w=300&q=80",
      sizes: [{ name: "S", priceAdd: 0 }, { name: "M", priceAdd: 5000 }],
    },
    {
      id: "prod-ne-cam", name: "Nước ép cam tươi",
      description: "Cam tươi nguyên chất 100%", price: 30000,
      categoryId: "cat-nuocep",
      image: "https://images.unsplash.com/photo-1621506289937-a59f5e6c1d63?w=300&q=80",
      sizes: [{ name: "M", priceAdd: 0 }, { name: "L", priceAdd: 8000 }],
    },
    {
      id: "prod-ne-dua", name: "Nước dừa tươi",
      description: "Dừa tươi nguyên quả mát lạnh", price: 35000,
      categoryId: "cat-nuocep",
      image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=300&q=80",
      sizes: [],
    },
    {
      id: "prod-khoai", name: "Khoai tây chiên",
      description: "Khoai tây vàng giòn, thêm muối", price: 25000,
      categoryId: "cat-doan",
      image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&q=80",
      sizes: [{ name: "Nhỏ", priceAdd: 0 }, { name: "Vừa", priceAdd: 10000 }, { name: "Lớn", priceAdd: 18000 }],
    },
    {
      id: "prod-popcorn", name: "Bắp rang bơ",
      description: "Bắp rang thơm béo vị bơ", price: 22000,
      categoryId: "cat-doan",
      image: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=300&q=80",
      sizes: [{ name: "Nhỏ", priceAdd: 0 }, { name: "Lớn", priceAdd: 12000 }],
    },
  ];

  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { id: p.id } });
    if (!existing) {
      const { sizes, ...productData } = p;
      await prisma.product.create({
        data: {
          ...productData,
          sizes: sizes.length > 0 ? { create: sizes } : undefined,
        },
      });
    }
  }

  console.log("✅ Products created");
  console.log("🎉 Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
