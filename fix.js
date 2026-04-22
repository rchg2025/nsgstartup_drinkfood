require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma/client');
// If adapter-neon is needed:
// const { PrismaNeon } = require('@prisma/adapter-neon');
// const { Pool } = require('@neondatabase/serverless');
// const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL });
// const adapter = new PrismaNeon(pool);
// const prisma = new PrismaClient({ adapter });

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.POSTGRES_PRISMA_URL }
  }
});

async function main() {
  const hauNhu = await prisma.user.findFirst({
    where: { name: { contains: 'Hậu Như', mode: 'insensitive' } }
  });
  
  if (!hauNhu) {
    console.log("No user found named Hậu Như");
    const allUsers = await prisma.user.findMany();
    console.log("Users:", allUsers.map(u => ({id: u.id, name: u.name})));
    process.exit(1);
  }
  
  console.log("Found Hậu Như:", hauNhu.id, hauNhu.name);
  
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

main().catch(console.error).finally(() => prisma.$disconnect());
