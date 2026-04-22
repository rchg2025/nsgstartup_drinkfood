import "dotenv/config";
import { prisma } from './src/lib/prisma';

async function main() {
  const hauNhu = await prisma.user.findFirst({
    where: { name: { contains: 'Hậu Như', mode: 'insensitive' } }
  });
  
  if (!hauNhu) {
    console.log("No user found named Hậu Như");
    const allUsers = await prisma.user.findMany();
    console.log("Users:", allUsers.map((u: any) => ({id: u.id, name: u.name})));
    process.exit(1);
  }
  
  console.log("Found Hậu Như:", hauNhu.id, hauNhu.name);
  
  // Find today's orders
  const vnDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const todayStart = new Date(`${vnDateStr}T00:00:00.000+07:00`);
  
  const updateResult = await prisma.order.updateMany({
    where: {
      createdAt: { gte: todayStart },
      cashierId: null,
      status: 'COMPLETED'
    },
    data: {
      cashierId: hauNhu.id
    }
  });
  
  console.log("Updated orders:", updateResult);
}

main().catch(console.error).finally(() => prisma.$disconnect && prisma.$disconnect());
