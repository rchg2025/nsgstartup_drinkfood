import { prisma } from './src/lib/prisma'; async function run() { console.log(await prisma.campaign.findMany()); } run();  
