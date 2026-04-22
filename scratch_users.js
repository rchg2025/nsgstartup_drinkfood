const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(u => {
    console.log(JSON.stringify(u.map(x=>({name:x.name, email:x.email, role:x.role})), null, 2));
    prisma.$disconnect();
});
