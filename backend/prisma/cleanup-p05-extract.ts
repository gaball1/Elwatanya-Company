import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const bad = await prisma.statement.findMany({
    where: { deletedAt: null, label: 'P0-5 running test' },
    select: { id: true, label: true, runningNumber: true, status: true, contractorBoqId: true },
  });
  console.log('P0-5 running test artifacts:', bad.length);
  for (const b of bad) {
    const upd = await prisma.statement.update({ where: { id: b.id }, data: { deletedAt: new Date() } });
    console.log('soft-deleted:', upd.id.slice(0, 8));
  }
  await prisma.$disconnect();
})();